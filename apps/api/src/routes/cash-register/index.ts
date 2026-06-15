import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middlewares/authenticate.js'

const cashRegisterRoutes: FastifyPluginAsync = async (app) => {

  // GET /cash-register/current — caixa aberto da loja
  app.get('/current', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user

    const register = await app.prisma.cashRegister.findFirst({
      where: { storeId, status: 'OPEN' },
      include: {
        transactions: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { openedAt: 'desc' },
    })

    if (!register) return reply.send({ data: null })

    // Soma pedidos do período (não cancelados)
    const ordersRevenue = await app.prisma.order.aggregate({
      where: {
        storeId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: register.openedAt },
      },
      _sum: { total: true },
      _count: true,
    })

    // Receita em dinheiro (CASH) — só pedidos PAGOS entram na gaveta
    const cashRevenue = await app.prisma.order.aggregate({
      where: {
        storeId,
        status: { not: 'CANCELLED' },
        paymentMethod: 'CASH',
        paymentStatus: 'PAID',
        createdAt: { gte: register.openedAt },
      },
      _sum: { total: true },
    })

    const deposits = register.transactions
      .filter((t) => t.type === 'DEPOSIT')
      .reduce((s, t) => s + Number(t.amount), 0)

    const withdrawals = register.transactions
      .filter((t) => t.type === 'WITHDRAWAL')
      .reduce((s, t) => s + Number(t.amount), 0)

    const expectedBalance =
      Number(register.openingBalance) +
      Number(cashRevenue._sum.total ?? 0) +
      deposits -
      withdrawals

    return reply.send({
      data: {
        ...register,
        ordersCount: ordersRevenue._count,
        totalRevenue: ordersRevenue._sum.total ?? 0,
        cashRevenue: cashRevenue._sum.total ?? 0,
        deposits,
        withdrawals,
        expectedBalance,
      },
    })
  })

  // POST /cash-register/open — abrir caixa
  app.post('/open', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId, sub: userId } = request.user

    const existing = await app.prisma.cashRegister.findFirst({
      where: { storeId, status: 'OPEN' },
    })
    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'Já existe um caixa aberto.', statusCode: 409 })
    }

    const schema = z.object({ openingBalance: z.number().min(0) })
    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const register = await app.prisma.cashRegister.create({
      data: { storeId, userId, openingBalance: body.data.openingBalance },
    })

    return reply.status(201).send({ data: register })
  })

  // PATCH /cash-register/:id/close — fechar caixa
  app.patch('/:id/close', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const { id } = request.params as { id: string }

    const schema = z.object({
      closingBalance: z.number().min(0),
      notes: z.string().optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const register = await app.prisma.cashRegister.findFirst({
      where: { id, storeId, status: 'OPEN' },
      include: { transactions: true },
    })
    if (!register) {
      return reply.status(404).send({ error: 'Not Found', message: 'Caixa não encontrado ou já fechado.', statusCode: 404 })
    }

    const cashRevenue = await app.prisma.order.aggregate({
      where: { storeId, status: { not: 'CANCELLED' }, paymentMethod: 'CASH', paymentStatus: 'PAID', createdAt: { gte: register.openedAt } },
      _sum: { total: true },
    })

    const deposits = register.transactions.filter((t) => t.type === 'DEPOSIT').reduce((s, t) => s + Number(t.amount), 0)
    const withdrawals = register.transactions.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + Number(t.amount), 0)
    const expectedBalance = Number(register.openingBalance) + Number(cashRevenue._sum.total ?? 0) + deposits - withdrawals

    const closed = await app.prisma.cashRegister.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closingBalance: body.data.closingBalance,
        expectedBalance,
        notes: body.data.notes,
        closedAt: new Date(),
      },
    })

    return reply.send({ data: { ...closed, expectedBalance } })
  })

  // POST /cash-register/:id/transaction — sangria ou suprimento
  app.post('/:id/transaction', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const { id } = request.params as { id: string }

    const schema = z.object({
      type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
      amount: z.number().positive(),
      description: z.string().min(1),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const register = await app.prisma.cashRegister.findFirst({ where: { id, storeId, status: 'OPEN' } })
    if (!register) {
      return reply.status(404).send({ error: 'Not Found', message: 'Caixa não encontrado ou fechado.', statusCode: 404 })
    }

    const transaction = await app.prisma.cashTransaction.create({
      data: { cashRegisterId: id, storeId, ...body.data },
    })

    return reply.status(201).send({ data: transaction })
  })

  // GET /cash-register/history — histórico de caixas
  app.get('/history', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const { page = '1' } = request.query as { page?: string }
    const take = 20
    const skip = (Number(page) - 1) * take

    const [registers, total] = await Promise.all([
      app.prisma.cashRegister.findMany({
        where: { storeId },
        orderBy: { openedAt: 'desc' },
        skip,
        take,
        include: { transactions: true },
      }),
      app.prisma.cashRegister.count({ where: { storeId } }),
    ])

    // Para cada caixa, busca o total de pedidos
    const enriched = await Promise.all(registers.map(async (reg) => {
      const ordersAgg = await app.prisma.order.aggregate({
        where: {
          storeId,
          status: { not: 'CANCELLED' },
          createdAt: {
            gte: reg.openedAt,
            ...(reg.closedAt ? { lte: reg.closedAt } : {}),
          },
        },
        _sum: { total: true },
        _count: true,
      })

      const deposits = reg.transactions.filter((t) => t.type === 'DEPOSIT').reduce((s, t) => s + Number(t.amount), 0)
      const withdrawals = reg.transactions.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + Number(t.amount), 0)

      return {
        ...reg,
        ordersCount: ordersAgg._count,
        totalRevenue: ordersAgg._sum.total ?? 0,
        deposits,
        withdrawals,
      }
    }))

    return reply.send({ data: enriched, total, page: Number(page), totalPages: Math.ceil(total / take) })
  })

  // GET /cash-register/:id — detalhes de um caixa
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const { id } = request.params as { id: string }

    const register = await app.prisma.cashRegister.findFirst({
      where: { id, storeId },
      include: { transactions: { orderBy: { createdAt: 'asc' } } },
    })
    if (!register) {
      return reply.status(404).send({ error: 'Not Found', message: 'Caixa não encontrado.', statusCode: 404 })
    }

    const periodFilter = { gte: register.openedAt, ...(register.closedAt ? { lte: register.closedAt } : {}) }

    const [ordersAgg, ordersByPayment, cashRevenue] = await Promise.all([
      app.prisma.order.aggregate({
        where: { storeId, status: { not: 'CANCELLED' }, createdAt: periodFilter },
        _sum: { total: true, deliveryFee: true, discount: true },
        _count: true,
      }),
      app.prisma.order.groupBy({
        by: ['paymentMethod'],
        where: { storeId, status: { not: 'CANCELLED' }, createdAt: periodFilter },
        _sum: { total: true },
        _count: true,
      }),
      // Necessário para calcular expectedBalance em caixas ainda abertos
      register.status === 'OPEN'
        ? app.prisma.order.aggregate({
            where: { storeId, status: { not: 'CANCELLED' }, paymentMethod: 'CASH', paymentStatus: 'PAID', createdAt: periodFilter },
            _sum: { total: true },
          })
        : Promise.resolve(null),
    ])

    const deposits = register.transactions.filter((t) => t.type === 'DEPOSIT').reduce((s, t) => s + Number(t.amount), 0)
    const withdrawals = register.transactions.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + Number(t.amount), 0)

    const expectedBalance = register.status === 'OPEN' && cashRevenue
      ? Number(register.openingBalance) + Number(cashRevenue._sum.total ?? 0) + deposits - withdrawals
      : register.expectedBalance

    return reply.send({
      data: {
        ...register,
        ordersCount: ordersAgg._count,
        totalRevenue: ordersAgg._sum.total ?? 0,
        totalDeliveryFee: ordersAgg._sum.deliveryFee ?? 0,
        totalDiscount: ordersAgg._sum.discount ?? 0,
        deposits,
        withdrawals,
        expectedBalance,
        byPaymentMethod: ordersByPayment,
      },
    })
  })
}

export default cashRegisterRoutes
