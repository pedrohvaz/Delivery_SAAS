import type { PrismaClient } from '@prisma/client'

// Períodos de contrato. Pago adiantado: a Stripe cobra o período inteiro e renova sozinha;
// cancelar só impede a renovação (sem multa).
export const CYCLES = ['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'] as const
export type Cycle = (typeof CYCLES)[number]

export const CYCLE_MONTHS: Record<Cycle, number> = { MONTHLY: 1, QUARTERLY: 3, SEMIANNUAL: 6, ANNUAL: 12 }

// Nome usado nos links do site (?ciclo=anual) e nas telas
export const CYCLE_SLUG: Record<Cycle, string> = { MONTHLY: 'mensal', QUARTERLY: 'trimestral', SEMIANNUAL: 'semestral', ANNUAL: 'anual' }
export const CYCLE_LABEL: Record<Cycle, string> = { MONTHLY: 'mensal', QUARTERLY: '3 meses', SEMIANNUAL: '6 meses', ANNUAL: '1 ano' }

/** Aceita o enum (ANNUAL) ou o nome do site (anual). Sem valor ou desconhecido: mensal. */
export function parseCycle(value: unknown): Cycle {
  if (typeof value !== 'string') return 'MONTHLY'
  const v = value.trim()
  const upper = v.toUpperCase()
  if ((CYCLES as readonly string[]).includes(upper)) return upper as Cycle
  const found = (Object.keys(CYCLE_SLUG) as Cycle[]).find((c) => CYCLE_SLUG[c] === v.toLowerCase())
  return found ?? 'MONTHLY'
}

/** Valor cobrado por período, em centavos (evita erro de arredondamento do float). */
export function periodTotalCents(monthlyPrice: number | string, cycle: Cycle): number {
  return Math.round(Number(monthlyPrice) * 100) * CYCLE_MONTHS[cycle]
}

/** Recorrência do preço na Stripe para cada período. */
export function stripeRecurring(cycle: Cycle): { interval: 'month' | 'year'; interval_count: number } {
  return cycle === 'ANNUAL' ? { interval: 'year', interval_count: 1 } : { interval: 'month', interval_count: CYCLE_MONTHS[cycle] }
}

/**
 * Preço da Stripe a usar no checkout de um plano + período.
 * Plano antigo sem tabela de preços: o mensal cai no stripePriceId do próprio plano.
 */
export async function resolveCheckoutPrice(prisma: PrismaClient, planSlug: string, cycle: Cycle) {
  const plan = await prisma.plan.findUnique({ where: { slug: planSlug }, include: { prices: true } })
  if (!plan || !plan.isActive) return { error: 'Plano não encontrado' as const }
  const price = plan.prices.find((p) => p.cycle === cycle)
  const stripePriceId = price?.stripePriceId ?? (cycle === 'MONTHLY' ? plan.stripePriceId : null)
  if (!stripePriceId) return { error: 'Plano ainda sem preço na Stripe para esse período' as const, plan }
  return { plan, stripePriceId, cycle }
}

/** Descobre plano e período a partir do preço que a Stripe mandou no webhook. */
export async function findPlanByStripePrice(prisma: PrismaClient, stripePriceId: string) {
  const price = await prisma.planPrice.findUnique({ where: { stripePriceId }, include: { plan: true } })
  if (price) return { plan: price.plan, cycle: price.cycle as Cycle }
  const legacy = await prisma.plan.findFirst({ where: { stripePriceId } })
  return legacy ? { plan: legacy, cycle: 'MONTHLY' as Cycle } : null
}

/** Valor mensal equivalente de uma assinatura (para o MRR do superadmin). */
export function monthlyEquivalent(plan: { monthlyPrice: unknown; prices?: { cycle: string; monthlyPrice: unknown }[] }, cycle: string | null | undefined): number {
  const c = parseCycle(cycle ?? 'MONTHLY')
  const p = plan.prices?.find((x) => x.cycle === c)
  return Number(p?.monthlyPrice ?? plan.monthlyPrice ?? 0)
}
