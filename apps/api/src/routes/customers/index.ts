import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8).optional(),
  email: z.string().email().optional().or(z.literal('')),
  cpf: z.string().optional(),
  notes: z.string().optional(),
})

const updateCustomerSchema = customerSchema.partial()

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

const customerRoutes: FastifyPluginAsync = async (app) => {

  // ─── GET /customers ────────────────────────────────────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const { search, page, all } = request.query as { search?: string; page?: string; all?: string }
    const take = all === 'true' ? 10_000 : 30
    const skip = all === 'true' ? 0 : ((Number(page) || 1) - 1) * take

    const where = {
      storeId: request.user.storeId,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    }

    const [customers, total] = await Promise.all([
      app.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true, name: true, phone: true, email: true, cpf: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      app.prisma.customer.count({ where }),
    ])

    return { data: customers, meta: { total, page: Number(page) || 1, take } }
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
    const [allOrdersAgg, completedAgg] = await Promise.all([
      app.prisma.order.aggregate({
        where: { customerId: customer.id, storeId: request.user.storeId },
        _count: true,
      }),
      app.prisma.order.aggregate({
        where: { customerId: customer.id, storeId: request.user.storeId, status: 'DELIVERED' },
        _count: true,
        _sum: { total: true },
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

    const data = { ...result.data }
    if (data.email === '') data.email = undefined

    const updated = await app.prisma.customer.update({ where: { id }, data })
    return { data: updated }
  })

  // ─── DELETE /customers/:id ─────────────────────────────────────────
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const customer = await app.prisma.customer.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!customer) {
      return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })
    }

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

    await app.prisma.customerAddress.delete({ where: { id: addressId } })
    return reply.status(204).send()
  })
}

export default customerRoutes
