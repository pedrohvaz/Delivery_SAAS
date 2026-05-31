import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middlewares/authenticate.js'

const reviewRoutes: FastifyPluginAsync = async (app) => {
  // POST /reviews/:orderId — cliente avalia o pedido (público)
  app.post('/:orderId', async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    const schema = z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const order = await app.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, storeId: true, status: true },
    })
    if (!order) return reply.status(404).send({ error: 'Not Found', message: 'Pedido não encontrado', statusCode: 404 })
    if (order.status !== 'DELIVERED') {
      return reply.status(422).send({ error: 'Unavailable', message: 'Só é possível avaliar pedidos entregues', statusCode: 422 })
    }

    const existing = await app.prisma.orderReview.findUnique({ where: { orderId } })
    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'Pedido já foi avaliado', statusCode: 409 })
    }

    const review = await app.prisma.orderReview.create({
      data: { orderId, storeId: order.storeId, rating: body.data.rating, comment: body.data.comment },
    })
    return reply.status(201).send({ data: review })
  })

  // GET /reviews/:orderId — ver avaliação de um pedido
  app.get('/:orderId', async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    const review = await app.prisma.orderReview.findUnique({ where: { orderId } })
    if (!review) return reply.status(404).send({ error: 'Not Found', message: 'Avaliação não encontrada', statusCode: 404 })
    return { data: review }
  })

  // GET /reviews/store/:storeId/summary — média da loja (público)
  app.get('/store/:storeSlug/summary', async (request, reply) => {
    const { storeSlug } = request.params as { storeSlug: string }
    const store = await app.prisma.store.findUnique({ where: { slug: storeSlug }, select: { id: true } })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    const result = await app.prisma.orderReview.aggregate({
      where: { storeId: store.id },
      _avg: { rating: true },
      _count: true,
    })
    return { data: { avg: result._avg.rating ?? 0, count: result._count } }
  })

  // GET /reviews/store/:storeSlug/list — lista pública de avaliações da loja
  app.get('/store/:storeSlug/list', async (request, reply) => {
    const { storeSlug } = request.params as { storeSlug: string }
    const store = await app.prisma.store.findUnique({ where: { slug: storeSlug }, select: { id: true } })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    const reviews = await app.prisma.orderReview.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, rating: true, comment: true, createdAt: true,
        order: { select: { orderNumber: true, customer: { select: { name: true } } } },
      },
    })
    return {
      data: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        orderNumber: r.order?.orderNumber ?? null,
        customerName: r.order?.customer?.name?.split(' ')[0] ?? 'Cliente',
      })),
    }
  })

  // ─── Avaliação da LOJA sobre o CLIENTE (privada — requer auth do lojista) ──

  // GET /reviews/customer/:orderId — avaliação atual + reputação agregada do cliente
  app.get('/customer/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    const order = await app.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, storeId: true, customerId: true, customer: { select: { accountId: true } } },
    })
    if (!order) return reply.status(404).send({ error: 'Not Found', message: 'Pedido não encontrado', statusCode: 404 })
    if (order.storeId !== request.user.storeId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Pedido de outra loja', statusCode: 403 })
    }

    const review = await app.prisma.customerReview.findUnique({ where: { orderId } })

    // Reputação do cliente: global (todas as lojas) quando há conta vinculada, senão local
    let agg = { _avg: { rating: null as number | null }, _count: 0 }
    if (order.customerId) {
      let customerIds: string[] = [order.customerId]
      if (order.customer?.accountId) {
        const profiles = await app.prisma.customer.findMany({
          where: { accountId: order.customer.accountId },
          select: { id: true },
        })
        if (profiles.length) customerIds = profiles.map((p) => p.id)
      }
      const r = await app.prisma.customerReview.aggregate({
        where: { customerId: { in: customerIds } },
        _avg: { rating: true },
        _count: true,
      })
      agg = { _avg: { rating: r._avg.rating }, _count: r._count }
    }

    return { data: { review, rating: { avg: agg._avg.rating ?? 0, count: agg._count } } }
  })

  // POST /reviews/customer/:orderId — lojista avalia o cliente (cria ou atualiza)
  app.post('/customer/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    const schema = z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const order = await app.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, storeId: true, customerId: true },
    })
    if (!order) return reply.status(404).send({ error: 'Not Found', message: 'Pedido não encontrado', statusCode: 404 })
    if (order.storeId !== request.user.storeId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Pedido de outra loja', statusCode: 403 })
    }
    if (!order.customerId) {
      return reply.status(422).send({ error: 'Unavailable', message: 'Pedido sem cliente identificado', statusCode: 422 })
    }

    const review = await app.prisma.customerReview.upsert({
      where: { orderId },
      update: { rating: body.data.rating, comment: body.data.comment },
      create: { orderId, storeId: order.storeId, customerId: order.customerId, rating: body.data.rating, comment: body.data.comment },
    })
    return reply.status(201).send({ data: review })
  })
}

export default reviewRoutes
