import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middlewares/authenticate.js'

const noticesRoutes: FastifyPluginAsync = async (app) => {

  // GET /notices — avisos internos ativos
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const notices = await app.prisma.internalNotice.findMany({
      where: {
        storeId: request.user.storeId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    })
    return { data: notices }
  })

  // GET /notices/all — todos os avisos (incluindo inativos)
  app.get('/all', { preHandler: [authenticate] }, async (request) => {
    const notices = await app.prisma.internalNotice.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { createdAt: 'desc' },
    })
    return { data: notices }
  })

  // POST /notices
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      message: z.string().min(1),
      type: z.enum(['info', 'warning', 'urgent']).default('info'),
      expiresAt: z.string().datetime().optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })

    const notice = await app.prisma.internalNotice.create({
      data: {
        storeId: request.user.storeId,
        message: body.data.message,
        type: body.data.type,
        expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null,
      },
    })
    return reply.status(201).send({ data: notice })
  })

  // DELETE /notices/:id
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { count } = await app.prisma.internalNotice.deleteMany({ where: { id, storeId: request.user.storeId } })
    if (count === 0) return reply.status(404).send({ error: 'Not Found', message: 'Aviso não encontrado', statusCode: 404 })
    return reply.status(204).send()
  })
}

export default noticesRoutes
