import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'
import { brl } from '../../lib/money.js'

const createCouponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  type: z.enum(['PERCENT_DISCOUNT', 'FIXED_DISCOUNT', 'FREE_DELIVERY', 'ITEM_DISCOUNT']),
  value: z.number().min(0),
  minOrder: z.number().min(0).default(0),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true),
})

const updateCouponSchema = createCouponSchema.partial()

const couponRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /coupons ──────────────────────────────────────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const coupons = await app.prisma.coupon.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { createdAt: 'desc' },
    })
    return { data: coupons }
  })

  // ─── POST /coupons ─────────────────────────────────────────────────
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const result = createCouponSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const existing = await app.prisma.coupon.findUnique({
      where: { storeId_code: { storeId: request.user.storeId, code: result.data.code } },
    })
    if (existing) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Já existe um cupom com esse código',
        statusCode: 409,
      })
    }

    const coupon = await app.prisma.coupon.create({
      data: {
        ...result.data,
        storeId: request.user.storeId,
        maxUses: result.data.maxUses ?? null,
        expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null,
      },
    })

    return reply.status(201).send({ data: coupon })
  })

  // ─── PATCH /coupons/:id ────────────────────────────────────────────
  app.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = updateCouponSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const coupon = await app.prisma.coupon.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!coupon) return reply.status(404).send({ error: 'Not Found', message: 'Cupom não encontrado', statusCode: 404 })

    const updated = await app.prisma.coupon.update({
      where: { id },
      data: {
        ...result.data,
        ...(result.data.expiresAt !== undefined
          ? { expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null }
          : {}),
      },
    })

    return { data: updated }
  })

  // ─── DELETE /coupons/:id ───────────────────────────────────────────
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const coupon = await app.prisma.coupon.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!coupon) return reply.status(404).send({ error: 'Not Found', message: 'Cupom não encontrado', statusCode: 404 })

    await app.prisma.coupon.delete({ where: { id } })

    return reply.status(204).send()
  })
}

// ─── Rota pública: validar cupom no checkout ───────────────────────────────
export const couponPublicRoutes: FastifyPluginAsync = async (app) => {
  // POST /store/:slug/coupon/validate
  app.post('/:slug/coupon/validate', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const { code, subtotal } = request.body as { code: string; subtotal: number }

    if (!code || subtotal === undefined) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Código e subtotal obrigatórios', statusCode: 400 })
    }

    const store = await app.prisma.store.findUnique({ where: { slug }, select: { id: true } })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    const coupon = await app.prisma.coupon.findUnique({
      where: { storeId_code: { storeId: store.id, code: code.toUpperCase().trim() } },
    })

    if (!coupon || !coupon.isActive) {
      return reply.status(404).send({ error: 'Not Found', message: 'Cupom inválido ou inativo', statusCode: 404 })
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return reply.status(422).send({ error: 'Expired', message: 'Este cupom expirou', statusCode: 422 })
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return reply.status(422).send({ error: 'Limit', message: 'Este cupom atingiu o limite de usos', statusCode: 422 })
    }

    if (subtotal < Number(coupon.minOrder)) {
      return reply.status(422).send({
        error: 'MinOrder',
        message: `Pedido mínimo para este cupom: ${brl(Number(coupon.minOrder))}`,
        statusCode: 422,
      })
    }

    // Calcula o desconto
    let discount = 0
    if (coupon.type === 'PERCENT_DISCOUNT') discount = subtotal * (Number(coupon.value) / 100)
    else if (coupon.type === 'FIXED_DISCOUNT') discount = Math.min(Number(coupon.value), subtotal)
    else if (coupon.type === 'FREE_DELIVERY') discount = 0 // taxa zerada no POST /orders

    const TYPE_LABELS: Record<string, string> = {
      PERCENT_DISCOUNT: `${coupon.value}% de desconto`,
      FIXED_DISCOUNT: `${brl(Number(coupon.value))} de desconto`,
      FREE_DELIVERY: 'Frete grátis',
      ITEM_DISCOUNT: 'Desconto no item',
    }

    return {
      data: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        discount,
        label: TYPE_LABELS[coupon.type] ?? coupon.type,
      },
    }
  })
}

export default couponRoutes
