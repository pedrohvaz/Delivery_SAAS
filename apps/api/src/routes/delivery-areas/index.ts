import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'

const createAreaSchema = z.object({
  name: z.string().min(1).optional().nullable(),
  type: z.enum(['DISTRICT', 'RADIUS', 'POLYGON']),
  fee: z.number().min(0),
  minOrder: z.number().min(0).default(0),
  freeFrom: z.number().min(0).optional().nullable(),
  district: z.string().min(1).optional().nullable(),
  radiusKm: z.number().min(0.1).optional().nullable(),
  isActive: z.boolean().default(true),
})

const updateAreaSchema = createAreaSchema.partial()

const deliveryAreaRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /delivery-areas ───────────────────────────────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const areas = await app.prisma.deliveryArea.findMany({
      where: { storeId: request.user.storeId },
      orderBy: [{ type: 'asc' }, { district: 'asc' }],
    })
    return { data: areas }
  })

  // ─── POST /delivery-areas ──────────────────────────────────────────
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const result = createAreaSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const d = result.data

    if (d.type === 'DISTRICT' && !d.district) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Campo "bairro" é obrigatório para área do tipo DISTRICT',
        statusCode: 400,
      })
    }

    // RADIUS = "Taxa fixa" no painel: vale para qualquer endereço, o raio não é usado

    const area = await app.prisma.deliveryArea.create({
      data: {
        storeId: request.user.storeId,
        type: d.type,
        name: d.name,
        fee: d.fee,
        minOrder: d.minOrder,
        freeFrom: d.freeFrom ?? null,
        district: d.district,
        radiusKm: d.radiusKm,
        isActive: d.isActive,
      },
    })

    return reply.status(201).send({ data: area })
  })

  // ─── PATCH /delivery-areas/:id ─────────────────────────────────────
  app.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = updateAreaSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const area = await app.prisma.deliveryArea.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!area) {
      return reply.status(404).send({ error: 'Not Found', message: 'Área não encontrada', statusCode: 404 })
    }

    const updated = await app.prisma.deliveryArea.update({
      where: { id },
      data: result.data,
    })

    return { data: updated }
  })

  // ─── DELETE /delivery-areas/:id ────────────────────────────────────
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const area = await app.prisma.deliveryArea.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!area) {
      return reply.status(404).send({ error: 'Not Found', message: 'Área não encontrada', statusCode: 404 })
    }

    await app.prisma.deliveryArea.delete({ where: { id } })

    return reply.status(204).send()
  })
}

export default deliveryAreaRoutes
