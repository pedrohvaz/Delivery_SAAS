// Períodos de contrato dos planos (pago adiantado; cancelar só impede a renovação).
export type Cycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'

export interface PlanPriceInfo {
  cycle: Cycle
  months: number
  label: string
  monthlyPrice: number
  total: number
  available: boolean // dá para assinar online agora (Stripe ligada e preço sincronizado)
}

export const CYCLE_OPTIONS: { cycle: Cycle; slug: string; label: string; months: number }[] = [
  { cycle: 'MONTHLY', slug: 'mensal', label: 'Mensal', months: 1 },
  { cycle: 'QUARTERLY', slug: 'trimestral', label: '3 meses', months: 3 },
  { cycle: 'SEMIANNUAL', slug: 'semestral', label: '6 meses', months: 6 },
  { cycle: 'ANNUAL', slug: 'anual', label: '1 ano', months: 12 },
]

export const CYCLE_NAME: Record<Cycle, string> = { MONTHLY: 'mensal', QUARTERLY: '3 meses', SEMIANNUAL: '6 meses', ANNUAL: '1 ano' }

/** Lê ?ciclo=anual (ou o enum). Sem valor: o padrão informado. */
export function cycleFromParam(value: string | null | undefined, fallback: Cycle = 'ANNUAL'): Cycle {
  if (!value) return fallback
  const v = value.trim().toLowerCase()
  const bySlug = CYCLE_OPTIONS.find((o) => o.slug === v)
  if (bySlug) return bySlug.cycle
  const byEnum = CYCLE_OPTIONS.find((o) => o.cycle === value.trim().toUpperCase())
  return byEnum?.cycle ?? fallback
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** "cobrado todo mês" ou "R$ 958,80 a cada 12 meses" */
export function chargeText(p: PlanPriceInfo) {
  if (p.months === 1) return 'cobrado todo mês'
  return `${brl(p.total)} pagos a cada ${p.months} meses`
}

/** Quanto economiza no período em relação a pagar o mensal (0 se não houver mensal). */
export function savings(prices: PlanPriceInfo[], p: PlanPriceInfo) {
  const monthly = prices.find((x) => x.cycle === 'MONTHLY')
  if (!monthly || p.months === 1) return 0
  return Math.max(0, Math.round((monthly.monthlyPrice * p.months - p.total) * 100) / 100)
}

/** Desconto em % sobre o mensal (arredondado). */
export function discountPct(prices: PlanPriceInfo[], p: PlanPriceInfo) {
  const monthly = prices.find((x) => x.cycle === 'MONTHLY')
  if (!monthly || p.months === 1 || !monthly.monthlyPrice) return 0
  return Math.round((1 - p.monthlyPrice / monthly.monthlyPrice) * 100)
}

/** Preço do período escolhido; se o plano não tiver esse período, cai no mensal. */
export function priceFor(prices: PlanPriceInfo[] | undefined, cycle: Cycle) {
  if (!prices?.length) return undefined
  return prices.find((p) => p.cycle === cycle) ?? prices.find((p) => p.cycle === 'MONTHLY') ?? prices[0]
}

export const SALES_WHATSAPP = '5531971327736'
export function whatsappLink(text: string) {
  return `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(text)}`
}
