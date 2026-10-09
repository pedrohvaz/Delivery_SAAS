import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { authenticate } from '../../middlewares/authenticate.js'
import { authenticateSuperAdmin } from '../../middlewares/authenticate-super-admin.js'
import {
  getStripe, createStripeProduct, createStripePrice,
  createCheckoutSession, createBillingPortalSession,
} from '../../lib/stripe.js'
import {
  CYCLES, CYCLE_LABEL, CYCLE_MONTHS, monthlyEquivalent, parseCycle, periodTotalCents, resolveCheckoutPrice,
  type Cycle,
} from '../../lib/billing.js'

// Preço por mês de cada período (ex.: { ANNUAL: 79.9 }). 0 ou null tira o período do plano.
const pricesSchema = z.object({
  MONTHLY: z.number().min(0).nullable().optional(),
  QUARTERLY: z.number().min(0).nullable().optional(),
  SEMIANNUAL: z.number().min(0).nullable().optional(),
  ANNUAL: z.number().min(0).nullable().optional(),
})

const planSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  tagline: z.string().optional().nullable(),
  monthlyPrice: z.number().min(0),
  prices: pricesSchema.optional(),
  features: z.array(z.string()).default([]),
  limits: z.record(z.unknown()).default({}),
  color: z.string().optional(),
  highlight: z.boolean().optional(),
  badge: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  position: z.number().int().optional(),
})

type PlanWithPrices = Prisma.PlanGetPayload<{ include: { prices: true } }>

/** Preços para as telas: um por período, do mensal ao anual, com o total cobrado por período. */
function shapePrices(plan: PlanWithPrices, stripeOn: boolean) {
  const rows: { cycle: Cycle; monthlyPrice: unknown; stripePriceId: string | null }[] = plan.prices.map((p) => ({
    cycle: p.cycle as Cycle, monthlyPrice: p.monthlyPrice, stripePriceId: p.stripePriceId,
  }))
  // Plano antigo, sem tabela de preços: o mensal vem do próprio plano
  if (!rows.some((r) => r.cycle === 'MONTHLY') && Number(plan.monthlyPrice) > 0) {
    rows.push({ cycle: 'MONTHLY', monthlyPrice: plan.monthlyPrice, stripePriceId: plan.stripePriceId })
  }
  return rows
    .sort((a, b) => CYCLE_MONTHS[a.cycle] - CYCLE_MONTHS[b.cycle])
    .map((r) => ({
      cycle: r.cycle,
      months: CYCLE_MONTHS[r.cycle],
      label: CYCLE_LABEL[r.cycle],
      monthlyPrice: Number(r.monthlyPrice),
      total: periodTotalCents(r.monthlyPrice as number, r.cycle) / 100,
      available: stripeOn && !!r.stripePriceId, // dá para assinar online agora
    }))
}

/**
 * Grava os preços por período e, com a Stripe ligada, cria os preços que faltam.
 * Preço mudou: o preço antigo da Stripe é desativado (preço na Stripe é imutável) e nasce outro.
 */
async function savePlanPrices(app: FastifyInstance, planId: string, desired: Partial<Record<Cycle, number | null>>) {
  const plan = await app.prisma.plan.findUniqueOrThrow({ where: { id: planId }, include: { prices: true } })
  const stripe = getStripe()
  for (const cycle of CYCLES) {
    if (!(cycle in desired)) continue
    const value = desired[cycle]
    const current = plan.prices.find((p) => p.cycle === cycle)
    if (!value) {
      if (current) {
        if (stripe && current.stripePriceId) await stripe.prices.update(current.stripePriceId, { active: false }).catch(() => {})
        await app.prisma.planPrice.delete({ where: { id: current.id } })
      }
      continue
    }
    if (current && Number(current.monthlyPrice) === value) continue
    if (current) {
      if (stripe && current.stripePriceId) await stripe.prices.update(current.stripePriceId, { active: false }).catch(() => {})
      await app.prisma.planPrice.update({ where: { id: current.id }, data: { monthlyPrice: value, stripePriceId: null } })
    } else {
      await app.prisma.planPrice.create({ data: { planId, cycle, monthlyPrice: value } })
    }
  }
}

/** Com a Stripe ligada: cria o produto e os preços que ainda não existem lá. */
async function ensureStripePrices(app: FastifyInstance, planId: string) {
  if (!getStripe()) return { created: 0 }
  const plan = await app.prisma.plan.findUniqueOrThrow({ where: { id: planId }, include: { prices: true } })
  const paid = plan.prices.filter((p) => Number(p.monthlyPrice) > 0)
  if (!paid.length) return { created: 0 }
  let productId = plan.stripeProductId
  if (!productId) {
    const product = await createStripeProduct(plan.name, plan.tagline ?? undefined)
    productId = product.id
    await app.prisma.plan.update({ where: { id: plan.id }, data: { stripeProductId: productId } })
  }
  let created = 0
  for (const p of paid) {
    if (p.stripePriceId) continue
    const cycle = p.cycle as Cycle
    const price = await createStripePrice(productId, periodTotalCents(p.monthlyPrice as unknown as number, cycle), cycle, `${plan.name} ${CYCLE_LABEL[cycle]}`)
    await app.prisma.planPrice.update({ where: { id: p.id }, data: { stripePriceId: price.id } })
    created++
  }
  // compatibilidade: o stripePriceId do plano continua sendo o do mensal
  const monthly = await app.prisma.planPrice.findUnique({ where: { planId_cycle: { planId: plan.id, cycle: 'MONTHLY' } } })
  if (monthly?.stripePriceId && monthly.stripePriceId !== plan.stripePriceId) {
    await app.prisma.plan.update({ where: { id: plan.id }, data: { stripePriceId: monthly.stripePriceId } })
  }
  return { created }
}

/** O mensal do plano (monthlyPrice) e o preço MONTHLY da tabela andam juntos. */
function desiredPrices(d: { monthlyPrice?: number; prices?: z.infer<typeof pricesSchema> }) {
  const desired: Partial<Record<Cycle, number | null>> = { ...(d.prices ?? {}) }
  if (d.monthlyPrice !== undefined && desired.MONTHLY === undefined) desired.MONTHLY = d.monthlyPrice
  return desired
}

const planRoutes: FastifyPluginAsync = async (app) => {

  // ─── PÚBLICO ────────────────────────────────────────────────────────────────

  // GET /plans — lista planos ativos com o preço de cada período (site e painel)
  app.get('/', async () => {
    const plans = await app.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      include: { prices: true },
    })
    const stripeOn = !!getStripe()
    return { data: plans.map(({ prices: _p, ...plan }, i) => ({ ...plan, prices: shapePrices(plans[i]!, stripeOn) })) }
  })

  // ─── ASSINATURA (loja autenticada) ──────────────────────────────────────────

  // POST /plans/checkout — cria Stripe Checkout Session do plano + período
  app.post('/checkout', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      planSlug: z.string(),
      cycle: z.string().optional(),
      successUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })

    const stripe = getStripe()
    if (!stripe) return reply.status(503).send({ error: 'Stripe', message: 'Stripe não configurado', statusCode: 503 })

    const resolved = await resolveCheckoutPrice(app.prisma, body.data.planSlug, parseCycle(body.data.cycle))
    if ('error' in resolved) {
      return reply.status(404).send({ error: 'Not Found', message: resolved.error, statusCode: 404 })
    }

    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      include: { users: { where: { role: 'ADMIN' }, take: 1 } },
    })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    const session = await createCheckoutSession({
      priceId: resolved.stripePriceId,
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

  // GET /plans/me — assinatura atual da loja (com o período contratado)
  app.get('/me', { preHandler: [authenticate] }, async (request) => {
    const subscription = await app.prisma.subscription.findUnique({
      where: { storeId: request.user.storeId },
      include: { plan: { include: { prices: true } } },
    })
    if (!subscription) return { data: null }
    const { prices: _p, ...plan } = subscription.plan
    return { data: { ...subscription, plan: { ...plan, prices: shapePrices(subscription.plan, !!getStripe()) } } }
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

    // Métricas agregadas (MRR pelo valor mensal do período contratado)
    const all = await app.prisma.subscription.findMany({
      include: { plan: { select: { monthlyPrice: true, prices: { select: { cycle: true, monthlyPrice: true } } } } },
    })
    const stats = {
      total: all.length,
      trialing: all.filter((s: any) => s.status === 'TRIALING').length,
      active: all.filter((s: any) => s.status === 'ACTIVE').length,
      pastDue: all.filter((s: any) => s.status === 'PAST_DUE').length,
      canceled: all.filter((s: any) => s.status === 'CANCELED').length,
      mrr: all
        .filter((s: any) => s.status === 'ACTIVE')
        .reduce((sum: number, s: any) => sum + monthlyEquivalent(s.plan, s.cycle), 0),
    }

    return { data: subscriptions, stats }
  })

  // POST /plans/admin/sync-stripe — cria na Stripe os produtos e preços que faltam (todos os planos)
  app.post('/admin/sync-stripe', { preHandler: [authenticateSuperAdmin] }, async (_request, reply) => {
    if (!getStripe()) {
      return reply.status(503).send({ error: 'Stripe', message: 'Stripe não configurado: coloque STRIPE_SECRET_KEY no servidor', statusCode: 503 })
    }
    const plans = await app.prisma.plan.findMany({ orderBy: { position: 'asc' } })
    const result: { slug: string; created: number; error?: string }[] = []
    for (const plan of plans) {
      try {
        const r = await ensureStripePrices(app, plan.id)
        result.push({ slug: plan.slug, created: r.created })
      } catch (err: any) {
        app.log.error({ err, slug: plan.slug }, 'Erro ao sincronizar plano com a Stripe')
        result.push({ slug: plan.slug, created: 0, error: err?.message ?? 'erro' })
      }
    }
    return { data: result }
  })

  // POST /plans/admin — cria plano com os preços por período (e na Stripe, se ligada)
  app.post('/admin', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const result = planSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })

    const { prices, ...d } = result.data
    const plan = await app.prisma.plan.create({
      data: {
        slug: d.slug,
        name: d.name,
        tagline: d.tagline,
        monthlyPrice: d.monthlyPrice,
        features: d.features,
        limits: d.limits as Prisma.InputJsonValue,
        color: d.color,
        highlight: d.highlight ?? false,
        badge: d.badge,
        isActive: d.isActive ?? true,
        position: d.position ?? 0,
      },
    })
    await savePlanPrices(app, plan.id, desiredPrices({ monthlyPrice: d.monthlyPrice, prices }))
    let stripeError: string | undefined
    try { await ensureStripePrices(app, plan.id) } catch (err: any) {
      app.log.error({ err }, 'Erro ao criar produto/preços na Stripe')
      stripeError = err?.message
    }

    const saved = await app.prisma.plan.findUniqueOrThrow({ where: { id: plan.id }, include: { prices: true } })
    return reply.status(201).send({ data: saved, stripeError })
  })

  // GET /plans/admin — lista todos (inclui inativos) para o superadmin
  app.get('/admin', { preHandler: [authenticateSuperAdmin] }, async () => {
    const plans = await app.prisma.plan.findMany({ orderBy: { position: 'asc' }, include: { prices: true } })
    return { data: plans }
  })

  // PATCH /plans/admin/:id — edita plano e preços (preço novo vira preço novo na Stripe)
  app.patch('/admin/:id', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = planSchema.partial().safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })

    const existing = await app.prisma.plan.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Plano não encontrado', statusCode: 404 })

    const { prices, ...d } = result.data
    const desired = desiredPrices({ monthlyPrice: d.monthlyPrice, prices })
    if (desired.MONTHLY !== undefined) d.monthlyPrice = desired.MONTHLY ?? 0

    await app.prisma.plan.update({
      where: { id },
      data: { ...d, limits: d.limits as Prisma.InputJsonValue | undefined },
    })
    if (Object.keys(desired).length) await savePlanPrices(app, id, desired)
    let stripeError: string | undefined
    try { await ensureStripePrices(app, id) } catch (err: any) {
      app.log.error({ err }, 'Erro ao atualizar preços na Stripe')
      stripeError = err?.message
    }

    const updated = await app.prisma.plan.findUniqueOrThrow({ where: { id }, include: { prices: true } })
    return { data: updated, stripeError }
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
