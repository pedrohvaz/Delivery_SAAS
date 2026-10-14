import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'
import { cacheDelPattern } from '../../lib/cache.js'

const createSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  imageUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string()).default([]),
  availableFor: z.enum(['DELIVERY', 'PICKUP', 'BOTH']).default('BOTH'),
  stockControl: z.boolean().default(false),
  stockQty: z.number().int().min(0).optional().nullable(),
  minStock: z.number().int().min(0).optional().nullable(),
  avgCost: z.number().min(0).optional().nullable(),
})

const updateSchema = createSchema.partial().omit({ categoryId: true }).extend({
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
})

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int().min(0) })),
})

const productRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate)

  // ─── GET /products ────────────────────────────────────────────────
  app.get('/', async (request) => {
    const { categoryId, active } = request.query as { categoryId?: string; active?: string }

    const products = await app.prisma.product.findMany({
      where: {
        storeId: request.user.storeId,
        ...(categoryId ? { categoryId } : {}),
        ...(active !== undefined ? { isActive: active === 'true' } : {}),
      },
      orderBy: [{ category: { position: 'asc' } }, { position: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { addonGroups: true } },
      },
    })

    return { data: products }
  })

  // ─── GET /products/:id ────────────────────────────────────────────
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const product = await app.prisma.product.findFirst({
      where: { id, storeId: request.user.storeId },
      include: {
        category: { select: { id: true, name: true } },
        addonGroups: {
          orderBy: { position: 'asc' },
          include: {
            options: { orderBy: { position: 'asc' } },
          },
        },
      },
    })

    if (!product) return reply.status(404).send({ error: 'Not Found', message: 'Produto não encontrado', statusCode: 404 })

    return { data: product }
  })

  // ─── POST /products ───────────────────────────────────────────────
  app.post('/', async (request, reply) => {
    const result = createSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })
    }

    // Verifica se a categoria pertence à loja
    const category = await app.prisma.category.findFirst({
      where: { id: result.data.categoryId, storeId: request.user.storeId },
    })
    if (!category) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Categoria inválida', statusCode: 400 })
    }

    const lastProduct = await app.prisma.product.findFirst({
      where: { storeId: request.user.storeId, categoryId: result.data.categoryId },
      orderBy: { position: 'desc' },
    })

    const product = await app.prisma.product.create({
      data: {
        storeId: request.user.storeId,
        categoryId: result.data.categoryId,
        name: result.data.name,
        description: result.data.description,
        price: result.data.price,
        imageUrl: result.data.imageUrl,
        tags: result.data.tags,
        availableFor: result.data.availableFor,
        stockControl: result.data.stockControl,
        stockQty: result.data.stockQty,
        minStock: result.data.minStock,
        avgCost: result.data.avgCost,
        position: (lastProduct?.position ?? -1) + 1,
      },
      include: { category: { select: { id: true, name: true } } },
    })

    // Invalida cache do menu desta loja
    const storeSlug = await app.prisma.store.findUnique({ where: { id: request.user.storeId }, select: { slug: true } })
    if (storeSlug) await cacheDelPattern(`menu:${storeSlug.slug}`)

    return reply.status(201).send({ data: product })
  })

  // ─── PATCH /products/:id ──────────────────────────────────────────
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = updateSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })
    }

    const existing = await app.prisma.product.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Produto não encontrado', statusCode: 404 })

    if (result.data.categoryId) {
      const cat = await app.prisma.category.findFirst({
        where: { id: result.data.categoryId, storeId: request.user.storeId },
      })
      if (!cat) return reply.status(400).send({ error: 'Bad Request', message: 'Categoria inválida', statusCode: 400 })
    }

    const updated = await app.prisma.product.update({
      where: { id },
      data: result.data,
      include: { category: { select: { id: true, name: true } } },
    })

    const storeSlug2 = await app.prisma.store.findUnique({ where: { id: request.user.storeId }, select: { slug: true } })
    if (storeSlug2) await cacheDelPattern(`menu:${storeSlug2.slug}`)

    return { data: updated }
  })

  // ─── DELETE /products/:id ─────────────────────────────────────────
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await app.prisma.product.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Produto não encontrado', statusCode: 404 })

    await app.prisma.product.delete({ where: { id } })

    const storeSlug = await app.prisma.store.findUnique({ where: { id: request.user.storeId }, select: { slug: true } })
    if (storeSlug) await cacheDelPattern(`menu:${storeSlug.slug}`)

    return reply.status(204).send()
  })

  // ─── PATCH /products/:id/stock ───────────────────────────────────
  app.patch('/:id/stock', async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      stockQty: z.number().int().min(0).optional(),
      stockControl: z.boolean().optional(),
      minStock: z.number().int().min(0).optional().nullable(),
      reason: z.string().optional(), // motivo da movimentação (para histórico)
      delta: z.number().int().optional(), // variação (+/-)
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })

    const existing = await app.prisma.product.findFirst({
      where: { id, storeId: request.user.storeId },
      select: { stockQty: true, stockControl: true },
    })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Produto não encontrado', statusCode: 404 })

    // Se veio delta (entrada/saída rápida), calcula o novo stockQty a partir do atual
    let newQty = body.data.stockQty
    if (body.data.delta !== undefined) {
      newQty = Math.max(0, (existing.stockQty ?? 0) + body.data.delta)
    }
    const controlled = body.data.stockControl ?? existing.stockControl

    const updated = await app.prisma.product.update({
      where: { id },
      data: {
        ...(body.data.stockControl !== undefined ? { stockControl: body.data.stockControl } : {}),
        ...(newQty !== undefined ? { stockQty: newQty } : {}),
        ...(body.data.minStock !== undefined ? { minStock: body.data.minStock } : {}),
        // Com controle ligado, zerou → some do cardápio; voltou a ter → reaparece (igual à baixa por pedido)
        ...(controlled && newQty !== undefined ? { isActive: newQty > 0 } : {}),
        ...(body.data.stockControl === false ? { isActive: true } : {}),
      },
    })

    // O cardápio fica 5 min em cache: sem isso o cliente ainda via o produto esgotado
    const storeSlug = await app.prisma.store.findUnique({ where: { id: request.user.storeId }, select: { slug: true } })
    if (storeSlug) await cacheDelPattern(`menu:${storeSlug.slug}`)

    return { data: { id: updated.id, stockQty: updated.stockQty, stockControl: updated.stockControl, isActive: updated.isActive } }
  })

  // ─── GET /products/stock-alerts ──────────────────────────────────
  app.get('/stock-alerts', async (request) => {
    // Busca todos com controle ativo e filtra em JS (evita query raw)
    const products = await app.prisma.product.findMany({
      where: {
        storeId: request.user.storeId,
        stockControl: true,
      },
      select: {
        id: true, name: true, stockQty: true, minStock: true, isActive: true,
        category: { select: { name: true } },
      },
      orderBy: { stockQty: 'asc' },
    })

    // Zerado OU abaixo do mínimo configurado
    const alerts = products.filter(
      (p) => (p.stockQty ?? 0) <= 0 || (p.minStock != null && (p.stockQty ?? 0) <= p.minStock),
    )

    return { data: alerts }
  })

  // ─── POST /products/reorder ───────────────────────────────────────
  app.post('/reorder', async (request, reply) => {
    const result = reorderSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Dados inválidos', statusCode: 400 })
    }

    await app.prisma.$transaction(
      result.data.items.map(({ id, position }) =>
        app.prisma.product.updateMany({
          where: { id, storeId: request.user.storeId },
          data: { position },
        }),
      ),
    )

    return { data: { ok: true } }
  })
}

export default productRoutes
