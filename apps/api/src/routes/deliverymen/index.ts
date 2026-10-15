import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'
import { addDays, endOfLocalDay, isDay, localDayKey, startOfLocalDay } from '../../lib/tz.js'

const deliverymanSchema = z.object({
  name: z.string().trim().min(2, 'Nome com pelo menos 2 letras').max(80),
  phone: z.string().trim().max(20).optional().nullable(),
  vehicle: z.string().trim().max(30).optional().nullable(),
  plate: z.string().trim().max(10).optional().nullable(),
  isActive: z.boolean().optional(),
  // PERCENT: % da taxa de entrega de cada pedido · FIXED: R$ por entrega
  commissionType: z.enum(['PERCENT', 'FIXED']).optional(),
  commission: z.number().min(0).max(1000).optional(),
})

const digits = (s?: string | null) => (s ?? '').replace(/\D/g, '')

/** Quanto o entregador recebe por um pedido. */
export function commissionFor(d: { commission: unknown; commissionType: string }, deliveryFee: number): number {
  const v = Number(d.commission) || 0
  const valor = d.commissionType === 'FIXED' ? v : (deliveryFee * v) / 100
  return Math.round(valor * 100) / 100
}

const deliverymenRoutes: FastifyPluginAsync = async (app) => {
  const bad = (reply: any, message: string, status = 400) =>
    reply.status(status).send({ error: status === 409 ? 'Conflict' : 'Validation Error', message, statusCode: status })

  async function periodo(storeId: string, q: { from?: string; to?: string }) {
    const tz = (await app.prisma.store.findUnique({ where: { id: storeId }, select: { timezone: true } }))?.timezone ?? 'America/Sao_Paulo'
    const to = isDay(q.to) ? q.to : localDayKey(new Date(), tz)
    let from = isDay(q.from) ? q.from : to
    if (from > to) from = to
    if (from < addDays(to, -366)) from = addDays(to, -366)
    return { from, to, gte: startOfLocalDay(from, tz), lte: endOfLocalDay(to, tz) }
  }

  // ─── GET /deliverymen ─────────────────────────────────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const deliverymen = await app.prisma.deliveryman.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { orders: { where: { status: 'DELIVERED' } } } },
      },
    })
    return { data: deliverymen.map((d) => ({ ...d, commission: Number(d.commission) })) }
  })

  // ─── GET /deliverymen/report?from&to — entregas e valores a pagar no período ──
  app.get('/report', { preHandler: [authenticate] }, async (request) => {
    const storeId = request.user.storeId
    const p = await periodo(storeId, request.query as { from?: string; to?: string })

    const [deliverymen, orders, emRota, semEntregador] = await Promise.all([
      app.prisma.deliveryman.findMany({ where: { storeId }, select: { id: true, commission: true, commissionType: true } }),
      app.prisma.order.findMany({
        where: { storeId, deliverymanId: { not: null }, status: 'DELIVERED', createdAt: { gte: p.gte, lte: p.lte } },
        select: { deliverymanId: true, deliveryFee: true, total: true },
      }),
      app.prisma.order.groupBy({
        by: ['deliverymanId'],
        where: { storeId, deliverymanId: { not: null }, status: 'OUT_FOR_DELIVERY' },
        _count: { id: true },
      }),
      // Entregas concluídas no período sem entregador marcado (não entram no pagamento)
      app.prisma.order.count({
        where: { storeId, type: 'DELIVERY', deliverymanId: null, status: 'DELIVERED', createdAt: { gte: p.gte, lte: p.lte } },
      }),
    ])

    const byId = new Map(deliverymen.map((d) => [d.id, d]))
    const stats = new Map<string, { deliveries: number; fees: number; ordersTotal: number; toPay: number; inRoute: number }>()
    const get = (id: string) => {
      let s = stats.get(id)
      if (!s) stats.set(id, (s = { deliveries: 0, fees: 0, ordersTotal: 0, toPay: 0, inRoute: 0 }))
      return s
    }
    for (const o of orders) {
      const d = byId.get(o.deliverymanId!)
      if (!d) continue
      const s = get(d.id)
      const fee = Number(o.deliveryFee)
      s.deliveries += 1
      s.fees += fee
      s.ordersTotal += Number(o.total)
      s.toPay += commissionFor(d, fee)
    }
    for (const r of emRota) get(r.deliverymanId!).inRoute = r._count.id

    const round = (n: number) => Math.round(n * 100) / 100
    const data = [...stats.entries()].map(([id, s]) => ({
      deliverymanId: id, deliveries: s.deliveries, fees: round(s.fees), ordersTotal: round(s.ordersTotal), toPay: round(s.toPay), inRoute: s.inRoute,
    }))
    const tot = data.reduce((a, s) => ({ deliveries: a.deliveries + s.deliveries, toPay: a.toPay + s.toPay, fees: a.fees + s.fees, inRoute: a.inRoute + s.inRoute }),
      { deliveries: 0, toPay: 0, fees: 0, inRoute: 0 })
    return { data, meta: { from: p.from, to: p.to, totals: { ...tot, toPay: round(tot.toPay), fees: round(tot.fees) }, unassigned: semEntregador } }
  })

  // ─── GET /deliverymen/:id/deliveries?from&to — lista para conferência/pagamento ──
  app.get('/:id/deliveries', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const storeId = request.user.storeId
    const dm = await app.prisma.deliveryman.findFirst({ where: { id, storeId } })
    if (!dm) return reply.status(404).send({ error: 'Not Found', message: 'Entregador não encontrado', statusCode: 404 })
    const p = await periodo(storeId, request.query as { from?: string; to?: string })

    const orders = await app.prisma.order.findMany({
      where: { storeId, deliverymanId: id, status: { in: ['DELIVERED', 'OUT_FOR_DELIVERY'] }, createdAt: { gte: p.gte, lte: p.lte } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true, orderNumber: true, status: true, createdAt: true, deliveryFee: true, total: true, paymentMethod: true, address: true,
        customer: { select: { name: true } },
      },
    })
    return {
      data: orders.map((o) => {
        const addr = (o.address ?? {}) as { street?: string; number?: string; district?: string }
        const fee = Number(o.deliveryFee)
        return {
          id: o.id, orderNumber: o.orderNumber, status: o.status, createdAt: o.createdAt, paymentMethod: o.paymentMethod,
          customer: o.customer?.name ?? null,
          district: addr.district ?? null,
          address: [addr.street, addr.number].filter(Boolean).join(', ') || null,
          deliveryFee: fee,
          total: Number(o.total),
          toPay: o.status === 'DELIVERED' ? commissionFor(dm, fee) : 0,
        }
      }),
      meta: { from: p.from, to: p.to },
    }
  })

  /** Telefone repetido entre os entregadores da loja. */
  async function telefoneEmUso(storeId: string, phone: string | null | undefined, ignoreId?: string) {
    const d = digits(phone)
    if (d.length < 8) return false
    const outros = await app.prisma.deliveryman.findMany({
      where: { storeId, phone: { not: null }, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { phone: true },
    })
    return outros.some((o) => digits(o.phone).endsWith(d.slice(-8)) && digits(o.phone).slice(-8) === d.slice(-8))
  }

  // ─── POST /deliverymen ────────────────────────────────────────────
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const result = deliverymanSchema.safeParse(request.body)
    if (!result.success) return bad(reply, result.error.issues[0]?.message ?? 'Dados inválidos')
    const v = result.data
    if (v.commissionType !== 'FIXED' && (v.commission ?? 0) > 100) return bad(reply, 'A porcentagem vai de 0 a 100')
    if (await telefoneEmUso(request.user.storeId, v.phone)) return bad(reply, 'Já existe um entregador com este telefone', 409)

    const d = await app.prisma.deliveryman.create({
      data: { ...v, phone: v.phone || null, vehicle: v.vehicle || null, plate: v.plate?.toUpperCase() || null, storeId: request.user.storeId },
    })
    return reply.status(201).send({ data: { ...d, commission: Number(d.commission) } })
  })

  // ─── PATCH /deliverymen/:id ───────────────────────────────────────
  app.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = deliverymanSchema.partial().safeParse(request.body)
    if (!result.success) return bad(reply, result.error.issues[0]?.message ?? 'Dados inválidos')

    const existing = await app.prisma.deliveryman.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Entregador não encontrado', statusCode: 404 })

    const v = result.data
    const tipo = v.commissionType ?? existing.commissionType
    const valor = v.commission ?? Number(existing.commission)
    if (tipo !== 'FIXED' && valor > 100) return bad(reply, 'A porcentagem vai de 0 a 100')
    if (v.phone !== undefined && await telefoneEmUso(request.user.storeId, v.phone, id)) return bad(reply, 'Já existe um entregador com este telefone', 409)

    const d = await app.prisma.deliveryman.update({
      where: { id },
      data: {
        ...v,
        ...(v.phone !== undefined ? { phone: v.phone || null } : {}),
        ...(v.vehicle !== undefined ? { vehicle: v.vehicle || null } : {}),
        ...(v.plate !== undefined ? { plate: v.plate?.toUpperCase() || null } : {}),
      },
    })
    return { data: { ...d, commission: Number(d.commission) } }
  })

  // ─── DELETE /deliverymen/:id ──────────────────────────────────────
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await app.prisma.deliveryman.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Entregador não encontrado', statusCode: 404 })

    // Quem já fez entregas não é apagado: o histórico de pagamento sumiria. Desative em vez disso.
    const entregas = await app.prisma.order.count({ where: { deliverymanId: id } })
    if (entregas > 0) {
      return bad(reply, `Este entregador tem ${entregas} pedido(s) no histórico. Desative-o em vez de excluir, para não perder o relatório de pagamentos.`, 409)
    }

    await app.prisma.deliveryman.delete({ where: { id } })
    return reply.status(204).send()
  })
}

export default deliverymenRoutes
