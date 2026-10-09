import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { CYCLE_MONTHS, parseCycle, periodTotalCents, stripeRecurring } from '../src/lib/billing'
import { call, closeApp, createStore, getApp, uid, type TestStore } from './helpers'

// Stripe falsa: nada sai para a internet. Os preços "criados" ganham ids previsíveis
// (com um código por rodada, porque stripePriceId é único e os planos de rodadas antigas ficam no banco).
let seq = 0
const RUN = Math.random().toString(36).slice(2, 8)
vi.mock('../src/lib/stripe', async (orig) => {
  const real: any = await orig()
  const client = real.getStripe()
  if (client) client.prices.update = vi.fn(async () => ({}))
  return {
    ...real,
    getStripe: () => client,
    createStripeProduct: vi.fn(async () => ({ id: `prod_test_${RUN}_${++seq}` })),
    createStripePrice: vi.fn(async (_product: string, amount: number, cycle: string) => ({ id: `price_test_${cycle}_${amount}_${RUN}_${++seq}` })),
    createCheckoutSession: vi.fn(async (p: { priceId: string }) => ({ id: 'cs_test', url: `https://checkout.test/${p.priceId}` })),
    createPreSignupCheckoutSession: vi.fn(async (p: { priceId: string; metadata: Record<string, string> }) => ({ id: 'cs_pre', url: `https://checkout.test/${p.priceId}?cycle=${p.metadata.cycle}` })),
  }
})

let superToken = ''
let store: TestStore
beforeAll(async () => {
  const app = await getApp()
  superToken = app.jwt.sign({ sub: 'super-test', role: 'SUPER_ADMIN' })
  store = await createStore('billing')
})
afterAll(async () => {
  // o plano de teste tem assinatura ligada, então não dá para apagar: só sai da vitrine
  const app = await getApp()
  await app.prisma.plan.updateMany({ where: { slug: { startsWith: 't-pro-' } }, data: { isActive: false } })
  await closeApp()
})

describe('períodos de contrato (regras)', () => {
  it('lê o período pelo nome do site ou pelo enum; sem valor é mensal', () => {
    expect(parseCycle('anual')).toBe('ANNUAL')
    expect(parseCycle('semestral')).toBe('SEMIANNUAL')
    expect(parseCycle('QUARTERLY')).toBe('QUARTERLY')
    expect(parseCycle(undefined)).toBe('MONTHLY')
    expect(parseCycle('qualquer')).toBe('MONTHLY')
  })

  it('total por período em centavos, sem erro de arredondamento', () => {
    expect(periodTotalCents(79.9, 'ANNUAL')).toBe(95880)
    expect(periodTotalCents(94.9, 'QUARTERLY')).toBe(28470)
    expect(periodTotalCents('89.90', 'SEMIANNUAL')).toBe(53940)
    expect(periodTotalCents(249, 'MONTHLY')).toBe(24900)
  })

  it('recorrência da Stripe: a cada 1, 3 e 6 meses, e anual', () => {
    expect(stripeRecurring('MONTHLY')).toEqual({ interval: 'month', interval_count: 1 })
    expect(stripeRecurring('QUARTERLY')).toEqual({ interval: 'month', interval_count: 3 })
    expect(stripeRecurring('SEMIANNUAL')).toEqual({ interval: 'month', interval_count: 6 })
    expect(stripeRecurring('ANNUAL')).toEqual({ interval: 'year', interval_count: 1 })
    expect(CYCLE_MONTHS.ANNUAL).toBe(12)
  })
})

describe('planos com preço por período', () => {
  const slug = `t-pro-${uid()}`
  let planId = ''

  it('superadmin cria plano com os 4 períodos e os preços nascem na Stripe', async () => {
    const r = await call('POST', '/plans/admin', {
      token: superToken,
      body: { slug, name: 'PRO teste', monthlyPrice: 99.9, prices: { QUARTERLY: 94.9, SEMIANNUAL: 89.9, ANNUAL: 79.9 }, features: ['a'], position: 99 },
    })
    expect(r.status).toBe(201)
    planId = r.data.data.id
    const prices = r.data.data.prices as { cycle: string; monthlyPrice: string; stripePriceId: string }[]
    expect(prices).toHaveLength(4)
    const annual = prices.find((p) => p.cycle === 'ANNUAL')!
    expect(Number(annual.monthlyPrice)).toBe(79.9)
    expect(annual.stripePriceId).toContain('price_test_ANNUAL_95880') // cobra R$ 958,80 por ano
    expect(r.data.data.stripePriceId).toBe(prices.find((p) => p.cycle === 'MONTHLY')!.stripePriceId)
  })

  it('lista pública mostra mensal, 3, 6 e 12 meses com o total de cada período', async () => {
    const r = await call('GET', '/plans')
    const plan = r.data.data.find((p: { slug: string }) => p.slug === slug)
    expect(plan.prices.map((p: { cycle: string }) => p.cycle)).toEqual(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'])
    const annual = plan.prices.find((p: { cycle: string }) => p.cycle === 'ANNUAL')
    expect(annual).toMatchObject({ months: 12, monthlyPrice: 79.9, total: 958.8, available: true })
    expect(JSON.stringify(plan.prices)).not.toContain('price_test_') // id interno não vaza por período
  })

  it('mudar o preço de um período troca o preço na Stripe; zerar tira o período', async () => {
    const before = await call('GET', '/plans/admin', { token: superToken })
    const oldAnnual = before.data.data.find((p: { id: string }) => p.id === planId).prices.find((p: { cycle: string }) => p.cycle === 'ANNUAL').stripePriceId
    const r = await call('PATCH', `/plans/admin/${planId}`, { token: superToken, body: { prices: { ANNUAL: 74.9, QUARTERLY: null } } })
    expect(r.status).toBe(200)
    const prices = r.data.data.prices as { cycle: string; monthlyPrice: string; stripePriceId: string }[]
    expect(prices.map((p) => p.cycle).sort()).toEqual(['ANNUAL', 'MONTHLY', 'SEMIANNUAL'])
    const annual = prices.find((p) => p.cycle === 'ANNUAL')!
    expect(Number(annual.monthlyPrice)).toBe(74.9)
    expect(annual.stripePriceId).not.toBe(oldAnnual)
    expect(annual.stripePriceId).toContain('price_test_ANNUAL_89880')
  })

  it('checkout do painel usa o preço do período escolhido', async () => {
    const r = await call('POST', '/plans/checkout', { token: store.token, body: { planSlug: slug, cycle: 'anual' } })
    expect(r.status).toBe(200)
    expect(r.data.data.url).toContain('price_test_ANNUAL_89880')
    const sem = await call('POST', '/plans/checkout', { token: store.token, body: { planSlug: slug, cycle: 'trimestral' } })
    expect(sem.status).toBe(404) // período tirado do plano
  })

  it('cadastro pago leva o período até a Stripe', async () => {
    const u = uid()
    const r = await call('POST', '/auth/start-paid-signup', {
      body: { storeName: 'Loja Paga', storeSlug: `paga-${u}`, name: 'Dono', email: `paga-${u}@example.com`, password: 'Senha123!', planSlug: slug, cycle: 'semestral', successUrl: 'https://x.test/ok', cancelUrl: 'https://x.test/no' },
    })
    expect(r.status).toBe(200)
    expect(r.data.data.checkoutUrl).toContain('price_test_SEMIANNUAL')
    expect(r.data.data.checkoutUrl).toContain('cycle=SEMIANNUAL')
  })

  it('webhook da Stripe grava plano e período na assinatura da loja', async () => {
    const plans = await call('GET', '/plans/admin', { token: superToken })
    const annualPrice = plans.data.data.find((p: { id: string }) => p.id === planId).prices.find((p: { cycle: string }) => p.cycle === 'ANNUAL').stripePriceId
    const stripe = new Stripe('sk_test_dummy_for_tests')
    const event = {
      id: `evt_${uid()}`, object: 'event', type: 'customer.subscription.updated',
      data: { object: { id: `sub_${uid()}`, object: 'subscription', customer: `cus_${uid()}`, status: 'active', metadata: { storeId: store.storeId }, items: { data: [{ price: { id: annualPrice } }] }, current_period_start: 1790000000, current_period_end: 1821536000, cancel_at_period_end: false } },
    }
    const payload = JSON.stringify(event)
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test_secret_for_tests' })
    const app = await getApp()
    const res = await app.inject({ method: 'POST', url: '/stripe/webhook', payload, headers: { 'content-type': 'application/json', 'stripe-signature': header } })
    expect(res.statusCode).toBe(200)
    const sub = await app.prisma.subscription.findUnique({ where: { storeId: store.storeId } })
    expect(sub).toMatchObject({ planId, cycle: 'ANNUAL', status: 'ACTIVE' })
    const me = await call('GET', '/plans/me', { token: store.token })
    expect(me.data.data.cycle).toBe('ANNUAL')
  })

  it('MRR do superadmin conta o valor mensal do período contratado', async () => {
    const r = await call('GET', '/plans/admin/subscriptions', { token: superToken })
    expect(r.status).toBe(200)
    expect(r.data.stats.mrr).toBeGreaterThanOrEqual(74.9)
  })

  it('sem login de superadmin não mexe em plano', async () => {
    const r = await call('POST', '/plans/admin/sync-stripe', { token: store.token })
    expect(r.status).toBe(403)
  })
})
