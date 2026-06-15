import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middlewares/authenticate.js'
import { callAI, buildSystemPrompt, type PromptMenuProduct } from '../../lib/ai-attendant.js'
import { handleInbound } from '../../lib/bot/orchestrator.js'
import { parseControl } from '../../lib/bot/llm-flow.js'

const automationRoutes: FastifyPluginAsync = async (app) => {

  // ─── GET /automation/config ───────────────────────────────────────
  app.get('/config', { preHandler: [authenticate] }, async (request) => {
    const { storeId } = request.user

    let config = await app.prisma.automationConfig.findUnique({ where: { storeId } })
    if (!config) {
      config = await app.prisma.automationConfig.create({
        data: { storeId },
      })
    }

    return {
      data: {
        ...config,
        aiApiKey: config.aiApiKey ? '••••••••' : null,
      },
    }
  })

  // ─── PATCH /automation/config ─────────────────────────────────────
  app.patch('/config', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const schema = z.object({
      isEnabled: z.boolean().optional(),
      aiProvider: z.enum(['claude', 'openai', 'openrouter']).optional(),
      aiApiKey: z.string().optional(),
      aiModel: z.string().optional(),
      systemPrompt: z.string().optional(),
      closedMessage: z.string().optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const data: any = {}
    if (body.data.isEnabled !== undefined) data.isEnabled = body.data.isEnabled
    if (body.data.aiProvider) data.aiProvider = body.data.aiProvider
    if (body.data.aiModel) data.aiModel = body.data.aiModel
    if (body.data.systemPrompt !== undefined) data.systemPrompt = body.data.systemPrompt
    if (body.data.closedMessage !== undefined) data.closedMessage = body.data.closedMessage || null
    // Só atualiza a chave se não for a máscara
    if (body.data.aiApiKey && body.data.aiApiKey !== '••••••••') {
      data.aiApiKey = body.data.aiApiKey
    }

    const config = await app.prisma.automationConfig.upsert({
      where: { storeId },
      create: { storeId, ...data },
      update: data,
    })

    return { data: { ...config, aiApiKey: config.aiApiKey ? '••••••••' : null } }
  })

  // ─── GET /automation/conversations ────────────────────────────────
  app.get('/conversations', { preHandler: [authenticate] }, async (request) => {
    const { storeId } = request.user
    const { page = '1', search = '' } = request.query as { page?: string; search?: string }
    const take = 20
    const skip = (Number(page) - 1) * take

    const where: any = { storeId }
    if (search) {
      where.OR = [
        { customerPhone: { contains: search } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [conversations, total] = await Promise.all([
      app.prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
      }),
      app.prisma.conversation.count({ where }),
    ])

    return { data: conversations, total, page: Number(page), totalPages: Math.ceil(total / take) }
  })

  // ─── GET /automation/conversations/:id ────────────────────────────
  app.get('/conversations/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const { id } = request.params as { id: string }

    const conversation = await app.prisma.conversation.findFirst({
      where: { id, storeId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!conversation) {
      return reply.status(404).send({ error: 'Not Found', message: 'Conversa não encontrada', statusCode: 404 })
    }

    return { data: conversation }
  })

  // ─── DELETE /automation/conversations/:id ─────────────────────────
  app.delete('/conversations/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const { id } = request.params as { id: string }

    const conv = await app.prisma.conversation.findFirst({ where: { id, storeId } })
    if (!conv) {
      return reply.status(404).send({ error: 'Not Found', message: 'Conversa não encontrada', statusCode: 404 })
    }

    await app.prisma.conversation.update({ where: { id }, data: { status: 'CLOSED' } })
    return reply.status(204).send()
  })

  // ─── POST /automation/test ─────────────────────────────────────────
  app.post('/test', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const { message } = request.body as { message: string }

    if (!message?.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Mensagem obrigatória', statusCode: 400 })
    }

    const [config, store, storeData] = await Promise.all([
      app.prisma.automationConfig.findUnique({ where: { storeId } }),
      app.prisma.store.findUnique({ where: { id: storeId }, select: { slug: true, name: true, description: true, estimatedTime: true, minOrderValue: true } }),
      app.prisma.store.findUnique({
        where: { id: storeId },
        select: {
          schedules: { where: { isActive: true }, select: { dayOfWeek: true, openTime: true, closeTime: true } },
          paymentMethods: { where: { isActive: true }, select: { type: true, label: true } },
          deliveryAreas: { where: { isActive: true }, select: { name: true, type: true, fee: true, district: true, freeFrom: true } },
        },
      }),
    ])

    if (!config?.aiApiKey) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Configure a chave da IA antes de testar', statusCode: 400 })
    }

    const menuRaw = await app.prisma.category.findMany({
      where: { storeId, isActive: true },
      orderBy: { position: 'asc' },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          select: {
            id: true, name: true, description: true, price: true, tags: true,
            addonGroups: { orderBy: { position: 'asc' }, include: { options: { where: { isActive: true }, orderBy: { position: 'asc' } } } },
          },
        },
      },
    })

    const menu = menuRaw.map((cat) => ({
      name: cat.name,
      products: cat.products.map((p): PromptMenuProduct => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        tags: p.tags,
        addonGroups: p.addonGroups.map((g) => ({
          name: g.name,
          required: g.required,
          options: g.options.map((o) => ({ id: o.id, name: o.name, price: Number(o.price) })),
        })),
      })),
    }))

    const systemPrompt = buildSystemPrompt({
      storeName: store!.name,
      storeDescription: store!.description,
      estimatedTime: store!.estimatedTime,
      minOrderValue: Number(store!.minOrderValue),
      schedules: storeData!.schedules,
      paymentMethods: storeData!.paymentMethods,
      deliveryAreas: storeData!.deliveryAreas.map((a) => ({
        name: a.name,
        type: a.type,
        fee: Number(a.fee),
        district: a.district,
        freeFrom: a.freeFrom != null ? Number(a.freeFrom) : null,
      })),
      menu,
      customPrompt: config.systemPrompt,
      storeSlug: store!.slug,
    })

    try {
      const raw = await callAI(
        { aiProvider: config.aiProvider, aiApiKey: config.aiApiKey, aiModel: config.aiModel },
        systemPrompt,
        [{ role: 'user', content: message }],
        { json: true },
      )
      const { reply } = parseControl(raw)
      return { data: { response: reply } }
    } catch (err: any) {
      return reply.status(500).send({ error: 'AI Error', message: err.message ?? 'Erro na IA', statusCode: 500 })
    }
  })

  // ─── POST /automation/webhook/:storeSlug ──────────────────────────
  // Recebe mensagens da Evolution API e delega ao orquestrador do bot híbrido.
  app.post('/webhook/:storeSlug', async (request, reply) => {
    const { storeSlug } = request.params as { storeSlug: string }
    const { token } = request.query as { token?: string }

    // Responde imediatamente para não dar timeout na Evolution API (sempre 200,
    // mesmo quando ignoramos — não vaza se a loja existe nem se o token confere).
    reply.status(200).send({ received: true })

    const payload = request.body as any

    // Valida o formato mínimo do payload da Evolution antes de qualquer coisa.
    const hasShape = !!(payload?.data?.key || payload?.key || payload?.data?.message || payload?.message)
    if (!hasShape) return

    // Valida o token do webhook (segredo por loja).
    const store = await app.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { automationConfig: { select: { webhookToken: true } } },
    })
    const expected = store?.automationConfig?.webhookToken
    if (!expected || token !== expected) {
      app.log.warn(`webhook: token inválido/ausente para loja ${storeSlug}`)
      return
    }

    // Ignora mensagens enviadas pelo próprio bot
    const fromMe = payload?.data?.key?.fromMe ?? payload?.key?.fromMe ?? false
    if (fromMe) return

    // Extrai texto da mensagem (Evolution API v1/v2)
    const messageText =
      payload?.data?.message?.conversation ||
      payload?.data?.message?.extendedTextMessage?.text ||
      payload?.message?.conversation ||
      payload?.message?.extendedTextMessage?.text
    if (!messageText) return

    // Extrai o número do remetente (ignora grupos)
    const remoteJid: string = payload?.data?.key?.remoteJid || payload?.key?.remoteJid || ''
    if (remoteJid.includes('@g.us')) return
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    if (!phone) return

    // Processa em background (fire-and-forget) — a resposta 200 já foi enviada.
    handleInbound(app, { storeSlug, phone, text: messageText }).catch((err) => {
      app.log.error({ err }, 'Automation webhook (handleInbound) error')
    })
  })
}

export default automationRoutes
