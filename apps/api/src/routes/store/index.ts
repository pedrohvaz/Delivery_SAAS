import type { FastifyPluginAsync } from 'fastify'
import { cacheGet, cacheSet, cacheDel } from '../../lib/cache.js'

const storePublicRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /store (lista pública de lojas) ──────────────────────────
  app.get('/', async (_request, reply) => {
    const cached = await cacheGet<any[]>('stores:list')
    if (cached) return reply.send({ data: cached })

    const stores = await app.prisma.store.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, slug: true, logoUrl: true, bannerUrl: true, description: true,
        city: true, state: true, isOpen: true, estimatedTime: true, minOrderValue: true,
      },
    })
    await cacheSet('stores:list', stores, 120) // cache 2 min
    return reply.send({ data: stores })
  })

  // ─── GET /store/:slug ─────────────────────────────────────────────
  // Retorna dados públicos da loja + cardápio + áreas de entrega
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const cacheKey = `store:${slug}`
    const cached = await cacheGet<any>(cacheKey)
    if (cached) return reply.send({ data: cached })

    const store = await app.prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        phone: true,
        address: true,
        number: true,
        district: true,
        city: true,
        state: true,
        description: true,
        isOpen: true,
        acceptOrders: true,
        estimatedTime: true,
        minOrderValue: true,
        timezone: true,
        primaryColor: true,
        layoutStyle: true,
        bannerUrl: true,
        facebookPixelId: true,
        googleTagManagerId: true,
        storeNotice: true,
        storeNoticeType: true,
        schedules: {
          where: { isActive: true },
          select: { dayOfWeek: true, openTime: true, closeTime: true },
          orderBy: { dayOfWeek: 'asc' },
        },
        paymentMethods: {
          where: { isActive: true },
          select: { id: true, type: true, label: true },
        },
        deliveryAreas: {
          where: { isActive: true },
          select: { id: true, name: true, type: true, fee: true, minOrder: true, freeFrom: true, radiusKm: true, district: true },
        },
      },
    })

    if (!store) {
      return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    }

    await cacheSet(cacheKey, store, 60) // cache 1 min (isOpen muda com frequência)
    return { data: store }
  })

  // ─── GET /store/:slug/customer?phone=XX (público — identifica cliente recorrente) ──
  app.get('/:slug/customer', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const { phone } = request.query as { phone?: string }

    if (!phone || phone.length < 8) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Telefone inválido', statusCode: 400 })
    }

    const store = await app.prisma.store.findUnique({ where: { slug }, select: { id: true } })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    const customer = await app.prisma.customer.findUnique({
      where: { storeId_phone: { storeId: store.id, phone } },
      select: { id: true, name: true, phone: true },
    })

    if (!customer) return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })

    return { data: customer }
  })

  // ─── GET /store/:slug/customer-orders?phone=XX ────────────────────
  app.get('/:slug/customer-orders', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const { phone } = request.query as { phone?: string }
    if (!phone || phone.length < 8) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Telefone inválido', statusCode: 400 })
    }
    const store = await app.prisma.store.findUnique({ where: { slug }, select: { id: true } })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    const customer = await app.prisma.customer.findUnique({
      where: { storeId_phone: { storeId: store.id, phone } },
      select: { id: true },
    })
    if (!customer) return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })

    const orders = await app.prisma.order.findMany({
      where: { storeId: store.id, customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, orderNumber: true, status: true, total: true, createdAt: true,
        items: { select: { name: true, quantity: true }, take: 3 },
      },
    })
    return { data: orders }
  })

  // ─── GET /store/:slug/menu ─────────────────────────────────────────
  // Cardápio público com categorias + produtos ativos
  app.get('/:slug/menu', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const menuCacheKey = `menu:${slug}`
    const cachedMenu = await cacheGet<any[]>(menuCacheKey)
    if (cachedMenu) return reply.send({ data: cachedMenu })

    const store = await app.prisma.store.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!store) {
      return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    }

    const categories = await app.prisma.category.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { position: 'asc' },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            tags: true,
            availableFor: true,
            stockControl: true,
            stockQty: true,
            addonGroups: {
              orderBy: { position: 'asc' },
              include: {
                options: {
                  where: { isActive: true },
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    await cacheSet(menuCacheKey, categories, 300) // cache 5 min
    return { data: categories }
  })
}

export default storePublicRoutes
