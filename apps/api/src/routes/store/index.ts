import type { FastifyPluginAsync } from 'fastify'
import { cacheGet, cacheSet, cacheDel } from '../../lib/cache.js'
import { cotar, quoteSchema } from '../delivery-areas/index.js'

const storePublicRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /store (lista pública de lojas) ──────────────────────────
  app.get('/', async (_request, reply) => {
    const cached = await cacheGet<any[]>('stores:list')
    if (cached) return reply.send({ data: cached })

    const stores = await app.prisma.store.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, slug: true, logoUrl: true, bannerUrl: true, description: true,
        city: true, state: true, isOpen: true, estimatedTime: true, minOrderValue: true,
      },
    })

    // Notas (média + total) por loja, a partir das avaliações dos clientes
    const ratings = await app.prisma.orderReview.groupBy({
      by: ['storeId'],
      _avg: { rating: true },
      _count: true,
    })
    const ratingMap = new Map(ratings.map((r) => [r.storeId, { avg: r._avg.rating ?? 0, count: r._count }]))
    const withRatings = stores.map((s) => ({
      ...s,
      ratingAvg: ratingMap.get(s.id)?.avg ?? 0,
      ratingCount: ratingMap.get(s.id)?.count ?? 0,
    }))

    await cacheSet('stores:list', withRatings, 120) // cache 2 min
    return reply.send({ data: withRatings })
  })

  // ─── GET /store/:slug ─────────────────────────────────────────────
  // Retorna dados públicos da loja + cardápio + áreas de entrega
  // ─── POST /store/:slug/delivery-quote ──────────────────────────────
  // Taxa de entrega para o endereço digitado no checkout (por bairro, distância ou taxa fixa).
  // Limite próprio: cada endereço novo pode consultar o mapa.
  app.post('/:slug/delivery-quote', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const r = quoteSchema.safeParse(request.body)
    if (!r.success) return reply.status(400).send({ error: 'Validation Error', message: 'Endereço inválido', statusCode: 400 })
    const store = await app.prisma.store.findUnique({
      where: { slug },
      select: { lat: true, lng: true, city: true, state: true, status: true, deliveryAreas: { where: { isActive: true } } },
    })
    if (!store || store.status !== 'ACTIVE') return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    return { data: await cotar(store, r.data) }
  })

  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const cacheKey = `store:${slug}`
    const cached = await cacheGet<any>(cacheKey)
    if (cached) return reply.send({ data: cached })

    const store = await app.prisma.store.findFirst({
      where: { slug, status: 'ACTIVE' },
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
        bannerMobileUrl: true,
        facebookPixelId: true,
        googleTagManagerId: true,
        storeNotice: true,
        storeNoticeType: true,
        pausedUntil: true,
        schedules: {
          where: { isActive: true },
          select: { dayOfWeek: true, openTime: true, closeTime: true },
          orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }],
        },
        // Próximas datas especiais (feriados/folgas) para o cliente ver
        specialDays: {
          where: { date: { gte: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10) } },
          select: { date: true, isClosed: true, openTime: true, closeTime: true, note: true },
          orderBy: { date: 'asc' },
          take: 5,
        },
        paymentMethods: {
          where: { isActive: true },
          select: { id: true, type: true, label: true },
        },
        deliveryAreas: {
          where: { isActive: true },
          select: { id: true, name: true, type: true, fee: true, minOrder: true, freeFrom: true, radiusKm: true, district: true, baseKm: true, perKmFee: true },
        },
      },
    })

    if (!store) {
      return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    }

    await cacheSet(cacheKey, store, 60) // cache 1 min (isOpen muda com frequência)
    return { data: store }
  })

  // As antigas rotas GET /store/:slug/customer e /customer-orders (consulta por
  // telefone sem login) foram removidas: expunham nome e histórico de qualquer
  // cliente. O histórico agora é da conta global (/customer/orders) ou dos
  // pedidos feitos no próprio aparelho.

  // ─── GET /store/:slug/menu ─────────────────────────────────────────
  // Cardápio público com categorias + produtos ativos
  app.get('/:slug/menu', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const menuCacheKey = `menu:${slug}`
    const cachedMenu = await cacheGet<any[]>(menuCacheKey)
    if (cachedMenu) return reply.send({ data: cachedMenu })

    const store = await app.prisma.store.findFirst({
      where: { slug, status: 'ACTIVE' },
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
