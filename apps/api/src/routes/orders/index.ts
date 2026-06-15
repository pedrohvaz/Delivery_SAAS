import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { getOptionalCustomerAccountId } from '../../middlewares/optional-customer.js'
import { notifyOrderStatus } from '../../lib/notifications.js'
import { createOrder, OrderError, createOrderSchema } from '../../lib/order-service.js'

const orderRoutes: FastifyPluginAsync = async (app) => {
  // ─── POST /orders (público — cliente faz pedido) ──────────────────
  app.post('/', async (request, reply) => {
    const result = createOrderSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const d = result.data

    // Conta global do cliente (opcional — a rota continua pública para visitantes)
    const accountId = await getOptionalCustomerAccountId(request)

    try {
      const created = await createOrder(app, { ...d, accountId })
      return reply.status(201).send({ data: created })
    } catch (err) {
      if (err instanceof OrderError) {
        return reply.status(err.httpStatus).send({ error: err.code, message: err.message, statusCode: err.httpStatus })
      }
      throw err
    }
  })

  // ─── GET /orders/:id/payment (público — status do pagamento PIX) ───
  app.get('/:id/payment', async (request, reply) => {
    const { id } = request.params as { id: string }

    const payment = await app.prisma.payment.findFirst({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        method: true,
        amount: true,
        status: true,
        gatewayData: true,
        paidAt: true,
        createdAt: true,
      },
    })

    if (!payment) {
      return reply.status(404).send({ error: 'Not Found', message: 'Pagamento não encontrado', statusCode: 404 })
    }

    return { data: { ...payment, amount: Number(payment.amount) } }
  })

  // ─── GET /orders/:id/track (público — acompanhar pedido) ──────────
  app.get('/:id/track', async (request, reply) => {
    const { id } = request.params as { id: string }

    const order = await app.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        type: true,
        total: true,
        deliveryFee: true,
        discount: true,
        subtotal: true,
        paymentMethod: true,
        notes: true,
        createdAt: true,
        scheduledTo: true,
        address: true,
        store: { select: { name: true, slug: true, logoUrl: true, estimatedTime: true } },
        customer: { select: { name: true } },
        deliveryman: { select: { name: true, phone: true } },
        items: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            notes: true,
            addons: true,
          },
        },
      },
    })

    if (!order) return reply.status(404).send({ error: 'Not Found', message: 'Pedido não encontrado', statusCode: 404 })

    return { data: order }
  })

  // ─── PATCH /orders/:id/status (admin — avançar status) ────────────
  app.patch('/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status, cancelReason } = request.body as { status: string; cancelReason?: string }

    const validStatuses = ['CONFIRMED', 'IN_PRODUCTION', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Status inválido', statusCode: 400 })
    }

    const order = await app.prisma.order.findFirst({
      where: { id, storeId: request.user.storeId },
      select: {
        id: true,
        status: true,
        couponId: true,
        paymentMethod: true,
        paymentStatus: true,
        items: { select: { productId: true, quantity: true } },
      },
    })
    if (!order) return reply.status(404).send({ error: 'Not Found', message: 'Pedido não encontrado', statusCode: 404 })

    // Ao entregar um pedido em DINHEIRO, marca como PAGO (o dinheiro entrou na gaveta).
    const autoPayCash = status === 'DELIVERED' && order.paymentMethod === 'CASH' && order.paymentStatus !== 'PAID'

    const updated = await app.prisma.order.update({
      where: { id },
      data: {
        status: status as never,
        ...(status === 'CANCELLED' && cancelReason ? { cancelReason } : {}),
        ...(autoPayCash ? { paymentStatus: 'PAID' as never } : {}),
      },
    })

    // Decrementa estoque ao confirmar (CONFIRMED) — apenas produtos com controle ativo
    if (status === 'CONFIRMED' && order.status === 'PENDING') {
      for (const item of order.items) {
        await app.prisma.product.updateMany({
          where: {
            id: item.productId,
            storeId: request.user.storeId,
            stockControl: true,
            stockQty: { gt: 0 },
          },
          data: { stockQty: { decrement: item.quantity } },
        })
        // Desativa produto se estoque chegou a zero
        await app.prisma.product.updateMany({
          where: {
            id: item.productId,
            storeId: request.user.storeId,
            stockControl: true,
            stockQty: { lte: 0 },
          },
          data: { isActive: false },
        })
      }
    }

    // Restaura estoque e cupom se pedido for cancelado
    if (status === 'CANCELLED') {
      const postConfirmedStatuses = new Set(['CONFIRMED', 'IN_PRODUCTION', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'])
      if (postConfirmedStatuses.has(order.status)) {
        for (const item of order.items) {
          await app.prisma.product.updateMany({
            where: {
              id: item.productId,
              storeId: request.user.storeId,
              stockControl: true,
            },
            data: {
              stockQty: { increment: item.quantity },
              isActive: true,
            },
          })
        }
      }
      // Devolve uso do cupom independente do status anterior
      if (order.couponId) {
        await app.prisma.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { decrement: 1 } },
        })
      }
    }

    // Notifica o painel em tempo real
    try {
      app.io.to(`store:${request.user.storeId}`).emit('order_updated', {
        id: updated.id,
        status: updated.status,
      })
    } catch { /* Socket.io pode não estar pronto */ }

    // Notifica o cliente via WhatsApp
    const eventMap: Record<string, Parameters<typeof notifyOrderStatus>[0]['event']> = {
      OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
      READY_FOR_PICKUP: 'READY_FOR_PICKUP',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
    }
    const whatsappEvent = eventMap[status]
    if (whatsappEvent) {
      notifyOrderStatus({
        prisma: app.prisma,
        orderId: id,
        event: whatsappEvent,
        cancelReason,
      }).catch(() => {})
    }

    return { data: { id: updated.id, status: updated.status } }
  })

  // ─── PATCH /orders/:id/payment-status (admin — marcar pago/pendente) ──
  app.patch('/:id/payment-status', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { paymentStatus } = request.body as { paymentStatus: string }

    if (!['PAID', 'PENDING'].includes(paymentStatus)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'paymentStatus inválido', statusCode: 400 })
    }

    const order = await app.prisma.order.findFirst({
      where: { id, storeId: request.user.storeId },
      select: { id: true },
    })
    if (!order) return reply.status(404).send({ error: 'Not Found', message: 'Pedido não encontrado', statusCode: 404 })

    const updated = await app.prisma.order.update({
      where: { id },
      data: { paymentStatus: paymentStatus as never },
      select: { id: true, paymentStatus: true },
    })

    try {
      app.io.to(`store:${request.user.storeId}`).emit('order_updated', { id: updated.id })
    } catch { /* Socket.io pode não estar pronto */ }

    return { data: { id: updated.id, paymentStatus: updated.paymentStatus } }
  })

  // ─── PATCH /orders/:id/deliveryman (admin — atribuir entregador) ──
  app.patch('/:id/deliveryman', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { deliverymanId } = request.body as { deliverymanId: string | null }

    const order = await app.prisma.order.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!order) {
      return reply.status(404).send({ error: 'Not Found', message: 'Pedido não encontrado', statusCode: 404 })
    }

    if (deliverymanId) {
      const dm = await app.prisma.deliveryman.findFirst({
        where: { id: deliverymanId, storeId: request.user.storeId },
      })
      if (!dm) {
        return reply.status(404).send({ error: 'Not Found', message: 'Entregador não encontrado', statusCode: 404 })
      }
    }

    const updated = await app.prisma.order.update({
      where: { id },
      data: { deliverymanId: deliverymanId ?? null },
      include: { deliveryman: { select: { id: true, name: true, phone: true } } },
    })

    return { data: { id: updated.id, deliveryman: updated.deliveryman } }
  })

  // ─── GET /orders (admin — listar pedidos da loja) ─────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const { status, type, scheduled } = request.query as {
      status?: string
      type?: string
      scheduled?: string
    }

    const orders = await app.prisma.order.findMany({
      where: {
        storeId: request.user.storeId,
        ...(status ? { status: status as never } : {}),
        ...(type ? { type: type as never } : {}),
        ...(scheduled === 'true' ? { scheduledTo: { not: null } } : { scheduledTo: null }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        customer: { select: { name: true, phone: true } },
        items: { select: { name: true, quantity: true, price: true, addons: true } },
        deliveryman: { select: { id: true, name: true } },
      },
    })

    return { data: orders }
  })
}

export default orderRoutes
