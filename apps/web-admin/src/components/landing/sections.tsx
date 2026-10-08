'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Check, MessageCircle, Minus } from 'lucide-react'
import { CONTACT, PLANS } from './data'

type Navigate = (page: 'home' | 'planos' | 'simulador', section?: string) => void

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brl2 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* ───────────────────────────── Hero ───────────────────────────── */

export function Hero({ onNavigate }: { onNavigate: Navigate }) {
  return (
    <section className="relative overflow-hidden border-b border-lp-line">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 pb-16 pt-12 sm:px-8 md:pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-24">
        <div className="lg:col-span-7 lg:pr-6">
          <p className="text-sm font-medium text-lp-muted">
            Cardápio digital + pedidos no WhatsApp para lanchonetes, pizzarias e açaí
          </p>

          <h1 className="font-display mt-5 text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.02em] text-lp-ink sm:text-6xl lg:text-[4.25rem]">
            Seu delivery, sem entregar <span className="italic text-lp-brand">27%</span> de cada pedido.
          </h1>

          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-lp-muted">
            Cardápio com o seu link, atendente automático no WhatsApp e tela de cozinha.
            Você paga uma mensalidade fixa — a partir de <strong className="font-semibold text-lp-ink">R$ 0</strong> — e
            nenhum centavo de comissão por pedido.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/register?plan=gratis"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-lp-brand px-6 text-[0.9375rem] font-semibold text-white transition-colors duration-200 hover:bg-lp-brand-deep"
            >
              Criar meu cardápio grátis
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <button
              type="button"
              onClick={() => onNavigate('simulador')}
              className="inline-flex h-12 items-center justify-center rounded-md border border-lp-ink/30 px-5 text-[0.9375rem] font-medium text-lp-ink transition-colors duration-200 hover:border-lp-ink/40 hover:bg-white/60"
            >
              Testar como se fosse um cliente
            </button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[0.8125rem] text-lp-muted">
            <li>Plano Starter grátis</li>
            <li>Sem fidelidade</li>
            <li>Cancela pelo próprio painel</li>
          </ul>
        </div>

        <div className="relative lg:col-span-5 lg:-mr-4 lg:mt-6">
          <OrderTicket />
        </div>
      </div>
    </section>
  )
}

/** Comanda impressa: mostra o produto (pedido real com observação) e o argumento (comissão 0,00). */
function OrderTicket() {
  const Row = ({ l, r, sub, strong }: { l: string; r?: string; sub?: boolean; strong?: boolean }) => (
    <div className={`flex items-baseline gap-2 ${sub ? 'pl-4 text-lp-muted' : ''} ${strong ? 'font-semibold text-lp-ink' : ''}`}>
      <span className="shrink-0">{l}</span>
      <span className="mb-1 flex-1 border-b border-dotted border-lp-ink/25" />
      {r && <span className="shrink-0 tabular-nums">{r}</span>}
    </div>
  )
  return (
    <div className="relative mx-auto w-full max-w-[22rem] lg:max-w-none">
      {/* aviso do WhatsApp sobreposto, deslocado de propósito */}
      <div className="absolute -left-3 -top-5 z-10 flex max-w-[15rem] items-start gap-2 rounded-lg bg-[#e7f7ec] px-3 py-2 text-[0.8125rem] leading-snug text-[#14532d] shadow-sm ring-1 ring-[#15803d]/15 sm:-left-8">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-lp-whats" />
        <span><strong>Pedido #128 recebido.</strong> Previsão de entrega: 40 min.</span>
      </div>

      <div className="perforated rotate-[1.5deg] rounded-t-sm bg-white px-6 pb-8 pt-9 font-mono text-[0.8125rem] leading-7 text-lp-ink shadow-[0_18px_40px_-24px_rgba(28,25,23,0.45)] transition-transform duration-300 hover:rotate-0">
        <div className="flex justify-between text-[0.75rem] uppercase tracking-wide text-lp-muted">
          <span>Bar do Zé · delivery</span>
          <span>19:42</span>
        </div>
        <p className="mt-1 text-base font-semibold">PEDIDO #0128</p>
        <div className="my-3 border-t border-dashed border-lp-ink/30" />
        <Row l="1x Beef 1" r="30,00" />
        <p className="pl-4 font-semibold text-lp-brand">obs: sem bacon</p>
        <Row l="1x Pizza M Frango" r="65,00" />
        <Row l="+ borda catupiry" r="5,00" sub />
        <Row l="Entrega · Centro" r="5,00" />
        <div className="my-3 border-t border-dashed border-lp-ink/30" />
        <Row l="TOTAL" r="R$ 105,00" strong />
        <div className="mt-1 flex items-baseline gap-2 font-semibold text-lp-brand">
          <span>COMISSÃO</span>
          <span className="mb-1 flex-1 border-b border-dotted border-lp-brand/40" />
          <span className="tabular-nums">R$ 0,00</span>
        </div>
        <p className="mt-4 text-center text-[0.75rem] uppercase tracking-[0.2em] text-lp-muted">pix · pago</p>
      </div>
    </div>
  )
}

/* ─────────────────────── Calculadora de comissão ─────────────────────── */

const RATES = [12, 20, 27] as const

export function CommissionCalculator({ onNavigate }: { onNavigate: Navigate }) {
  const [revenue, setRevenue] = useState(15000)
  const [rate, setRate] = useState<(typeof RATES)[number]>(20)
  const proMonthly = 79

  const { lostMonth, lostYear, savedYear } = useMemo(() => {
    const lostMonth = revenue * (rate / 100)
    return { lostMonth, lostYear: lostMonth * 12, savedYear: (lostMonth - proMonthly) * 12 }
  }, [revenue, rate])

  return (
    <section id="conta" className="section border-b border-lp-line bg-lp-cream/60 scroll-mt-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.015em] sm:text-5xl">
            Faça a conta do seu mês.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-lp-muted">
            Marketplaces ficam com 12% a 27% de cada pedido. Na ByLink a mensalidade é fixa: o que o cliente paga
            é seu.
          </p>

          <div className="mt-10 space-y-8">
            <label className="block">
              <span className="flex items-baseline justify-between text-sm font-medium">
                Quanto você vende por delivery no mês
                <span className="font-mono text-base font-semibold tabular-nums">{brl(revenue)}</span>
              </span>
              <input
                type="range"
                min={2000}
                max={60000}
                step={1000}
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value))}
                className="mt-4 h-6 w-full cursor-pointer accent-[var(--lp-brand)]"
                aria-label="Faturamento mensal com delivery"
              />
              <span className="mt-1 flex justify-between font-mono text-xs text-lp-muted">
                <span>R$ 2 mil</span><span>R$ 60 mil</span>
              </span>
            </label>

            <fieldset>
              <legend className="text-sm font-medium">Comissão que você paga hoje</legend>
              <div className="mt-3 inline-flex rounded-md border border-lp-ink/15 bg-white p-1">
                {RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRate(r)}
                    aria-pressed={rate === r}
                    className={`h-10 min-w-[4.5rem] rounded px-3 font-mono text-sm font-semibold transition-colors duration-150 ${
                      rate === r ? 'bg-lp-ink text-white' : 'text-lp-muted hover:text-lp-ink'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {/* Resultado: o número dominante da seção */}
        <div className="lg:col-span-6 lg:col-start-7" aria-live="polite">
          <div className="border-l-4 border-lp-brand bg-white px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-sm font-medium text-lp-muted">No marketplace, por ano, ficam com a plataforma</p>
            <p className="font-display mt-2 text-5xl font-semibold tabular-nums tracking-[-0.02em] text-lp-brand sm:text-6xl lg:text-7xl">
              {brl(lostYear)}
            </p>
            <p className="mt-2 font-mono text-sm text-lp-muted">{brl(lostMonth)} por mês</p>

            <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-lp-line pt-6 text-sm">
              <div>
                <dt className="text-lp-muted">Na ByLink (Plano PRO)</dt>
                <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">R$ {brl2(proMonthly)}/mês</dd>
              </div>
              <div>
                <dt className="text-lp-muted">Fica no seu caixa no ano</dt>
                <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-lp-whats">
                  {savedYear > 0 ? brl(savedYear) : 'R$ 0'}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => onNavigate('planos')}
              className="group mt-6 inline-flex items-center gap-2 py-2 text-[0.9375rem] font-semibold text-lp-ink underline decoration-lp-brand decoration-2 underline-offset-[6px] transition-colors duration-200 hover:text-lp-brand"
            >
              Ver os planos e valores
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-lp-muted">
            Simulação. Usa só o percentual de comissão; taxas de pagamento e de entrega não entram na conta.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────────── Como funciona ───────────────────────────── */

const STEPS = [
  {
    title: 'Monte o cardápio',
    text: 'Fotos, preços e adicionais — inclusive os obrigatórios, como o sabor da pizza. O cliente ainda pode pedir "sem cebola". Dá para fazer tudo pelo celular.',
  },
  {
    title: 'Divulgue o seu link',
    text: 'bylink.shop/sua-loja na bio do Instagram, no status do WhatsApp e em QR Code na mesa. O cliente pede sem baixar aplicativo.',
  },
  {
    title: 'Receba e despache',
    text: 'O pedido aparece no painel e na tela da cozinha, com aviso sonoro. Você confirma, imprime a comanda e escolhe o entregador.',
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="section border-b border-lp-line scroll-mt-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.015em] sm:text-5xl lg:sticky lg:top-24">
            Do cadastro ao primeiro pedido.
          </h2>
        </div>
        <ol className="lg:col-span-7 lg:col-start-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-lp-line py-8 first:border-t-0 first:pt-0 sm:grid-cols-[5rem_1fr]">
              <span className="font-display text-5xl font-semibold leading-none text-lp-brand sm:text-6xl">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-lg leading-relaxed text-lp-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ───────────────────────────── Comparativo ───────────────────────────── */

const COMPARE: { item: string; them: string; us: string }[] = [
  { item: 'Comissão por pedido', them: '12% a 27%', us: 'R$ 0 — mensalidade fixa' },
  { item: 'Contato do cliente', them: 'Fica com a plataforma', us: 'Telefone e histórico são seus' },
  { item: 'Pagamento por Pix', them: 'Repasse em dias, com taxa', us: 'Na sua conta (Asaas ou Mercado Pago)' },
  { item: 'Trazer o cliente de volta', them: 'Você disputa espaço com concorrentes', us: 'Cupons, cashback e mensagens no WhatsApp' },
  { item: 'Sua vitrine', them: 'Lado a lado com outras lojas', us: 'Página só sua, com sua marca' },
]

export function Comparison() {
  return (
    <section id="comparativo" className="section border-b border-lp-line scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.015em] sm:text-5xl lg:col-span-6">
            Quem fica com o seu cliente?
          </h2>
          <p className="max-w-md leading-relaxed text-lp-muted lg:col-span-5 lg:col-start-8 lg:pt-3">
            No marketplace, quem compra é cliente da plataforma. No seu link, ele é seu — e volta a comprar com você.
          </p>
        </div>

        <div className="mt-12 overflow-hidden border-y border-lp-ink/80">
          <div className="hidden grid-cols-12 gap-4 border-b border-lp-ink/80 py-3 font-mono text-xs uppercase tracking-wider text-lp-muted sm:grid">
            <span className="col-span-4">&nbsp;</span>
            <span className="col-span-4">Marketplace</span>
            <span className="col-span-4 text-lp-brand">ByLink</span>
          </div>
          {COMPARE.map((row) => (
            <div key={row.item} className="grid grid-cols-1 gap-2 border-b border-lp-line py-5 last:border-b-0 sm:grid-cols-12 sm:gap-4">
              <span className="font-semibold sm:col-span-4">{row.item}</span>
              <span className="flex items-start gap-2 text-lp-muted sm:col-span-4">
                <Minus className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                <span><span className="sm:hidden font-mono text-xs uppercase">Marketplace: </span>{row.them}</span>
              </span>
              <span className="flex items-start gap-2 font-medium sm:col-span-4">
                <Check className="mt-1 h-4 w-4 shrink-0 text-lp-brand" aria-hidden />
                <span><span className="sm:hidden font-mono text-xs uppercase text-lp-brand">ByLink: </span>{row.us}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────────── Planos (resumo) ───────────────────────────── */

export function PlansTeaser({ onNavigate }: { onNavigate: Navigate }) {
  return (
    <section id="planos" className="section border-b border-lp-line bg-lp-cream/60 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.015em] sm:text-5xl">
            Preço fechado. <br className="hidden sm:block" />Sem surpresa no fim do mês.
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('planos')}
            className="group inline-flex items-center gap-2 self-start font-semibold underline decoration-lp-brand decoration-2 underline-offset-[6px] transition-colors duration-200 hover:text-lp-brand sm:self-auto"
          >
            Comparar todos os recursos
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-lp-line bg-lp-line md:grid-cols-[1fr_1.25fr_1fr]">
          {PLANS.map((plan) => {
            const slug = plan.name === 'Plano PRO' ? 'pro' : plan.name === 'Plano Elite' ? 'elite' : 'gratis'
            const featured = !!plan.featured
            return (
              <div key={plan.name} className={`flex flex-col p-7 sm:p-8 ${featured ? 'bg-lp-ink text-white' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name.replace('Plano ', '')}</h3>
                  {featured && <span className="font-mono text-xs uppercase tracking-wider text-[#fdba74]">mais escolhido</span>}
                </div>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-semibold tracking-[-0.02em]">{plan.price}</span>
                  <span className={`text-sm ${featured ? 'text-white/70' : 'text-lp-muted'}`}>{plan.billing}</span>
                </p>
                <p className={`mt-3 text-sm leading-relaxed ${featured ? 'text-white/75' : 'text-lp-muted'}`}>{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? 'text-[#fdba74]' : 'text-lp-brand'}`} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={`/register?plan=${slug}`}
                  className={`mt-8 inline-flex h-11 items-center justify-center rounded-md text-sm font-semibold transition-colors duration-200 ${
                    featured ? 'bg-lp-brand text-white hover:bg-[#ea580c]' : 'border border-lp-ink/20 hover:border-lp-ink/50'
                  }`}
                >
                  {plan.price === 'R$ 0' ? 'Começar grátis' : `Assinar ${plan.name.replace('Plano ', '')}`}
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────────── CTA final + rodapé ───────────────────────────── */

export function FinalCta() {
  return (
    <section className="bg-lp-ink text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-20 sm:px-8 md:py-24 lg:grid-cols-12 lg:items-end">
        <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.015em] sm:text-6xl lg:col-span-8">
          O próximo pedido pode chegar <span className="italic text-[#fdba74]">sem comissão</span>.
        </h2>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <a
            href="/register?plan=gratis"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-lp-brand px-6 font-semibold text-white transition-colors duration-200 hover:bg-[#ea580c]"
          >
            Criar meu cardápio grátis
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
          <a
            href={CONTACT.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 py-2 text-sm text-white/75 transition-colors duration-200 hover:text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Prefere conversar? WhatsApp {CONTACT.whatsappDisplay}
          </a>
        </div>
      </div>
    </section>
  )
}

export function SiteFooter({ onNavigate }: { onNavigate: Navigate }) {
  const link = 'py-1.5 text-left text-lp-muted transition-colors duration-150 hover:text-lp-ink'
  return (
    <footer className="border-t border-lp-line bg-lp-paper">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-12 text-sm sm:px-8 md:grid-cols-12">
        <div className="col-span-2 md:col-span-5">
          <p className="font-display text-2xl font-semibold">ByLink</p>
          <p className="mt-3 max-w-xs leading-relaxed text-lp-muted">
            Cardápio digital e pedidos no WhatsApp para quem vende comida — sem comissão por pedido.
          </p>
        </div>
        <nav className="flex flex-col md:col-span-3 md:col-start-7" aria-label="Produto">
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-lp-muted">Produto</p>
          <button type="button" onClick={() => onNavigate('home', 'como-funciona')} className={link}>Como funciona</button>
          <button type="button" onClick={() => onNavigate('home', 'funcionalidades')} className={link}>O que vem no sistema</button>
          <button type="button" onClick={() => onNavigate('planos')} className={link}>Planos</button>
          <button type="button" onClick={() => onNavigate('simulador')} className={link}>Simulador</button>
        </nav>
        <div className="flex flex-col md:col-span-3">
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-lp-muted">Contato</p>
          <a href={CONTACT.whatsappLink} target="_blank" rel="noopener noreferrer" className={link}>
            WhatsApp {CONTACT.whatsappDisplay}
          </a>
          <a href="/login" className={link}>Entrar no painel</a>
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-lp-line px-5 py-6 font-mono text-xs text-lp-muted sm:px-8">
        © {new Date().getFullYear()} ByLink
      </div>
    </footer>
  )
}
