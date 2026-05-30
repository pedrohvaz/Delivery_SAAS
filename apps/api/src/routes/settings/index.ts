import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'
import { cacheDel } from '../../lib/cache.js'

const updateStoreInfoSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  description: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
})

const updateSettingsSchema = z.object({
  asaasApiKey: z.string().optional(),
  asaasSandbox: z.boolean().optional(),
  minOrderValue: z.number().min(0).optional(),
  estimatedTime: z.number().int().min(1).optional(),
  evolutionApiUrl: z.string().url().optional().or(z.literal('')),
  evolutionApiKey: z.string().optional(),
  evolutionInstance: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  layoutStyle: z.enum(['grid', 'list']).optional(),
  bannerUrl: z.string().url().optional().or(z.literal('')),
  mpAccessToken: z.string().optional(),
  mpPublicKey: z.string().optional(),
  mpSandbox: z.boolean().optional(),
  facebookPixelId: z.string().optional(),
  googleTagManagerId: z.string().optional(),
  storeNotice: z.string().optional(),
  storeNoticeType: z.enum(['info', 'warning', 'success']).optional(),
  orderSoundUrl: z.string().url().optional().or(z.literal('')),
  customDomain: z.string().optional(),
})

const createPaymentMethodSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1),
  isActive: z.boolean().default(true),
})

const updatePaymentMethodSchema = z.object({
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

const settingsRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /settings/store-info ──────────────────────────────────────
  app.get('/store-info', { preHandler: [authenticate] }, async (request) => {
    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: {
        name: true, phone: true, whatsapp: true, address: true, number: true,
        complement: true, district: true, city: true, state: true, zipCode: true,
        description: true, instagram: true, facebook: true,
      },
    })
    return { data: store }
  })

  // ─── PATCH /settings/store-info ────────────────────────────────────
  app.patch('/store-info', { preHandler: [authenticate] }, async (request, reply) => {
    const body = updateStoreInfoSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation Error', message: body.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })
    }
    const updated = await app.prisma.store.update({
      where: { id: request.user.storeId },
      data: body.data,
      select: {
        slug: true,
        name: true, phone: true, whatsapp: true, address: true, number: true,
        complement: true, district: true, city: true, state: true, zipCode: true,
        description: true, instagram: true, facebook: true,
      },
    })
    await cacheDel(`store:${updated.slug}`, `menu:${updated.slug}`)
    return { data: updated }
  })

  // ─── GET /settings ─────────────────────────────────────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const storeId = request.user.storeId

    const store = await app.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        asaasApiKey: true,
        asaasSandbox: true,
        minOrderValue: true,
        estimatedTime: true,
        isOpen: true,
        acceptOrders: true,
        evolutionApiUrl: true,
        evolutionApiKey: true,
        evolutionInstance: true,
        primaryColor: true,
        layoutStyle: true,
        bannerUrl: true,
        mpAccessToken: true,
        mpPublicKey: true,
        mpSandbox: true,
        facebookPixelId: true,
        googleTagManagerId: true,
        storeNotice: true,
        storeNoticeType: true,
        orderSoundUrl: true,
        customDomain: true,
      },
    })

    const paymentMethods = await app.prisma.paymentMethod.findMany({
      where: { storeId },
      orderBy: { type: 'asc' },
    })

    return {
      data: {
        asaasApiKey: store?.asaasApiKey ?? null,
        asaasSandbox: store?.asaasSandbox ?? true,
        minOrderValue: Number(store?.minOrderValue ?? 0),
        estimatedTime: store?.estimatedTime ?? 45,
        isOpen: store?.isOpen ?? false,
        acceptOrders: store?.acceptOrders ?? true,
        evolutionApiUrl: store?.evolutionApiUrl ?? null,
        evolutionApiKey: store?.evolutionApiKey ?? null,
        evolutionInstance: store?.evolutionInstance ?? null,
        mpAccessToken: store?.mpAccessToken ? '••••••••' : null,
        mpPublicKey: store?.mpPublicKey ?? null,
        mpSandbox: store?.mpSandbox ?? true,
        primaryColor: store?.primaryColor ?? '#f97316',
        layoutStyle: store?.layoutStyle ?? 'grid',
        bannerUrl: store?.bannerUrl ?? null,
        facebookPixelId: store?.facebookPixelId ?? null,
        googleTagManagerId: store?.googleTagManagerId ?? null,
        storeNotice: store?.storeNotice ?? null,
        storeNoticeType: store?.storeNoticeType ?? null,
        orderSoundUrl: store?.orderSoundUrl ?? null,
        customDomain: store?.customDomain ?? null,
        paymentMethods,
      },
    }
  })

  // ─── PATCH /settings ───────────────────────────────────────────────
  app.patch('/', { preHandler: [authenticate] }, async (request, reply) => {
    const result = updateSettingsSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const d = result.data

    const updated = await app.prisma.store.update({
      where: { id: request.user.storeId },
      data: {
        ...(d.asaasApiKey !== undefined ? { asaasApiKey: d.asaasApiKey || null } : {}),
        ...(d.asaasSandbox !== undefined ? { asaasSandbox: d.asaasSandbox } : {}),
        ...(d.minOrderValue !== undefined ? { minOrderValue: d.minOrderValue } : {}),
        ...(d.estimatedTime !== undefined ? { estimatedTime: d.estimatedTime } : {}),
        ...(d.evolutionApiUrl !== undefined ? { evolutionApiUrl: d.evolutionApiUrl || null } : {}),
        ...(d.evolutionApiKey !== undefined ? { evolutionApiKey: d.evolutionApiKey || null } : {}),
        ...(d.evolutionInstance !== undefined ? { evolutionInstance: d.evolutionInstance || null } : {}),
        ...(d.primaryColor !== undefined ? { primaryColor: d.primaryColor } : {}),
        ...(d.layoutStyle !== undefined ? { layoutStyle: d.layoutStyle } : {}),
        ...(d.bannerUrl !== undefined ? { bannerUrl: d.bannerUrl || null } : {}),
        ...(d.mpAccessToken !== undefined && d.mpAccessToken !== '••••••••' ? { mpAccessToken: d.mpAccessToken || null } : {}),
        ...(d.mpPublicKey !== undefined ? { mpPublicKey: d.mpPublicKey || null } : {}),
        ...(d.mpSandbox !== undefined ? { mpSandbox: d.mpSandbox } : {}),
        ...(d.facebookPixelId !== undefined ? { facebookPixelId: d.facebookPixelId || null } : {}),
        ...(d.googleTagManagerId !== undefined ? { googleTagManagerId: d.googleTagManagerId || null } : {}),
        ...(d.storeNotice !== undefined ? { storeNotice: d.storeNotice || null } : {}),
        ...(d.storeNoticeType !== undefined ? { storeNoticeType: d.storeNoticeType || null } : {}),
        ...(d.orderSoundUrl !== undefined ? { orderSoundUrl: d.orderSoundUrl || null } : {}),
        ...(d.customDomain !== undefined ? { customDomain: d.customDomain || null } : {}),
      },
      select: {
        slug: true,
        asaasApiKey: true, asaasSandbox: true, minOrderValue: true, estimatedTime: true,
        evolutionApiUrl: true, evolutionApiKey: true, evolutionInstance: true,
        primaryColor: true, layoutStyle: true, bannerUrl: true,
        mpAccessToken: true, mpPublicKey: true, mpSandbox: true,
        facebookPixelId: true, googleTagManagerId: true,
        storeNotice: true, storeNoticeType: true,
        orderSoundUrl: true, customDomain: true,
      },
    })

    // Invalida o cache público da vitrine para a alteração refletir na hora
    await cacheDel(`store:${updated.slug}`, `menu:${updated.slug}`)

    return { data: updated }
  })

  // ─── GET /settings/payment-methods ─────────────────────────────────
  app.get('/payment-methods', { preHandler: [authenticate] }, async (request) => {
    const paymentMethods = await app.prisma.paymentMethod.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { type: 'asc' },
    })
    return { data: paymentMethods }
  })

  // ─── POST /settings/payment-methods ────────────────────────────────
  app.post('/payment-methods', { preHandler: [authenticate] }, async (request, reply) => {
    const result = createPaymentMethodSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    // Evita duplicatas do mesmo tipo
    const existing = await app.prisma.paymentMethod.findFirst({
      where: { storeId: request.user.storeId, type: result.data.type },
    })
    if (existing) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Forma de pagamento já cadastrada',
        statusCode: 409,
      })
    }

    const pm = await app.prisma.paymentMethod.create({
      data: { ...result.data, storeId: request.user.storeId },
    })

    return reply.status(201).send({ data: pm })
  })

  // ─── PATCH /settings/payment-methods/:id ───────────────────────────
  app.patch('/payment-methods/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = updatePaymentMethodSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const pm = await app.prisma.paymentMethod.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!pm) return reply.status(404).send({ error: 'Not Found', message: 'Forma de pagamento não encontrada', statusCode: 404 })

    const updated = await app.prisma.paymentMethod.update({
      where: { id },
      data: result.data,
    })

    return { data: updated }
  })

  // ─── DELETE /settings/payment-methods/:id ──────────────────────────
  app.delete('/payment-methods/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const pm = await app.prisma.paymentMethod.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!pm) return reply.status(404).send({ error: 'Not Found', message: 'Forma de pagamento não encontrada', statusCode: 404 })

    await app.prisma.paymentMethod.delete({ where: { id } })

    return reply.status(204).send()
  })

  // ─── GET /settings/cashback ────────────────────────────────────────
  app.get('/cashback', { preHandler: [authenticate] }, async (request) => {
    const { storeId } = request.user

    let cashback = await app.prisma.cashbackConfig.findUnique({ where: { storeId } })
    if (!cashback) {
      cashback = await app.prisma.cashbackConfig.create({
        data: { storeId },
      })
    }

    return { data: cashback }
  })

  // ─── PATCH /settings/cashback ──────────────────────────────────────
  app.patch('/cashback', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const schema = z.object({
      isActive: z.boolean().optional(),
      percentBack: z.number().min(1).max(100).optional(),
      minOrderValue: z.number().min(0).optional(),
      expirationDays: z.number().int().min(1).optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation Error', message: body.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })
    }

    const cashback = await app.prisma.cashbackConfig.upsert({
      where: { storeId },
      create: { storeId, ...body.data },
      update: body.data,
    })

    return { data: cashback }
  })

  // ─── GET /settings/promo-stats ─────────────────────────────────────
  app.get('/promo-stats', { preHandler: [authenticate] }, async (request) => {
    const { storeId } = request.user
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [totalDiscount, couponsUsed, activeCoupons, topCoupons] = await Promise.all([
      app.prisma.order.aggregate({
        where: { storeId, createdAt: { gte: thirtyDaysAgo }, discount: { gt: 0 } },
        _sum: { discount: true },
        _count: true,
      }),
      app.prisma.coupon.aggregate({
        where: { storeId },
        _sum: { usedCount: true },
      }),
      app.prisma.coupon.count({
        where: {
          storeId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
      app.prisma.coupon.findMany({
        where: { storeId, usedCount: { gt: 0 } },
        orderBy: { usedCount: 'desc' },
        take: 5,
        select: { id: true, code: true, type: true, value: true, usedCount: true },
      }),
    ])

    return {
      data: {
        totalDiscount30d: totalDiscount._sum.discount ?? 0,
        ordersWithDiscount30d: totalDiscount._count,
        totalCouponsUsed: couponsUsed._sum.usedCount ?? 0,
        activeCoupons,
        topCoupons,
      },
    }
  })
}

export default settingsRoutes
