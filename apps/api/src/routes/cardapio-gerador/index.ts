import type { FastifyPluginAsync } from 'fastify'
import type { Prisma } from '@prisma/client'
import { authenticate } from '../../middlewares/authenticate.js'
import { CARDAPIO_TEMPLATES, validateCustomTemplate, type CardapioTemplate } from '../../lib/cardapio-templates.js'
import { gerarCardapio } from '../../lib/cardapio-service.js'
import { uploadBuffer } from '../../lib/storage.js'
import { gerarCardapioSchema, validarTemplateSchema } from './schema.js'

const cardapioGeradorRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate)

  // ─── GET /cardapio/templates ──────────────────────────────────────
  app.get('/templates', async () => {
    return { data: Object.entries(CARDAPIO_TEMPLATES).map(([key, template]) => ({ key, ...template })) }
  })

  // ─── POST /cardapio/template/validar ──────────────────────────────
  app.post('/template/validar', async (request, reply) => {
    const result = validarTemplateSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })
    }

    return { data: validateCustomTemplate(result.data.template) }
  })

  // ─── POST /cardapio/gerar ──────────────────────────────────────────
  app.post('/gerar', async (request, reply) => {
    const result = gerarCardapioSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })
    }

    const { template_key, template_customizado, ...rest } = result.data

    let resolvedTemplate: CardapioTemplate | Record<string, unknown>
    if (template_customizado) {
      const validation = validateCustomTemplate(template_customizado)
      if (validation.valido === false) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: `Template customizado inválido. Faltando: ${validation.faltando.join(', ')}`,
          statusCode: 400,
        })
      }
      resolvedTemplate = template_customizado
    } else if (template_key && CARDAPIO_TEMPLATES[template_key]) {
      resolvedTemplate = CARDAPIO_TEMPLATES[template_key]
    } else {
      return reply.status(400).send({ error: 'Validation Error', message: 'Template não encontrado', statusCode: 400 })
    }

    let imageBuffer: Buffer
    try {
      imageBuffer = await gerarCardapio({ ...rest, template_customizado: resolvedTemplate })
    } catch (err) {
      app.log.error(err)
      return reply.status(502).send({
        error: 'Bad Gateway',
        message: 'Falha ao gerar a imagem do cardápio. Tente novamente em alguns instantes.',
        statusCode: 502,
      })
    }

    const imageUrl = await uploadBuffer(imageBuffer, 'cardapios')

    const config = {
      ...rest,
      produtos: rest.produtos.map(({ descricao, ...produto }) => produto),
      template_key: template_key ?? null,
      template_customizado: template_customizado ?? null,
    }

    const generatedMenu = await app.prisma.generatedMenu.create({
      data: {
        storeId: request.user.storeId,
        imageUrl,
        mode: result.data.modo,
        templateKey: template_key ?? 'custom',
        config: config as Prisma.InputJsonValue,
      },
    })

    return reply.status(201).send({ data: { imageUrl, id: generatedMenu.id, modo: result.data.modo } })
  })
}

export default cardapioGeradorRoutes
