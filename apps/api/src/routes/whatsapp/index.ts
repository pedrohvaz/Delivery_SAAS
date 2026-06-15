import type { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'node:crypto'
import { authenticate } from '../../middlewares/authenticate.js'
import {
  deleteInstance,
  ensureInstance,
  getQrCode,
  getState,
  logoutInstance,
  platformEvolution,
} from '../../lib/evolution-provisioning.js'

/**
 * Provisionamento de WhatsApp por loja (onboarding automático).
 * A instância da Evolution é nomeada pelo slug da loja.
 */
const whatsappRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate)

  function webhookUrlFor(slug: string, token: string): string {
    const base = (process.env.API_PUBLIC_URL ?? 'http://host.docker.internal:3333').replace(/\/$/, '')
    return `${base}/automation/webhook/${slug}?token=${token}`
  }

  // ─── POST /whatsapp/connect ───────────────────────────────────────
  // Cria/garante a instância, registra o webhook e retorna o QRCode.
  app.post('/connect', async (request, reply) => {
    const cfg = platformEvolution()
    if (!cfg) {
      return reply.status(503).send({
        error: 'NOT_CONFIGURED',
        message: 'Servidor de WhatsApp não configurado (EVOLUTION_API_URL/EVOLUTION_API_KEY).',
        statusCode: 503,
      })
    }

    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: { id: true, slug: true, automationConfig: { select: { webhookToken: true } } },
    })
    if (!store) {
      return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    }

    // Token do webhook por loja (gera se ainda não existe).
    const token = store.automationConfig?.webhookToken ?? randomUUID()
    await app.prisma.automationConfig.upsert({
      where: { storeId: store.id },
      create: { storeId: store.id, webhookToken: token },
      update: { webhookToken: token },
    })

    const instance = store.slug
    try {
      await ensureInstance(cfg, instance, webhookUrlFor(store.slug, token))
      const qr = await getQrCode(cfg, instance)

      // Salva a config na loja para o envio de mensagens (evolutionSendText)
      await app.prisma.store.update({
        where: { id: store.id },
        data: { evolutionApiUrl: cfg.url, evolutionApiKey: cfg.key, evolutionInstance: instance },
      })

      const state = qr.state ?? (await getState(cfg, instance))
      return { data: { instance, state, qrcode: qr.base64 ?? null, pairingCode: qr.code ?? null } }
    } catch (err) {
      app.log.error({ err }, 'whatsapp connect error')
      return reply.status(502).send({
        error: 'EVOLUTION_ERROR',
        message: 'Falha ao conectar com o servidor de WhatsApp. Tente novamente em instantes.',
        statusCode: 502,
      })
    }
  })

  // ─── GET /whatsapp/status ─────────────────────────────────────────
  app.get('/status', async (request) => {
    const cfg = platformEvolution()
    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: { evolutionInstance: true },
    })
    if (!cfg || !store?.evolutionInstance) {
      return { data: { state: 'disconnected', instance: store?.evolutionInstance ?? null } }
    }
    const state = await getState(cfg, store.evolutionInstance)
    return { data: { state, instance: store.evolutionInstance } }
  })

  // ─── POST /whatsapp/disconnect ────────────────────────────────────
  app.post('/disconnect', async (request) => {
    const cfg = platformEvolution()
    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: { evolutionInstance: true },
    })
    if (cfg && store?.evolutionInstance) {
      await logoutInstance(cfg, store.evolutionInstance)
    }
    await app.prisma.store.update({
      where: { id: request.user.storeId },
      data: { evolutionApiUrl: null, evolutionApiKey: null, evolutionInstance: null },
    })
    return { data: { state: 'disconnected' } }
  })

  // ─── DELETE /whatsapp ─────────────────────────────────────────────
  // Remove a instância por completo na Evolution (além de desconectar).
  app.delete('/', async (request) => {
    const cfg = platformEvolution()
    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: { evolutionInstance: true },
    })
    if (cfg && store?.evolutionInstance) {
      await deleteInstance(cfg, store.evolutionInstance)
    }
    await app.prisma.store.update({
      where: { id: request.user.storeId },
      data: { evolutionApiUrl: null, evolutionApiKey: null, evolutionInstance: null },
    })
    return { data: { state: 'disconnected' } }
  })
}

export default whatsappRoutes
