import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { asaasCreateCustomer, asaasCreatePixCharge, asaasGetPixQrCode } from './asaas.js'
import { isStoreOpenNow } from '../routes/schedules/index.js'
import { notifyOrderStatus } from './notifications.js'
import { enqueueOrderNotification } from './queue.js'

// ─── Schema de criação de pedido (fonte única para a rota e o bot) ──────────

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

export const createOrderSchema = z.object({
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

export type OrderItemInput = z.infer<typeof orderItemSchema>
export type OrderAddressInput = NonNullable<z.infer<typeof createOrderSchema>['address']>

/**
 * `accountId`: conta global do cliente (só quando o pedido vem da vitrine logada).
 * `notifyWhatsapp`: dispara a notificação "pedido recebido" no WhatsApp (default true).
 * O bot passa `false` porque ele mesmo envia a confirmação na conversa.
 */
export type CreateOrderInput = z.infer<typeof createOrderSchema> & {
  accountId?: string | null
  notifyWhatsapp?: boolean
}

/**
 * Erro de negócio na criação de pedido. Carrega o status HTTP equivalente para
 * a rota traduzir em resposta; o bot traduz `code`/`message` em texto amigável.
 */
export class OrderError extends Error {
  code: string
  httpStatus: number
  constructor(code: string, message: string, httpStatus = 422) {
    super(message)
    this.name = 'OrderError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

export interface CreateOrderResult {
  id: string
  orderNumber: number
  status: string
  total: number
  estimatedTime: number
  requiresPayment: boolean
}

/** Soma do carrinho (item + adicionais) × quantidade. */
export function computeSubtotal(items: OrderItemInput[]): number {
  return items.reduce((sum, item) => {
    const addonsTotal = item.addons.reduce((a, b) => a + b.price, 0)
    return sum + (item.price + addonsTotal) * item.quantity
  }, 0)
}

interface DeliveryAreaLike {
  type: string
  fee: unknown
  freeFrom: unknown | null
  district: string | null
}

/**
 * Resolve a taxa de entrega a partir das áreas configuradas. Mesma regra usada
 * tanto na criação do pedido quanto na pré-visualização do bot.
 * Lança OrderError('DELIVERY_UNAVAILABLE') quando há bairros configurados e o
 * bairro informado não está na lista.
 */
export function resolveDeliveryFee(params: {
  areas: DeliveryAreaLike[]
  type: string
  district?: string
  subtotal: number
}): number {
  const { areas, type, district, subtotal } = params
  if (type === 'PICKUP' || type === 'TABLE') return 0
  if (areas.length === 0) return 5.0 // fallback quando nenhuma área está configurada

  const inputDistrict = district?.toLowerCase().trim()
  const districtMatch = inputDistrict
    ? areas.find((a) => a.type === 'DISTRICT' && a.district?.toLowerCase().trim() === inputDistrict)
    : undefined

  if (districtMatch) {
    const base = Number(districtMatch.fee)
    return districtMatch.freeFrom && subtotal >= Number(districtMatch.freeFrom) ? 0 : base
  }
  if (areas.some((a) => a.type === 'DISTRICT')) {
    throw new OrderError('DELIVERY_UNAVAILABLE', 'Não fazemos entregas neste bairro. Verifique o endereço.', 422)
  }
  const radiusArea = areas.find((a) => a.type === 'RADIUS')
  if (radiusArea) {
    const base = Number(radiusArea.fee)
    return radiusArea.freeFrom && subtotal >= Number(radiusArea.freeFrom) ? 0 : base
  }
  return 0
}

/**
 * Cria um pedido aplicando todas as validações de negócio, cálculo de totais,
 * cupom, taxa de entrega, cobrança PIX (Asaas) e efeitos colaterais
 * (socket + notificação WhatsApp). Reutilizado pela rota `POST /orders` e pelo
 * bot de atendimento. Erros de negócio são lançados como `OrderError`.
 */
export async function createOrder(app: FastifyInstance, input: CreateOrderInput): Promise<CreateOrderResult> {
  const d = input
  const accountId = input.accountId ?? null

  // Busca a loja
  const store = await app.prisma.store.findUnique({
    where: { slug: d.storeSlug },
    include: { deliveryAreas: { where: { isActive: true } } },
  })
  if (!store) throw new OrderError('STORE_NOT_FOUND', 'Loja não encontrada', 404)
  if (!store.acceptOrders) {
    throw new OrderError('NOT_ACCEPTING', 'Loja não está aceitando pedidos no momento', 422)
  }

  // Verifica horário de funcionamento
  if (!store.isOpen) {
    const schedules = await app.prisma.storeSchedule.findMany({
      where: { storeId: store.id, isActive: true },
    })
    const shouldBeOpen = isStoreOpenNow(schedules, store.timezone)
    if (!shouldBeOpen) {
      throw new OrderError('STORE_CLOSED', 'A loja está fechada no momento', 422)
    }
    // Horário bate mas isOpen ainda false — atualiza em background
    app.prisma.store.update({ where: { id: store.id }, data: { isOpen: true } }).catch(() => {})
  }

  // Valida pedido mínimo
  const minOrder = Number(store.minOrderValue)
  const subtotal = computeSubtotal(d.items)
  if (minOrder > 0 && subtotal < minOrder) {
    throw new OrderError('MIN_ORDER', `Pedido mínimo de R$ ${minOrder.toFixed(2).replace('.', ',')}`, 422)
  }

  // Valida endereço para delivery
  if (d.type === 'DELIVERY' && !d.address) {
    throw new OrderError('ADDRESS_REQUIRED', 'Endereço obrigatório para delivery', 400)
  }

  // Valida mesa para TABLE
  if (d.type === 'TABLE') {
    const tid = d.tableId
    if (!tid) {
      throw new OrderError('TABLE_REQUIRED', 'tableId obrigatório para pedidos de mesa', 400)
    }
    const table = await app.prisma.table.findFirst({ where: { id: tid, storeId: store.id, isActive: true } })
    if (!table) {
      throw new OrderError('TABLE_NOT_FOUND', 'Mesa não encontrada ou inativa', 404)
    }
  }

  // Busca ou cria cliente pelo telefone (opcional para TABLE).
  // Se autenticado e sem nome/telefone no input, usa os dados da conta global.
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
      throw new OrderError('PRODUCT_UNAVAILABLE', `Produto "${item.name}" não está disponível`, 422)
    }
    if (product.stockControl && (product.stockQty ?? 0) < item.quantity) {
      throw new OrderError(
        'OUT_OF_STOCK',
        product.stockQty === 0
          ? `"${item.name}" está esgotado`
          : `Apenas ${product.stockQty} unidade(s) disponível(is) de "${item.name}"`,
        422,
      )
    }
  }

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
  const deliveryFee = resolveDeliveryFee({
    areas: store.deliveryAreas,
    type: d.type,
    district: d.address?.district,
    subtotal,
  })

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
        changeFor: d.paymentMethod === 'CASH' ? (d.changeFor ?? null) : null,
        subtotal,
        deliveryFee: effectiveDeliveryFee,
        discount,
        total,
        notes: d.notes,
        ...(d.address ? { address: d.address as unknown as Prisma.InputJsonValue } : {}),
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
            addons: item.addons as unknown as Prisma.InputJsonValue,
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

  // Notifica via fila (com retry automático) ou fallback síncrono.
  // O bot passa notifyWhatsapp=false pois envia a própria confirmação na conversa.
  if (d.notifyWhatsapp !== false) {
    enqueueOrderNotification(createdOrder.id, 'ORDER_RECEIVED').catch(() => {
      notifyOrderStatus({ prisma: app.prisma, orderId: createdOrder.id, event: 'ORDER_RECEIVED' }).catch(() => {})
    })
  }

  return {
    id: createdOrder.id,
    orderNumber: createdOrder.orderNumber,
    status: createdOrder.status,
    total: Number(createdOrder.total),
    estimatedTime: store.estimatedTime,
    requiresPayment,
  }
}
