import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middlewares/authenticate.js'
import { authenticateSuperAdmin } from '../../middlewares/authenticate-super-admin.js'
import {
  getStripe, createStripeProduct, createStripePrice,
  createCheckoutSession, createBillingPortalSession,
} from '../../lib/stripe.js'

const planSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  tagline: z.string().optional().nullable(),
  monthlyPrice: z.number().min(0),
  features: z.array(z.string()).default([]),
  limits: z.record(z.unknown()).default({}),
  color: z.string().optional(),
  highlight: z.boolean().optional(),
  badge: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  position: z.number().int().optional(),
})

const planRoutes: FastifyPluginAsync = async (app) => {

  // ─── PÚBLICO ────────────────────────────────────────────────────────────────

  // GET /plans — lista planos ativos (para a landing)
  app.get('/', async () => {
    const plans = await app.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    })
    return { data: plans }
  })

  // ─── ASSINATURA (loja autenticada) ──────────────────────────────────────────

  // POST /plans/checkout — cria Stripe Checkout Session
  app.post('/checkout', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      planSlug: z.string(),
      successUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })

    const stripe = getStripe()
    if (!stripe) return reply.status(503).send({ error: 'Stripe', message: 'Stripe não configurado', statusCode: 503 })

    const plan = await app.prisma.plan.findUnique({ where: { slug: body.data.planSlug } })
    if (!plan || !plan.stripePriceId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Plano não encontrado ou não vinculado ao Stripe', statusCode: 404 })
    }

    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      include: { users: { where: { role: 'ADMIN' }, take: 1 } },
    })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    const session = await createCheckoutSession({
      priceId: plan.stripePriceId,
      customerId: store.stripeCustomerId ?? undefined,
      customerEmail: store.users[0]?.email,
      storeId: store.id,
      successUrl: body.data.successUrl ?? `${process.env.NEXT_PUBLIC_API_URL ?? ''}/billing/success`,
      cancelUrl: body.data.cancelUrl ?? `${process.env.NEXT_PUBLIC_API_URL ?? ''}/billing/cancel`,
      trialDays: 7,
    })

    return { data: { url: session.url, sessionId: session.id } }
  })

  // POST /plans/portal — abre billing portal do Stripe
  app.post('/portal', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({ returnUrl: z.string().url() })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })

    const store = await app.prisma.store.findUnique({ where: { id: request.user.storeId } })
    if (!store?.stripeCustomerId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Cliente Stripe não encontrado', statusCode: 404 })
    }

    const session = await createBillingPortalSession(store.stripeCustomerId, body.data.returnUrl)
    return { data: { url: session.url } }
  })

  // GET /plans/me — assinatura atual da loja
  app.get('/me', { preHandler: [authenticate] }, async (request) => {
    const subscription = await app.prisma.subscription.findUnique({
      where: { storeId: request.user.storeId },
      include: { plan: true },
    })
    return { data: subscription }
  })

  // ─── SUPER ADMIN (CRUD) ─────────────────────────────────────────────────────

  // POST /plans/admin/backfill-trials — dá trial Elite 15 dias para lojas sem assinatura
  app.post('/admin/backfill-trials', { preHandler: [authenticateSuperAdmin] }, async (_request, reply) => {
    const elitePlan = await app.prisma.plan.findUnique({ where: { slug: 'elite' } })
    if (!elitePlan) return reply.status(404).send({ error: 'Not Found', message: 'Plano Elite não encontrado', statusCode: 404 })

    // Lojas que ainda não têm assinatura
    const storesWithoutSub = await app.prisma.store.findMany({
      where: { subscription: null },
      select: { id: true, name: true },
    })

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 15)

    let created = 0
    for (const store of storesWithoutSub) {
      try {
        await app.prisma.subscription.create({
          data: {
            storeId: store.id,
            planId: elitePlan.id,
            status: 'TRIALING',
            trialEndsAt,
          },
        })
        created++
      } catch (err) {
        app.log.error({ err, storeId: store.id }, 'Falha ao criar trial')
      }
    }

    return { data: { storesProcessed: storesWithoutSub.length, trialsCreated: created } }
  })

  // GET /plans/admin/subscriptions — lista todas assinaturas com loja e plano
  app.get('/admin/subscriptions', { preHandler: [authenticateSuperAdmin] }, async (request) => {
    const { status } = request.query as { status?: string }
    const where: any = {}
    if (status && status !== 'ALL') where.status = status

    const subscriptions = await app.prisma.subscription.findMany({
      where,
      include: {
        plan: true,
        store: { select: { id: true, name: true, slug: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Métricas agregadas
    const all = await app.prisma.subscription.findMany({
      include: { plan: { select: { monthlyPrice: true } } },
    })
    const stats = {
      total: all.length,
      trialing: all.filter((s: any) => s.status === 'TRIALING').length,
      active: all.filter((s: any) => s.status === 'ACTIVE').length,
      pastDue: all.filter((s: any) => s.status === 'PAST_DUE').length,
      canceled: all.filter((s: any) => s.status === 'CANCELED').length,
      mrr: all
        .filter((s: any) => s.status === 'ACTIVE')
        .reduce((sum: number, s: any) => sum + Number(s.plan.monthlyPrice), 0),
    }

    return { data: subscriptions, stats }
  })

  // POST /plans/admin — cria plano (cria também produto + preço no Stripe)
  app.post('/admin', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const result = planSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })

    const d = result.data
    let stripeProductId: string | null = null
    let stripePriceId: string | null = null

    // Cria no Stripe se configurado e o plano não é gratuito
    if (getStripe() && d.monthlyPrice > 0) {
      try {
        const product = await createStripeProduct(d.name, d.tagline ?? undefined)
        stripeProductId = product.id
        const price = await createStripePrice(product.id, Math.round(d.monthlyPrice * 100))
        stripePriceId = price.id
      } catch (err) {
        app.log.error({ err }, 'Erro ao criar produto/preço no Stripe')
      }
    }

    const plan = await app.prisma.plan.create({
      data: {
        slug: d.slug,
        name: d.name,
        tagline: d.tagline,
        monthlyPrice: d.monthlyPrice,
        features: d.features,
        limits: d.limits,
        color: d.color,
        highlight: d.highlight ?? false,
        badge: d.badge,
        isActive: d.isActive ?? true,
        position: d.position ?? 0,
        stripeProductId,
        stripePriceId,
      },
    })

    return reply.status(201).send({ data: plan })
  })

  // GET /plans/admin — lista todos (inclui inativos) para o superadmin
  app.get('/admin', { preHandler: [authenticateSuperAdmin] }, async () => {
    const plans = await app.prisma.plan.findMany({ orderBy: { position: 'asc' } })
    return { data: plans }
  })

  // PATCH /plans/admin/:id — edita plano (atualiza preço no Stripe se mudou)
  app.patch('/admin/:id', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = planSchema.partial().safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })

    const existing = await app.prisma.plan.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Plano não encontrado', statusCode: 404 })

    let stripePriceId = existing.stripePriceId
    const stripe = getStripe()

    // Se mudou o preço, cria novo Price no Stripe (price IDs são imutáveis)
    if (stripe && result.data.monthlyPrice !== undefined && Number(result.data.monthlyPrice) !== Number(existing.monthlyPrice) && existing.stripeProductId) {
      try {
        const newPrice = await createStripePrice(existing.stripeProductId, Math.round(result.data.monthlyPrice * 100))
        // Desativa o preço antigo
        if (existing.stripePriceId) {
          await stripe.prices.update(existing.stripePriceId, { active: false })
        }
        stripePriceId = newPrice.id
      } catch (err) {
        app.log.error({ err }, 'Erro ao atualizar preço no Stripe')
      }
    }

    const updated = await app.prisma.plan.update({
      where: { id },
      data: { ...result.data, stripePriceId },
    })

    return { data: updated }
  })

  // DELETE /plans/admin/:id
  app.delete('/admin/:id', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await app.prisma.plan.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Plano não encontrado', statusCode: 404 })

    const subsCount = await app.prisma.subscription.count({ where: { planId: id } })
    if (subsCount > 0) {
      return reply.status(409).send({
        error: 'Conflict',
        message: `Plano possui ${subsCount} assinatura(s) ativa(s). Desative-o em vez de excluir.`,
        statusCode: 409,
      })
    }

    await app.prisma.plan.delete({ where: { id } })
    return reply.status(204).send()
  })
}

export default planRoutes
