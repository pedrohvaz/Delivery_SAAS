import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { getOptionalCustomerAccountId } from '../../middlewares/optional-customer.js'
import { z } from 'zod'
import { asaasCreateCustomer, asaasCreatePixCharge, asaasGetPixQrCode } from '../../lib/asaas.js'
import { isStoreOpenNow } from '../schedules/index.js'
import { notifyOrderStatus } from '../../lib/notifications.js'
import { enqueueOrderNotification } from '../../lib/queue.js'

const addonSelectedSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  optionId: z.string(),
  optionName: z.string(),
  price: z.number().min(0),
})

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
  addons: z.array(addonSelectedSchema).default([]),
})

const createOrderSchema = z.object({
  storeSlug: z.string(),
  type: z.enum(['DELIVERY', 'PICKUP', 'TABLE', 'COUNTER']),
  tableId: z.string().uuid().optional(), // obrigatório quando type === 'TABLE'
  items: z.array(orderItemSchema).min(1),
  // Cliente
  customerName: z.string().min(2).optional(),
  customerPhone: z.string().min(8).optional(),
  // Endereço (apenas para DELIVERY)
  address: z
    .object({
      street: z.string(),
      number: z.string(),
      complement: z.string().optional(),
      district: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
      reference: z.string().optional(),
    })
    .optional(),
  // Pagamento
  paymentMethod: z.string(),
  changeFor: z.number().optional(), // troco para dinheiro
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  scheduledTo: z.string().datetime().optional(),
  saveAddress: z.boolean().optional(), // salva o endereço na conta global (se logado)
})

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

    // Busca a loja
    const store = await app.prisma.store.findUnique({
      where: { slug: d.storeSlug },
      include: { deliveryAreas: { where: { isActive: true } } },
    })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    if (!store.acceptOrders) {
      return reply.status(422).send({ error: 'Unavailable', message: 'Loja não está aceitando pedidos no momento', statusCode: 422 })
    }

    // Verifica horário de funcionamento
    if (!store.isOpen) {
      const schedules = await app.prisma.storeSchedule.findMany({
        where: { storeId: store.id, isActive: true },
      })
      const shouldBeOpen = isStoreOpenNow(schedules, store.timezone)
      if (!shouldBeOpen) {
        return reply.status(422).send({ error: 'Closed', message: 'A loja está fechada no momento', statusCode: 422 })
      }
      // Horário bate mas isOpen ainda false — atualiza em background
      app.prisma.store.update({ where: { id: store.id }, data: { isOpen: true } }).catch(() => {})
    }

    // Valida pedido mínimo
    const minOrder = Number(store.minOrderValue)
    const subtotalPreview = d.items.reduce((sum, item) => {
      const addonsTotal = item.addons.reduce((a, b) => a + b.price, 0)
      return sum + (item.price + addonsTotal) * item.quantity
    }, 0)
    if (minOrder > 0 && subtotalPreview < minOrder) {
      return reply.status(422).send({
        error: 'Min Order',
        message: `Pedido mínimo de R$ ${minOrder.toFixed(2).replace('.', ',')}`,
        statusCode: 422,
      })
    }

    // Valida endereço para delivery
    if (d.type === 'DELIVERY' && !d.address) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Endereço obrigatório para delivery', statusCode: 400 })
    }

    // Valida mesa para TABLE
    if (d.type === 'TABLE') {
      const tid = d.tableId
      if (!tid) {
        return reply.status(400).send({ error: 'Validation Error', message: 'tableId obrigatório para pedidos de mesa', statusCode: 400 })
      }
      const table = await app.prisma.table.findFirst({ where: { id: tid, storeId: store.id, isActive: true } })
      if (!table) {
        return reply.status(404).send({ error: 'Not Found', message: 'Mesa não encontrada ou inativa', statusCode: 404 })
      }
    }

    // Busca ou cria cliente pelo telefone (opcional para TABLE).
    // Se autenticado e sem nome/telefone no body, usa os dados da conta global.
    let customer: { id: string } | null = null
    let resolvedName = d.customerName
    let resolvedPhone = d.customerPhone
    if (accountId && (!resolvedName || !resolvedPhone)) {
      const acc = await app.prisma.customerAccount.findUnique({
        where: { id: accountId },
        select: { name: true, phone: true },
      })
      resolvedName = resolvedName ?? acc?.name
      resolvedPhone = resolvedPhone ?? acc?.phone
    }
    if (resolvedPhone && resolvedPhone.length >= 8) {
      customer = await app.prisma.customer.findUnique({
        where: { storeId_phone: { storeId: store.id, phone: resolvedPhone } },
      })
      if (!customer) {
        customer = await app.prisma.customer.create({
          data: { storeId: store.id, name: resolvedName ?? 'Cliente', phone: resolvedPhone, accountId: accountId ?? undefined },
        })
      } else if (accountId) {
        // Vincula o perfil store-scoped à conta global (idempotente)
        await app.prisma.customer.update({ where: { id: customer.id }, data: { accountId } })
      }
    }

    // Valida disponibilidade de estoque
    for (const item of d.items) {
      const product = await app.prisma.product.findUnique({
        where: { id: item.productId },
        select: { stockControl: true, stockQty: true, isActive: true, name: true },
      })
      if (!product || !product.isActive) {
        return reply.status(422).send({ error: 'Unavailable', message: `Produto "${item.name}" não está disponível`, statusCode: 422 })
      }
      if (product.stockControl && (product.stockQty ?? 0) < item.quantity) {
        return reply.status(422).send({
          error: 'Out of Stock',
          message: product.stockQty === 0
            ? `"${item.name}" está esgotado`
            : `Apenas ${product.stockQty} unidade(s) disponível(is) de "${item.name}"`,
          statusCode: 422,
        })
      }
    }

    // Calcula subtotal
    const subtotal = d.items.reduce((sum, item) => {
      const addonsTotal = item.addons.reduce((a, b) => a + b.price, 0)
      return sum + (item.price + addonsTotal) * item.quantity
    }, 0)

    // Aplica cupom (se houver)
    let discount = 0
    let couponId: string | null = null
    let appliedCouponType: string | null = null
    if (d.couponCode) {
      const coupon = await app.prisma.coupon.findUnique({
        where: { storeId_code: { storeId: store.id, code: d.couponCode.toUpperCase() } },
      })
      if (coupon && coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
          if (subtotal >= Number(coupon.minOrder)) {
            couponId = coupon.id
            appliedCouponType = coupon.type
            if (coupon.type === 'PERCENT_DISCOUNT') discount = subtotal * (Number(coupon.value) / 100)
            else if (coupon.type === 'FIXED_DISCOUNT') discount = Math.min(Number(coupon.value), subtotal)
            else if (coupon.type === 'FREE_DELIVERY') discount = 0 // deliveryFee será zerado abaixo
          }
        }
      }
    }

    // Calcula taxa de entrega com base nas áreas configuradas (TABLE e PICKUP = grátis)
    let deliveryFee = 0
    if (d.type !== 'PICKUP' && d.type !== 'TABLE') {
      const areas = store.deliveryAreas

      if (areas.length === 0) {
        deliveryFee = 5.00 // fallback quando nenhuma área está configurada
      } else {
        const inputDistrict = d.address?.district?.toLowerCase().trim()
        const districtMatch = inputDistrict
          ? areas.find(a => a.type === 'DISTRICT' && a.district?.toLowerCase().trim() === inputDistrict)
          : undefined

        if (districtMatch) {
          const base = Number(districtMatch.fee)
          deliveryFee = (districtMatch.freeFrom && subtotal >= Number(districtMatch.freeFrom)) ? 0 : base
        } else if (areas.some(a => a.type === 'DISTRICT')) {
          // Há bairros configurados mas o deste pedido não está na lista
          return reply.status(422).send({
            error: 'Delivery Unavailable',
            message: 'Não fazemos entregas neste bairro. Verifique o endereço.',
            statusCode: 422,
          })
        } else {
          // Só há áreas de raio — usa a primeira (geocoding completo na Fase 6+)
          const radiusArea = areas.find(a => a.type === 'RADIUS')
          if (radiusArea) {
            const base = Number(radiusArea.fee)
            deliveryFee = (radiusArea.freeFrom && subtotal >= Number(radiusArea.freeFrom)) ? 0 : base
          }
        }
      }
    }

    // FREE_DELIVERY zera a taxa de entrega em vez de aplicar desconto no subtotal
    const effectiveDeliveryFee = appliedCouponType === 'FREE_DELIVERY' ? 0 : deliveryFee

    const total = Math.max(0, subtotal - discount + effectiveDeliveryFee)

    // Cria o pedido e incrementa cupom em transação atômica
    const createdOrder = await app.prisma.$transaction(async (tx) => {
      // orderNumber calculado dentro da transaction para evitar race condition
      const lastOrder = await tx.order.findFirst({
        where: { storeId: store.id },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      })
      const orderNumber = (lastOrder?.orderNumber ?? 0) + 1

      const order = await tx.order.create({
        data: {
          storeId: store.id,
          customerId: customer?.id ?? undefined,
          orderNumber,
          type: d.type,
          status: 'PENDING',
          paymentMethod: d.paymentMethod,
          subtotal,
          deliveryFee: effectiveDeliveryFee,
          discount,
          total,
          notes: d.notes,
          ...(d.address ? { address: d.address } : {}),
          tableId: d.tableId ?? undefined,
          couponId,
          scheduledTo: d.scheduledTo ? new Date(d.scheduledTo) : null,
          items: {
            create: d.items.map((item) => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              notes: item.notes,
              addons: item.addons,
            })),
          },
        },
        include: { items: true },
      })

      if (couponId) {
        await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } })
      }

      return order
    })

    // Salva o endereço na agenda da conta global (se o cliente logado pediu).
    // Não derruba o pedido em caso de erro (mesmo padrão do Asaas abaixo).
    if (accountId && d.type === 'DELIVERY' && d.address && d.saveAddress) {
      try {
        const addr = d.address
        const exists = await app.prisma.customerAccountAddress.findFirst({
          where: { accountId, street: addr.street, number: addr.number, zipCode: addr.zipCode },
          select: { id: true },
        })
        if (!exists) {
          const count = await app.prisma.customerAccountAddress.count({ where: { accountId } })
          await app.prisma.customerAccountAddress.create({
            data: {
              accountId,
              street: addr.street, number: addr.number, complement: addr.complement,
              district: addr.district, city: addr.city, state: addr.state, zipCode: addr.zipCode,
              reference: addr.reference, isDefault: count === 0,
            },
          })
        }
      } catch (err) {
        app.log.error({ err }, 'Erro ao salvar endereço na conta do cliente')
      }
    }

    // Cria cobrança PIX via Asaas (se loja tiver API key configurada)
    let requiresPayment = false
    if (d.paymentMethod === 'PIX' && store.asaasApiKey) {
      try {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 1)
        const dueDateStr = dueDate.toISOString().split('T')[0]!

        const asaasCustomer = await asaasCreateCustomer(store.asaasApiKey, store.asaasSandbox, {
          name: resolvedName ?? 'Cliente',
          phone: resolvedPhone ?? '',
        })

        const charge = await asaasCreatePixCharge(store.asaasApiKey, store.asaasSandbox, {
          customer: asaasCustomer.id,
          value: total,
          dueDate: dueDateStr,
          description: `Pedido #${createdOrder.orderNumber} — ${store.name}`,
          externalReference: createdOrder.id,
        })

        const qrCode = await asaasGetPixQrCode(store.asaasApiKey, store.asaasSandbox, charge.id)

        await app.prisma.payment.create({
          data: {
            orderId: createdOrder.id,
            method: 'PIX',
            amount: total,
            gatewayId: charge.id,
            gatewayData: {
              qrCodeImage: qrCode.encodedImage,
              qrCodeText: qrCode.payload,
              expiresAt: qrCode.expirationDate,
            },
          },
        })

        requiresPayment = true
      } catch (err) {
        app.log.error({ err }, 'Erro ao criar cobrança Asaas — pedido criado sem pagamento online')
      }
    }

    // Notifica o painel admin em tempo real
    try {
      app.io.to(`store:${store.id}`).emit('new_order', {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        customerName: d.customerName,
        total,
        type: d.type,
      })
    } catch { /* Socket.io pode não estar pronto */ }

    // Notifica via fila (com retry automático) ou fallback síncrono
    enqueueOrderNotification(createdOrder.id, 'ORDER_RECEIVED').catch(() => {
      notifyOrderStatus({ prisma: app.prisma, orderId: createdOrder.id, event: 'ORDER_RECEIVED' }).catch(() => {})
    })

    return reply.status(201).send({
      data: {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        status: createdOrder.status,
        total: Number(createdOrder.total),
        estimatedTime: store.estimatedTime,
        requiresPayment,
      },
    })
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
        items: { select: { productId: true, quantity: true } },
      },
    })
    if (!order) return reply.status(404).send({ error: 'Not Found', message: 'Pedido não encontrado', statusCode: 404 })

    const updated = await app.prisma.order.update({
      where: { id },
      data: {
        status: status as never,
        ...(status === 'CANCELLED' && cancelReason ? { cancelReason } : {}),
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
