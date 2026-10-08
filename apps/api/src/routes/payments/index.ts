import type { FastifyPluginAsync } from 'fastify'
import { asaasGetPayment } from '../../lib/asaas.js'
import { changeOrderStatus } from '../../lib/order-status.js'

interface AsaasWebhookPayload {
  event: string
  payment?: {
    id: string
    status?: string
    value?: number
    externalReference?: string
  }
}

const PAID_STATUSES = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])

const paymentRoutes: FastifyPluginAsync = async (app) => {
  // ─── POST /payments/webhook/asaas ─────────────────────────────────
  // O corpo do webhook NÃO é confiável (qualquer um pode chamar esta URL): ele só
  // diz "olhe a cobrança X". O status e o valor são conferidos no próprio Asaas com
  // a chave da loja dona do pedido antes de marcar como pago.
  app.post('/webhook/asaas', async (request, reply) => {
    // Camada extra opcional: token configurado no painel do Asaas
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
    if (webhookToken) {
      const headerToken = request.headers['asaas-access-token'] as string | undefined
      if (headerToken !== webhookToken) {
        app.log.warn('Webhook Asaas rejeitado: token inválido')
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    }

    const body = request.body as AsaasWebhookPayload
    const confirmEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']
    if (!confirmEvents.includes(body?.event) || !body.payment?.id) return reply.send({ received: true })

    const payment = await app.prisma.payment.findFirst({
      where: { gatewayId: body.payment.id },
      include: { order: { select: { id: true, storeId: true, store: { select: { asaasApiKey: true, asaasSandbox: true } } } } },
    })
    if (!payment || payment.status === 'PAID') return reply.send({ received: true })

    const store = payment.order.store
    if (!store.asaasApiKey) {
      app.log.warn({ orderId: payment.orderId }, 'Webhook Asaas ignorado: loja sem chave para conferir a cobrança')
      return reply.send({ received: true })
    }

    let charge
    try {
      charge = await asaasGetPayment(store.asaasApiKey, store.asaasSandbox, payment.gatewayId!)
    } catch (err) {
      app.log.error({ err, orderId: payment.orderId }, 'Webhook Asaas: falha ao conferir cobrança')
      return reply.status(502).send({ error: 'Bad Gateway' }) // Asaas reenvia o webhook
    }

    const paidEnough = Number(charge.value) + 0.009 >= Number(payment.amount)
    if (!PAID_STATUSES.has(charge.status) || !paidEnough) {
      app.log.warn({ orderId: payment.orderId, status: charge.status, value: charge.value }, 'Webhook Asaas: cobrança não está paga no valor do pedido')
      return reply.send({ received: true })
    }

    await app.prisma.$transaction([
      app.prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date() } }),
      app.prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID' } }),
    ])

    // Pago → confirma o pedido (baixa estoque). Se não der (já andou, sem estoque…),
    // o pagamento fica registrado e o lojista decide no painel.
    await changeOrderStatus(app.prisma, { orderId: payment.orderId, storeId: payment.order.storeId, to: 'CONFIRMED' })
      .catch((err) => app.log.warn({ err: err.message, orderId: payment.orderId }, 'Pedido pago não pôde ser confirmado automaticamente'))

    app.log.info({ orderId: payment.orderId }, 'Pagamento confirmado via webhook')
    return reply.send({ received: true })
  })
}

export default paymentRoutes
