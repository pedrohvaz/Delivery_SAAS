import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Nome com pelo menos 2 letras').max(120),
  phone: z.string().trim().min(8, 'Telefone incompleto').max(20).optional(),
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  cpf: z.string().trim().max(14).optional(),
  notes: z.string().max(500).optional(),
})

// Na edição, null (ou texto vazio) apaga o campo
const updateCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Nome com pelo menos 2 letras').max(120).optional(),
  phone: z.string().trim().max(20).nullish(),
  email: z.string().trim().email('E-mail inválido').nullish().or(z.literal('')),
  cpf: z.string().trim().max(14).nullish(),
  notes: z.string().max(500).nullish(),
})

const addressSchema = z.object({
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  district: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zipCode: z.string().optional(),
  reference: z.string().optional(),
  isDefault: z.boolean().optional(),
})

const DAY = 24 * 60 * 60 * 1000
const SEGMENTS = ['all', 'new', 'recurring', 'inactive', 'never'] as const
type Segment = (typeof SEGMENTS)[number]
const SORTS = ['recent', 'orders', 'spent', 'last', 'name'] as const
const digits = (s: string) => s.replace(/\D/g, '')

const customerRoutes: FastifyPluginAsync = async (app) => {

  // ─── GET /customers ────────────────────────────────────────────────
  // Lista com busca, segmentos (novos, recorrentes, sumidos, sem pedido) e ordenação.
  // Os números de pedido/gasto vêm de um groupBy só; filtro e ordem são feitos em memória
  // (uma loja tem no máximo alguns milhares de clientes).
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const q = request.query as { search?: string; page?: string; all?: string; segment?: string; sort?: string }
    const storeId = request.user.storeId
    const segment = ((SEGMENTS as readonly string[]).includes(q.segment ?? '') ? q.segment : 'all') as Segment
    const sort = (SORTS as readonly string[]).includes(q.sort ?? '') ? q.sort : 'recent'
    const take = q.all === 'true' ? 10_000 : 30
    const page = Math.max(1, Number(q.page) || 1)

    const [customers, stats] = await Promise.all([
      app.prisma.customer.findMany({
        where: { storeId },
        select: { id: true, name: true, phone: true, email: true, cpf: true, createdAt: true },
      }),
      app.prisma.order.groupBy({
        by: ['customerId'],
        where: { storeId, customerId: { not: null }, status: { not: 'CANCELLED' } },
        _count: { id: true },
        _sum: { total: true },
        _max: { createdAt: true },
      }),
    ])

    const byId = new Map(stats.map((s) => [s.customerId!, s]))
    const now = Date.now()
    const rows = customers.map((c) => {
      const st = byId.get(c.id)
      const ordersCount = st?._count.id ?? 0
      return {
        ...c,
        ordersCount,
        totalSpent: Number(st?._sum.total ?? 0),
        lastOrderAt: st?._max.createdAt ?? null,
        _count: { orders: ordersCount },
      }
    })

    type Row = (typeof rows)[number]
    const inSegment = (r: Row, s: Segment) => {
      switch (s) {
        case 'new': return now - r.createdAt.getTime() <= 30 * DAY
        case 'recurring': return r.ordersCount >= 3
        case 'inactive': return r.ordersCount > 0 && !!r.lastOrderAt && now - r.lastOrderAt.getTime() > 30 * DAY
        case 'never': return r.ordersCount === 0
        default: return true
      }
    }
    const counts = Object.fromEntries(SEGMENTS.map((s) => [s, rows.filter((r) => inSegment(r, s)).length])) as Record<Segment, number>

    const term = q.search?.trim().toLowerCase() ?? ''
    const termDigits = digits(term)
    const filtered = rows
      .filter((r) => inSegment(r, segment))
      .filter((r) => !term
        || r.name.toLowerCase().includes(term)
        || (r.email ?? '').toLowerCase().includes(term)
        || (termDigits.length >= 3 && digits(r.phone ?? '').includes(termDigits)))

    const time = (d: Date | null) => (d ? d.getTime() : 0)
    filtered.sort((a, b) => {
      switch (sort) {
        case 'orders': return b.ordersCount - a.ordersCount || b.totalSpent - a.totalSpent
        case 'spent': return b.totalSpent - a.totalSpent
        case 'last': return time(b.lastOrderAt) - time(a.lastOrderAt)
        case 'name': return a.name.localeCompare(b.name, 'pt-BR')
        default: return b.createdAt.getTime() - a.createdAt.getTime()
      }
    })

    const skip = q.all === 'true' ? 0 : (page - 1) * take
    return { data: filtered.slice(skip, skip + take), meta: { total: filtered.length, page, take, counts } }
  })

  // ─── POST /customers ───────────────────────────────────────────────
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const result = customerSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })
    }

    const { name, phone, email, cpf, notes } = result.data

    if (phone) {
      const existing = await app.prisma.customer.findUnique({
        where: { storeId_phone: { storeId: request.user.storeId, phone } },
      })
      if (existing) {
        return reply.status(409).send({ error: 'Conflict', message: 'Já existe um cliente com este telefone.', statusCode: 409 })
      }
    }

    const customer = await app.prisma.customer.create({
      data: { storeId: request.user.storeId, name, phone: phone || null, email: email || null, cpf: cpf || null, notes: notes || null },
    })

    return reply.status(201).send({ data: customer })
  })

  // ─── GET /customers/:id ────────────────────────────────────────────
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const customer = await app.prisma.customer.findFirst({
      where: { id, storeId: request.user.storeId },
      include: {
        addresses: { orderBy: [{ isDefault: 'desc' }, { id: 'asc' }] },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true, orderNumber: true, type: true, status: true,
            paymentMethod: true, total: true, createdAt: true,
            items: { select: { name: true, quantity: true, price: true } },
          },
        },
      },
    })

    if (!customer) {
      return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })
    }

    // Agrega stats de TODOS os pedidos do cliente (não limitado ao take: 20 acima)
    const [allOrdersAgg, completedAgg, favorites] = await Promise.all([
      app.prisma.order.aggregate({
        where: { customerId: customer.id, storeId: request.user.storeId },
        _count: true,
      }),
      // Mesma regra da lista: todo pedido que não foi cancelado
      app.prisma.order.aggregate({
        where: { customerId: customer.id, storeId: request.user.storeId, status: { not: 'CANCELLED' } },
        _count: true,
        _sum: { total: true },
      }),
      // O que o cliente mais pede (pedidos não cancelados)
      app.prisma.orderItem.groupBy({
        by: ['name'],
        where: { order: { customerId: customer.id, storeId: request.user.storeId, status: { not: 'CANCELLED' } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 3,
      }),
    ])

    const totalSpent = Number(completedAgg._sum.total ?? 0)
    const avgTicket = completedAgg._count > 0 ? totalSpent / completedAgg._count : 0

    return {
      data: {
        ...customer,
        stats: {
          totalOrders: allOrdersAgg._count,
          completedOrders: completedAgg._count,
          totalSpent,
          avgTicket,
          lastOrderAt: customer.orders[0]?.createdAt ?? null,
          favorites: favorites.map((f) => ({ name: f.name, quantity: f._sum.quantity ?? 0 })),
        },
      },
    }
  })

  // ─── PATCH /customers/:id ──────────────────────────────────────────
  app.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = updateCustomerSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })
    }

    const customer = await app.prisma.customer.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!customer) {
      return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })
    }

    const d = result.data
    const blankToNull = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() ? v.trim() : null)
    const phone = blankToNull(d.phone)
    if (phone && phone.length < 8) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Telefone incompleto', statusCode: 400 })
    }
    if (phone) {
      const dup = await app.prisma.customer.findFirst({
        where: { storeId: request.user.storeId, phone, id: { not: id } },
        select: { id: true },
      })
      if (dup) return reply.status(409).send({ error: 'Conflict', message: 'Já existe outro cliente com este telefone.', statusCode: 409 })
    }

    const updated = await app.prisma.customer.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(d.email !== undefined ? { email: blankToNull(d.email) } : {}),
        ...(d.cpf !== undefined ? { cpf: blankToNull(d.cpf) } : {}),
        ...(d.notes !== undefined ? { notes: blankToNull(d.notes) } : {}),
      },
    })
    return { data: updated }
  })

  // ─── DELETE /customers/:id ─────────────────────────────────────────
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const customer = await app.prisma.customer.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!customer) {
      return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })
    }

    // Quem participa de sorteio não pode ser apagado (o banco bloqueava e a tela mostrava erro 500)
    const sorteios = await app.prisma.raffleEntry.count({ where: { customerId: id } })
    if (sorteios > 0) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Este cliente participa de um sorteio e não pode ser excluído. Você pode editar os dados dele.',
        statusCode: 409,
      })
    }

    // Pedidos ficam no histórico (sem o vínculo com o cliente)
    await app.prisma.customer.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ─── POST /customers/:id/addresses ────────────────────────────────
  app.post('/:id/addresses', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = addressSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })
    }

    const customer = await app.prisma.customer.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!customer) {
      return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })
    }

    if (result.data.isDefault) {
      await app.prisma.customerAddress.updateMany({ where: { customerId: id }, data: { isDefault: false } })
    }

    const address = await app.prisma.customerAddress.create({
      // zipCode é obrigatório no banco; endereço cadastrado sem CEP fica com string vazia
      data: { customerId: id, ...result.data, zipCode: result.data.zipCode ?? '' },
    })

    return reply.status(201).send({ data: address })
  })

  // ─── PATCH /customers/:id/addresses/:addressId ────────────────────
  app.patch('/:id/addresses/:addressId', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, addressId } = request.params as { id: string; addressId: string }
    const result = addressSchema.partial().safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })
    }

    const customer = await app.prisma.customer.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!customer) {
      return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })
    }

    // O endereço precisa ser DESTE cliente (antes dava para alterar endereço de outra loja pelo id)
    const owned = await app.prisma.customerAddress.findFirst({ where: { id: addressId, customerId: id }, select: { id: true } })
    if (!owned) return reply.status(404).send({ error: 'Not Found', message: 'Endereço não encontrado', statusCode: 404 })

    if (result.data.isDefault) {
      await app.prisma.customerAddress.updateMany({ where: { customerId: id }, data: { isDefault: false } })
    }

    const address = await app.prisma.customerAddress.update({ where: { id: addressId }, data: result.data })
    return { data: address }
  })

  // ─── DELETE /customers/:id/addresses/:addressId ───────────────────
  app.delete('/:id/addresses/:addressId', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, addressId } = request.params as { id: string; addressId: string }

    const customer = await app.prisma.customer.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!customer) {
      return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })
    }

    const del = await app.prisma.customerAddress.deleteMany({ where: { id: addressId, customerId: id } })
    if (del.count === 0) return reply.status(404).send({ error: 'Not Found', message: 'Endereço não encontrado', statusCode: 404 })
    return reply.status(204).send()
  })
}

export default customerRoutes
