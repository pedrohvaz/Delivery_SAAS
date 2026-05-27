import type { FastifyPluginAsync } from 'fastify'
import { authenticateSuperAdmin } from '../../middlewares/authenticate-super-admin.js'

const superAdminStoresRoutes: FastifyPluginAsync = async (app) => {
  // GET /super-admin/stores
  app.get('/', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { page = '1', search = '' } = request.query as { page?: string; search?: string }
    const take = 20
    const skip = (Number(page) - 1) * take

    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { slug: { contains: search, mode: 'insensitive' as const } }] }
      : {}

    const [stores, total] = await Promise.all([
      app.prisma.store.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          phone: true,
          city: true,
          state: true,
          status: true,
          isOpen: true,
          acceptOrders: true,
          suspendReason: true,
          createdAt: true,
          _count: { select: { orders: true, users: true } },
        },
      }),
      app.prisma.store.count({ where }),
    ])

    return reply.send({
      data: stores,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / take),
    })
  })

  // GET /super-admin/stores/:id
  app.get('/:id', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const [store, recentOrders, users, revenue] = await Promise.all([
      app.prisma.store.findUnique({
        where: { id },
        select: {
          id: true, name: true, slug: true, logoUrl: true, phone: true,
          address: true, number: true, district: true, city: true, state: true, zipCode: true,
          whatsapp: true, instagram: true, facebook: true, description: true,
          isOpen: true, acceptOrders: true, timezone: true,
          minOrderValue: true, estimatedTime: true,
          createdAt: true, updatedAt: true,
          schedules: { select: { dayOfWeek: true, openTime: true, closeTime: true, isActive: true }, orderBy: { dayOfWeek: 'asc' } },
          _count: { select: { orders: true, users: true, products: true, customers: true } },
        },
      }),
      app.prisma.order.findMany({
        where: { storeId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, orderNumber: true, type: true, status: true,
          paymentStatus: true, total: true, createdAt: true,
          customer: { select: { name: true } },
        },
      }),
      app.prisma.user.findMany({
        where: { storeId: id },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      app.prisma.order.aggregate({
        where: { storeId: id, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
    ])

    if (!store) {
      return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    }

    return reply.send({
      data: {
        ...store,
        revenueTotal: revenue._sum.total ?? 0,
        recentOrders,
        users,
      },
    })
  })

  // PATCH /super-admin/stores/:id/toggle-accept
  app.patch('/:id/toggle-accept', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const store = await app.prisma.store.findUnique({ where: { id }, select: { acceptOrders: true } })
    if (!store) {
      return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    }

    const updated = await app.prisma.store.update({
      where: { id },
      data: { acceptOrders: !store.acceptOrders },
      select: { id: true, acceptOrders: true },
    })

    return reply.send({ data: updated })
  })

  // PATCH /super-admin/stores/:id/toggle-open
  app.patch('/:id/toggle-open', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const store = await app.prisma.store.findUnique({ where: { id }, select: { isOpen: true } })
    if (!store) {
      return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    }

    const updated = await app.prisma.store.update({
      where: { id },
      data: { isOpen: !store.isOpen },
      select: { id: true, isOpen: true },
    })

    return reply.send({ data: updated })
  })

  // PATCH /super-admin/stores/:id/suspend
  app.patch('/:id/suspend', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { reason } = request.body as { reason?: string }

    const store = await app.prisma.store.findUnique({ where: { id }, select: { status: true } })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    if (store.status === 'SUSPENDED') return reply.status(409).send({ error: 'Conflict', message: 'Loja já está suspensa', statusCode: 409 })

    const updated = await app.prisma.store.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendReason: reason ?? null,
        isOpen: false,
        acceptOrders: false,
      },
      select: { id: true, status: true, suspendedAt: true, suspendReason: true },
    })
    return reply.send({ data: updated })
  })

  // PATCH /super-admin/stores/:id/activate
  app.patch('/:id/activate', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const store = await app.prisma.store.findUnique({ where: { id }, select: { status: true } })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    const updated = await app.prisma.store.update({
      where: { id },
      data: { status: 'ACTIVE', suspendedAt: null, suspendReason: null, acceptOrders: true },
      select: { id: true, status: true },
    })
    return reply.send({ data: updated })
  })

  // DELETE /super-admin/stores/:id
  app.delete('/:id', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const store = await app.prisma.store.findUnique({ where: { id }, select: { id: true, name: true } })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    await app.prisma.store.delete({ where: { id } })
    return reply.status(204).send()
  })

  // POST /super-admin/stores/:id/contact — contato direto com o lojista
  app.post('/:id/contact', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { method, message } = request.body as { method: 'whatsapp' | 'email'; message: string }

    const store = await app.prisma.store.findUnique({
      where: { id },
      select: { name: true, whatsapp: true, phone: true, users: { where: { role: 'ADMIN' }, select: { email: true }, take: 1 } },
    })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    if (method === 'whatsapp') {
      const phone = (store.whatsapp ?? store.phone ?? '').replace(/\D/g, '')
      if (!phone) return reply.status(422).send({ error: 'Unavailable', message: 'Loja não tem WhatsApp/telefone cadastrado', statusCode: 422 })
      const encodedMsg = encodeURIComponent(message)
      const whatsappUrl = `https://wa.me/55${phone}?text=${encodedMsg}`
      return reply.send({ data: { method: 'whatsapp', url: whatsappUrl } })
    }

    if (method === 'email') {
      const email = store.users[0]?.email
      if (!email) return reply.status(422).send({ error: 'Unavailable', message: 'Nenhum admin com e-mail encontrado', statusCode: 422 })
      const mailtoUrl = `mailto:${email}?subject=Contato sobre sua loja ${store.name}&body=${encodeURIComponent(message)}`
      return reply.send({ data: { method: 'email', url: mailtoUrl, email } })
    }

    return reply.status(400).send({ error: 'Bad Request', message: 'Método inválido', statusCode: 400 })
  })

  // GET /super-admin/stores/:id/users
  app.get('/:id/users', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const users = await app.prisma.user.findMany({
      where: { storeId: id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return reply.send({ data: users })
  })
}

export default superAdminStoresRoutes
