import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { asaasCreateCustomer, asaasCreatePixCharge, asaasGetPixQrCode } from './asaas.js'
import { isStoreOpenNow } from '../routes/schedules/index.js'
import { notifyOrderStatus } from './notifications.js'
import { enqueueOrderNotification } from './queue.js'

// ─── Schema de criação de pedido (fonte única para a rota e o bot) ──────────
// Preços e nomes enviados pelo cliente são IGNORADOS: o servidor recalcula tudo
// a partir do cardápio (produto + adicionais). Os campos continuam no schema
// só para compatibilidade com os frontends/bot que já os enviam.

const addonSelectedSchema = z.object({
  groupId: z.string().max(64),
  groupName: z.string().max(200),
  optionId: z.string().max(64),
  optionName: z.string().max(200),
  price: z.number().min(0),
})

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().max(200),
  price: z.number().min(0),
  quantity: z.number().int().min(1).max(99, 'Quantidade máxima por item é 99'),
  notes: z.string().max(300).optional(),
  addons: z.array(addonSelectedSchema).max(30).default([]),
})

export const createOrderSchema = z.object({
  storeSlug: z.string().max(80),
  type: z.enum(['DELIVERY', 'PICKUP', 'TABLE', 'COUNTER']),
  tableId: z.string().uuid().optional(), // obrigatório quando type === 'TABLE'
  items: z.array(orderItemSchema).min(1).max(50, 'Máximo de 50 itens por pedido'),
  // Cliente
  customerName: z.string().trim().min(2).max(100).optional(),
  customerPhone: z.string().trim().min(8).max(20).optional(),
  // Endereço (apenas para DELIVERY)
  address: z
    .object({
      street: z.string().max(200),
      number: z.string().max(20),
      complement: z.string().max(200).optional(),
      district: z.string().max(120),
      city: z.string().max(120),
      state: z.string().max(40),
      zipCode: z.string().max(12),
      reference: z.string().max(200).optional(),
    })
    .optional(),
  // Pagamento
  paymentMethod: z.string().max(40),
  changeFor: z.number().positive().max(100000).optional(), // troco para dinheiro
  couponCode: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
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
  return roundMoney(items.reduce((sum, item) => {
    const addonsTotal = item.addons.reduce((a, b) => a + b.price, 0)
    return sum + (item.price + addonsTotal) * item.quantity
  }, 0))
}

const roundMoney = (v: number) => Math.round(v * 100) / 100
const digits = (v?: string | null) => (v ?? '').replace(/\D/g, '')

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
 * bairro informado não está na lista. Sem áreas configuradas a taxa é 0 — o
 * sistema não inventa cobrança que o lojista não definiu.
 */
export function resolveDeliveryFee(params: {
  areas: DeliveryAreaLike[]
  type: string
  district?: string
  subtotal: number
}): number {
  const { areas, type, district, subtotal } = params
  if (type === 'PICKUP' || type === 'TABLE') return 0
  if (areas.length === 0) return 0

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
 * Monta os itens do pedido a partir do cardápio: valida que cada produto é da
 * loja e está ativo, que cada adicional pertence ao produto (respeitando o
 * mínimo/máximo do grupo) e usa SEMPRE nome e preço do banco.
 */
async function buildPricedItems(app: FastifyInstance, storeId: string, input: OrderItemInput[]) {
  const productIds = [...new Set(input.map((i) => i.productId))]
  const products = await app.prisma.product.findMany({
    where: { id: { in: productIds }, storeId, isActive: true },
    select: {
      id: true, name: true, price: true, stockControl: true, stockQty: true,
      addonGroups: {
        select: {
          id: true, name: true, min: true, max: true, required: true,
          options: { where: { isActive: true }, select: { id: true, name: true, price: true } },
        },
      },
    },
  })
  const byId = new Map(products.map((p) => [p.id, p]))

  const qtyByProduct = new Map<string, number>()
  const items = input.map((item) => {
    const product = byId.get(item.productId)
    if (!product) {
      throw new OrderError('PRODUCT_UNAVAILABLE', `Produto "${item.name}" não está disponível`, 422)
    }

    const countByGroup = new Map<string, number>()
    const addons = item.addons.map((sel) => {
      const group = product.addonGroups.find((g) => g.options.some((o) => o.id === sel.optionId))
      const option = group?.options.find((o) => o.id === sel.optionId)
      if (!group || !option) {
        throw new OrderError('ADDON_UNAVAILABLE', `Adicional "${sel.optionName}" não está disponível para "${product.name}"`, 422)
      }
      countByGroup.set(group.id, (countByGroup.get(group.id) ?? 0) + 1)
      return { groupId: group.id, groupName: group.name, optionId: option.id, optionName: option.name, price: Number(option.price) }
    })

    for (const group of product.addonGroups) {
      const count = countByGroup.get(group.id) ?? 0
      const min = Math.max(group.min, group.required ? 1 : 0)
      if (count > group.max) {
        throw new OrderError('ADDON_LIMIT', `Escolha no máximo ${group.max} opção(ões) em "${group.name}"`, 422)
      }
      if (count < min) {
        throw new OrderError('ADDON_REQUIRED', `Escolha ao menos ${min} opção(ões) em "${group.name}"`, 422)
      }
    }

    qtyByProduct.set(product.id, (qtyByProduct.get(product.id) ?? 0) + item.quantity)
    return {
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: item.quantity,
      notes: item.notes,
      addons,
    }
  })

  // Estoque: soma as linhas do mesmo produto antes de comparar
  for (const [productId, qty] of qtyByProduct) {
    const product = byId.get(productId)!
    if (product.stockControl && (product.stockQty ?? 0) < qty) {
      throw new OrderError(
        'OUT_OF_STOCK',
        (product.stockQty ?? 0) <= 0
          ? `"${product.name}" está esgotado`
          : `Apenas ${product.stockQty} unidade(s) disponível(is) de "${product.name}"`,
        422,
      )
    }
  }

  return items
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
    include: {
      deliveryAreas: { where: { isActive: true } },
      paymentMethods: { where: { isActive: true }, select: { type: true } },
    },
  })
  if (!store) throw new OrderError('STORE_NOT_FOUND', 'Loja não encontrada', 404)
  if (store.status !== 'ACTIVE' || !store.acceptOrders) {
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

  // Forma de pagamento precisa estar ativa na loja.
  // Pedido de mesa feito pelo garçom usa CASH como padrão (acerto no fim).
  const activeMethods = new Set(store.paymentMethods.map((m) => m.type))
  if (!activeMethods.has(d.paymentMethod) && !(d.type === 'TABLE' && d.paymentMethod === 'CASH')) {
    throw new OrderError('PAYMENT_METHOD_UNAVAILABLE', 'Forma de pagamento indisponível nesta loja', 422)
  }

  // Agendamento: precisa ser no futuro e em até 30 dias
  if (d.scheduledTo) {
    const when = new Date(d.scheduledTo).getTime()
    const now = Date.now()
    if (when < now - 60_000 || when > now + 30 * 24 * 60 * 60 * 1000) {
      throw new OrderError('INVALID_SCHEDULE', 'Escolha um horário de agendamento válido', 422)
    }
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

  // Itens com nome/preço do cardápio (o que veio do cliente é descartado)
  const items = await buildPricedItems(app, store.id, d.items)
  const subtotal = computeSubtotal(items)

  // Valida pedido mínimo
  const minOrder = Number(store.minOrderValue)
  if (minOrder > 0 && subtotal < minOrder) {
    throw new OrderError('MIN_ORDER', `Pedido mínimo de R$ ${minOrder.toFixed(2).replace('.', ',')}`, 422)
  }

  // Busca ou cria cliente pelo telefone (opcional para TABLE).
  // Se autenticado e sem nome/telefone no input, usa os dados da conta global.
  let customer: { id: string; accountId?: string | null } | null = null
  let resolvedName = d.customerName
  let resolvedPhone = d.customerPhone
  let accountPhone: string | null = null
  if (accountId) {
    const acc = await app.prisma.customerAccount.findUnique({
      where: { id: accountId },
      select: { name: true, phone: true },
    })
    accountPhone = acc?.phone ?? null
    resolvedName = resolvedName ?? acc?.name
    resolvedPhone = resolvedPhone ?? acc?.phone ?? undefined
  }
  // Só vincula o perfil da loja à conta global quando o telefone do pedido é o
  // da própria conta — senão alguém logado "puxaria" o histórico de outra pessoa.
  const linkAccount = !!accountId && !!accountPhone && digits(accountPhone) === digits(resolvedPhone)
  if (resolvedPhone && resolvedPhone.length >= 8) {
    customer = await app.prisma.customer.findUnique({
      where: { storeId_phone: { storeId: store.id, phone: resolvedPhone } },
      select: { id: true, accountId: true },
    })
    if (!customer) {
      customer = await app.prisma.customer.create({
        data: { storeId: store.id, name: resolvedName ?? 'Cliente', phone: resolvedPhone, accountId: linkAccount ? accountId! : undefined },
        select: { id: true, accountId: true },
      })
    } else if (linkAccount && !customer.accountId) {
      await app.prisma.customer.update({ where: { id: customer.id }, data: { accountId } })
    }
  }

  // Taxa de entrega com base nas áreas configuradas (TABLE e PICKUP = grátis)
  const deliveryFee = resolveDeliveryFee({
    areas: store.deliveryAreas,
    type: d.type,
    district: d.address?.district,
    subtotal,
  })

  // Cria o pedido em transação com a linha da loja travada: serializa os pedidos
  // da mesma loja, o que garante orderNumber único e uso de cupom sem corrida.
  const createdOrder = await app.prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${store.id} FOR UPDATE`

    // Cupom (relido dentro da transação para respeitar maxUses mesmo em paralelo)
    let discount = 0
    let couponId: string | null = null
    let freeDelivery = false
    if (d.couponCode) {
      const coupon = await tx.coupon.findUnique({
        where: { storeId_code: { storeId: store.id, code: d.couponCode.toUpperCase() } },
      })
      const valid = coupon && coupon.isActive
        && (!coupon.expiresAt || coupon.expiresAt > new Date())
        && (!coupon.maxUses || coupon.usedCount < coupon.maxUses)
        && subtotal >= Number(coupon.minOrder)
      if (coupon && valid) {
        couponId = coupon.id
        if (coupon.type === 'PERCENT_DISCOUNT') discount = roundMoney(subtotal * (Number(coupon.value) / 100))
        else if (coupon.type === 'FIXED_DISCOUNT') discount = Math.min(Number(coupon.value), subtotal)
        else if (coupon.type === 'FREE_DELIVERY') freeDelivery = true
      }
    }

    // FREE_DELIVERY zera a taxa de entrega em vez de aplicar desconto no subtotal
    const effectiveDeliveryFee = freeDelivery ? 0 : deliveryFee
    const total = roundMoney(Math.max(0, subtotal - discount + effectiveDeliveryFee))

    if (d.paymentMethod === 'CASH' && d.changeFor != null && d.changeFor < total) {
      throw new OrderError('INVALID_CHANGE', 'O valor para troco deve ser maior que o total do pedido', 422)
    }

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
          create: items.map((item) => ({
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
  }, { maxWait: 10000, timeout: 15000 })

  const total = Number(createdOrder.total)

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
    total,
    estimatedTime: store.estimatedTime,
    requiresPayment,
  }
}
