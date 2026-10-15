'use client'

import { useMemo, useState } from 'react'
import { useCashRegisterHistory, useCashRegisterDetail } from '@/hooks/use-cash-register'
import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Header } from '@/components/layout/header'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@delivery/ui'
import {
  Unlock, Lock, ChevronRight, X, ArrowDownCircle, ArrowUpCircle,
  Printer, TrendingUp, TrendingDown, Download, ShoppingBag, Receipt, Clock, Ban, Bike, Tag,
} from 'lucide-react'

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Dinheiro', PIX: 'PIX', CREDIT_CARD: 'Crédito', DEBIT_CARD: 'Débito', PICPAY: 'PicPay', OTHER: 'Não informado',
}
const TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'Entrega', PICKUP: 'Retirada', TABLE: 'Mesa', COUNTER: 'Balcão',
}

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

// ─── Período ──────────────────────────────────────────────────────────────────
const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
const shift = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d }

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'lastMonth' | 'custom'
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Hoje' }, { key: 'yesterday', label: 'Ontem' }, { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' }, { key: 'month', label: 'Este mês' }, { key: 'lastMonth', label: 'Mês passado' },
  { key: 'custom', label: 'Escolher datas' },
]
function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date()
  switch (p) {
    case 'today': return { from: ymd(now), to: ymd(now) }
    case 'yesterday': return { from: ymd(shift(-1)), to: ymd(shift(-1)) }
    case '7d': return { from: ymd(shift(-6)), to: ymd(now) }
    case 'month': return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) }
    case 'lastMonth': return {
      from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
    }
    default: return { from: ymd(shift(-29)), to: ymd(now) }
  }
}

function usePeriod(initial: Preset = '30d') {
  const [preset, setPreset] = useState<Preset>(initial)
  const [custom, setCustom] = useState(presetRange('30d'))
  const range = preset === 'custom' ? custom : presetRange(preset)
  return { preset, setPreset, custom, setCustom, ...range }
}

function PeriodPicker({ period }: { period: ReturnType<typeof usePeriod> }) {
  const { preset, setPreset, custom, setCustom } = period
  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRESETS.map(({ key, label }) => (
          <button key={key} onClick={() => setPreset(key)}
            className={cn('inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-xs font-medium transition',
              preset === key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
            {label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="text-muted-foreground">De</label>
          <input type="date" value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))}
            className="h-10 rounded-xl border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <label className="text-muted-foreground">até</label>
          <input type="date" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))}
            className="h-10 rounded-xl border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      )}
    </div>
  )
}

const dayLabel = (d: string, pattern = 'dd/MM/yyyy') => format(new Date(d + 'T12:00:00'), pattern, { locale: ptBR })

// Planilha que abre direto no Excel em português (separador ; e vírgula decimal)
function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

function Growth({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">sem comparação</span>
  const up = value >= 0
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', up ? 'text-green-600' : 'text-red-600')}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{value.toFixed(0)}% <span className="font-normal text-muted-foreground">vs. período anterior</span>
    </span>
  )
}

// ─── Print cash register close report ────────────────────────────────────────
function printRegister(data: any, storeName?: string) {
  const diff = data.closingBalance != null && data.expectedBalance != null
    ? Number(data.closingBalance) - Number(data.expectedBalance)
    : null

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Fechamento de Caixa</title>
<style>
  body{font-family:monospace;font-size:12px;padding:20px;max-width:380px;margin:0 auto}
  h2{text-align:center;font-size:16px;margin-bottom:4px}
  .center{text-align:center}
  .sep{border:none;border-top:1px dashed #000;margin:8px 0}
  .row{display:flex;justify-content:space-between;margin:3px 0}
  .bold{font-weight:bold}
  .red{color:#c00}
  .green{color:#080}
</style></head><body>
<h2>${esc(storeName ?? "Fechamento de Caixa")}</h2>
<p class="center" style="font-size:10px;color:#666">
  ${format(new Date(data.openedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
  ${data.closedAt ? ` → ${format(new Date(data.closedAt), 'HH:mm', { locale: ptBR })}` : ''}
</p>
<hr class="sep"/>
<div class="row"><span>Fundo inicial</span><span>${fmt(Number(data.openingBalance))}</span></div>
<div class="row"><span>Vendas totais</span><span class="green">${fmt(Number(data.totalRevenue ?? 0))}</span></div>
<div class="row"><span>Suprimentos</span><span class="green">+ ${fmt(Number(data.deposits ?? 0))}</span></div>
<div class="row"><span>Sangrias</span><span class="red">- ${fmt(Number(data.withdrawals ?? 0))}</span></div>
<hr class="sep"/>
${data.byPaymentMethod?.length ? `
<p class="bold" style="margin:4px 0">Por forma de pagamento:</p>
${data.byPaymentMethod.map((m: any) =>
  `<div class="row"><span>${PAYMENT_LABELS[m.paymentMethod] ?? m.paymentMethod}</span><span>${fmt(Number(m._sum?.total ?? 0))}</span></div>`
).join('')}
<hr class="sep"/>
` : ''}
${data.expectedBalance != null ? `<div class="row bold"><span>Saldo esperado</span><span>${fmt(Number(data.expectedBalance))}</span></div>` : ''}
${data.closingBalance != null ? `<div class="row"><span>Contado no fechamento</span><span>${fmt(Number(data.closingBalance))}</span></div>` : ''}
${diff !== null ? `<div class="row bold ${diff < 0 ? 'red' : diff > 0 ? 'green' : ''}">
  <span>${diff >= 0 ? 'Sobra' : 'Falta'}</span><span>${fmt(Math.abs(diff))}</span>
</div>` : ''}
${data.notes ? `<hr class="sep"/><p>Obs: ${esc(data.notes)}</p>` : ''}
<hr class="sep"/>
<p class="center" style="font-size:10px;color:#666">Impresso em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
</body></html>`

  const win = window.open('', '_blank', 'width=420,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
  win.close()
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useCashRegisterDetail(id)
  const { store } = useAuthStore()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-foreground">Detalhes do Caixa</h2>
          <div className="flex items-center gap-2">
            {data && (
              <button
                onClick={() => printRegister(data, store?.name)}
                className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {isLoading
          ? <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
          : data && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Info */}
              <div className="flex items-center gap-3">
                <div className={cn('h-8 w-8 rounded-full flex items-center justify-center', data.status === 'OPEN' ? 'bg-green-100' : 'bg-muted')}>
                  {data.status === 'OPEN' ? <Unlock className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {format(new Date(data.openedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {data.closedAt && ` → ${format(new Date(data.closedAt), "HH:mm", { locale: ptBR })}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{data.status === 'OPEN' ? 'Em aberto' : 'Fechado'}</p>
                </div>
              </div>

              {/* Resumo financeiro */}
              <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Fundo inicial</span><span>{fmt(Number(data.openingBalance))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total de pedidos</span><span className="text-green-600">{fmt(Number(data.totalRevenue ?? 0))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Suprimentos</span><span className="text-green-600">+ {fmt(Number(data.deposits ?? 0))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sangrias</span><span className="text-red-600">- {fmt(Number(data.withdrawals ?? 0))}</span></div>
                {data.expectedBalance != null && (
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Saldo esperado</span><span>{fmt(Number(data.expectedBalance))}</span>
                  </div>
                )}
                {data.closingBalance != null && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Contado no fechamento</span><span>{fmt(Number(data.closingBalance))}</span></div>
                    {data.expectedBalance != null && (() => {
                      const diff = Number(data.closingBalance) - Number(data.expectedBalance)
                      return (
                        <div className={cn('flex justify-between font-medium', diff === 0 ? 'text-green-600' : diff > 0 ? 'text-blue-600' : 'text-red-600')}>
                          <span>{diff >= 0 ? 'Sobra' : 'Falta'}</span>
                          <span>{fmt(Math.abs(diff))}</span>
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>

              {/* Por método de pagamento */}
              {data.byPaymentMethod?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Por Forma de Pagamento</p>
                  <div className="space-y-1.5">
                    {data.byPaymentMethod.map((m: any) => (
                      <div key={m.paymentMethod} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-foreground">{PAYMENT_LABELS[m.paymentMethod] ?? m.paymentMethod}</span>
                        <span className="text-muted-foreground">{m._count} pedidos · {fmt(Number(m._sum?.total ?? 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Movimentações manuais */}
              {data.transactions?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Movimentações Manuais</p>
                  <div className="space-y-1.5">
                    {data.transactions.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg px-3 py-2">
                        {t.type === 'WITHDRAWAL'
                          ? <ArrowDownCircle className="h-4 w-4 text-red-500 shrink-0" />
                          : <ArrowUpCircle className="h-4 w-4 text-green-500 shrink-0" />
                        }
                        <span className="flex-1 text-foreground">{t.description}</span>
                        <span className={t.type === 'WITHDRAWAL' ? 'text-red-600' : 'text-green-600'}>
                          {t.type === 'WITHDRAWAL' ? '-' : '+'} {fmt(Number(t.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.notes && (
                <div className="bg-muted/50 rounded-xl p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Obs: </span>{data.notes}
                </div>
              )}
            </div>
          )
        }
      </div>
    </div>
  )
}

// ─── Visão geral ──────────────────────────────────────────────────────────────
interface Financial {
  from: string; to: string; prevFrom: string; prevTo: string
  revenue: number; ordersCount: number; avgTicket: number
  subtotal: number; deliveryFees: number; discounts: number
  prevRevenue: number; prevOrdersCount: number
  revenueGrowth: number | null; ordersGrowth: number | null
  cancelled: { count: number; total: number }
  unpaid: { count: number; total: number }
  byPayment: { method: string; count: number; total: number }[]
  byType: { type: string; count: number; total: number }[]
  daily: { date: string; revenue: number; orders: number }[]
  cash: { deposits: number; withdrawals: number }
}

function Bars({ items, total }: { items: { label: string; count: number; value: number }[]; total: number }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">Sem vendas no período.</p>
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const pct = total > 0 ? (it.value / total) * 100 : 0
        return (
          <div key={it.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{it.label} <span className="text-xs font-normal text-muted-foreground">· {it.count} pedido{it.count !== 1 ? 's' : ''}</span></span>
              <span className="whitespace-nowrap font-semibold">{fmt(it.value)} <span className="text-xs font-normal text-muted-foreground">{pct.toFixed(0)}%</span></span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OverviewTab() {
  const period = usePeriod('30d')
  const [type, setType] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const { data, isLoading } = useQuery<Financial>({
    queryKey: ['financial', period.from, period.to, type, paymentMethod],
    queryFn: () => api.get('/reports/financial', { params: { from: period.from, to: period.to, type: type || undefined, paymentMethod: paymentMethod || undefined } }).then((r) => r.data.data),
  })

  const maxDay = Math.max(1, ...(data?.daily.map((d) => d.revenue) ?? [0]))
  const showDaily = (data?.daily.length ?? 0) > 1

  function exportar() {
    if (!data) return
    downloadCsv(`financeiro-${data.from}-a-${data.to}.csv`, ['Data', 'Pedidos', 'Faturamento (R$)'],
      data.daily.map((d) => [dayLabel(d.date), String(d.orders), d.revenue]))
  }

  const cards = data ? [
    { label: 'Faturamento', value: fmt(data.revenue), icon: TrendingUp, cor: 'bg-green-100 text-green-700', extra: <Growth value={data.revenueGrowth} /> },
    { label: 'Pedidos', value: String(data.ordersCount), icon: ShoppingBag, cor: 'bg-blue-100 text-blue-700', extra: <Growth value={data.ordersGrowth} /> },
    { label: 'Ticket médio', value: fmt(data.avgTicket), icon: Receipt, cor: 'bg-purple-100 text-purple-700', extra: <span className="text-xs text-muted-foreground">valor médio por pedido</span> },
    { label: 'A receber', value: fmt(data.unpaid.total), icon: Clock, cor: 'bg-orange-100 text-orange-700', extra: <span className="text-xs text-muted-foreground">{data.unpaid.count} pedido{data.unpaid.count !== 1 ? 's' : ''} ainda não marcado{data.unpaid.count !== 1 ? 's' : ''} como pago{data.unpaid.count !== 1 ? 's' : ''}</span> },
  ] : []

  const mini = data ? [
    { label: 'Taxas de entrega', value: fmt(data.deliveryFees), icon: Bike },
    { label: 'Descontos dados', value: `- ${fmt(data.discounts)}`, icon: Tag },
    { label: `Cancelados (${data.cancelled.count})`, value: fmt(data.cancelled.total), icon: Ban },
    { label: 'Suprimentos / Sangrias', value: `+${fmt(data.cash.deposits)} / -${fmt(data.cash.withdrawals)}`, icon: ArrowUpCircle },
  ] : []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PeriodPicker period={period} />
        <div className="flex flex-wrap gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Canal"
            className="h-10 rounded-xl border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos os canais</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} aria-label="Forma de pagamento"
            className="h-10 rounded-xl border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todas as formas</option>
            {['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD'].map((k) => <option key={k} value={k}>{PAYMENT_LABELS[k]}</option>)}
          </select>
          <button onClick={exportar} disabled={!data}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-medium hover:bg-muted disabled:opacity-40 transition">
            <Download className="h-4 w-4" /> Planilha
          </button>
        </div>
      </div>

      {data && (
        <p className="text-xs text-muted-foreground">
          {data.from === data.to ? dayLabel(data.from) : `${dayLabel(data.from)} a ${dayLabel(data.to)}`}
          {' · '}comparado com {data.prevFrom === data.prevTo ? dayLabel(data.prevFrom) : `${dayLabel(data.prevFrom)} a ${dayLabel(data.prevTo)}`}
          {' · '}pedidos cancelados não entram no faturamento
        </p>
      )}

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {cards.map(({ label, value, icon: Icon, cor, extra }) => (
              <div key={label} className="min-w-0 rounded-2xl border bg-card p-3 sm:p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', cor)}><Icon className="h-4 w-4" /></span>
                  {label}
                </div>
                <p className="mt-2 break-words text-lg font-bold sm:text-2xl">{value}</p>
                <div className="mt-1">{extra}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {mini.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-3 rounded-2xl border bg-card px-3 py-3 sm:px-4">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="break-words text-sm font-semibold">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {showDaily && (
            <div className="rounded-2xl border bg-card p-4 sm:p-5">
              <p className="mb-4 text-sm font-semibold">Faturamento por dia</p>
              <div className="overflow-x-auto">
                <div className="flex h-44 items-end gap-1" style={{ minWidth: `${data.daily.length * 14}px` }}>
                  {data.daily.map((d) => (
                    <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end"
                      title={`${dayLabel(d.date)}: ${fmt(d.revenue)} · ${d.orders} pedido(s)`}>
                      <div className={cn('w-full rounded-t transition', d.revenue > 0 ? 'bg-primary/80 group-hover:bg-primary' : 'bg-muted')}
                        style={{ height: d.revenue > 0 ? `${Math.max(3, (d.revenue / maxDay) * 100)}%` : '2px' }} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground" style={{ minWidth: `${data.daily.length * 14}px` }}>
                  <span>{dayLabel(data.daily[0]!.date, 'dd/MM')}</span>
                  <span>Maior dia: {fmt(maxDay)}</span>
                  <span>{dayLabel(data.daily[data.daily.length - 1]!.date, 'dd/MM')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4 sm:p-5">
              <p className="mb-4 text-sm font-semibold">Por forma de pagamento</p>
              <Bars total={data.revenue} items={data.byPayment.map((p) => ({ label: PAYMENT_LABELS[p.method] ?? p.method, count: p.count, value: p.total }))} />
            </div>
            <div className="rounded-2xl border bg-card p-4 sm:p-5">
              <p className="mb-4 text-sm font-semibold">Por canal de venda</p>
              <Bars total={data.revenue} items={data.byType.map((t) => ({ label: TYPE_LABELS[t.type] ?? t.type, count: t.count, value: t.total }))} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Movimentações diárias ────────────────────────────────────────────────────
interface DayMovement {
  date: string
  ordersCount: number
  revenue: number
  byPayment: Record<string, number>
  deposits: number
  withdrawals: number
  net: number
}

function DailyMovementsTab() {
  const period = usePeriod('30d')
  const [hideEmpty, setHideEmpty] = useState(true)

  const { data, isLoading } = useQuery<{ data: DayMovement[] }>({
    queryKey: ['daily-movements', period.from, period.to],
    queryFn: () => api.get(`/reports/daily-movements?from=${period.from}&to=${period.to}`).then(r => r.data),
  })

  const all = data?.data ?? []
  const days = hideEmpty ? all.filter((d) => d.ordersCount > 0 || d.deposits > 0 || d.withdrawals > 0) : all
  const totals = all.reduce(
    (acc, d) => ({ revenue: acc.revenue + d.revenue, deposits: acc.deposits + d.deposits, withdrawals: acc.withdrawals + d.withdrawals, net: acc.net + d.net, orders: acc.orders + d.ordersCount }),
    { revenue: 0, deposits: 0, withdrawals: 0, net: 0, orders: 0 }
  )
  const methods = useMemo(() => [...new Set(all.flatMap((d) => Object.keys(d.byPayment)))], [all])

  function exportar() {
    downloadCsv(`movimentacoes-${period.from}-a-${period.to}.csv`,
      ['Data', 'Pedidos', 'Receita (R$)', ...methods.map((m) => `${PAYMENT_LABELS[m] ?? m} (R$)`), 'Suprimentos (R$)', 'Sangrias (R$)', 'Saldo (R$)'],
      [...all].reverse().map((d) => [dayLabel(d.date), String(d.ordersCount), d.revenue, ...methods.map((m) => d.byPayment[m] ?? 0), d.deposits, d.withdrawals, d.net]))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PeriodPicker period={period} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border bg-card px-3 text-sm">
            <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            Esconder dias sem movimento
          </label>
          <button onClick={exportar} disabled={all.length === 0}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-medium hover:bg-muted disabled:opacity-40 transition">
            <Download className="h-4 w-4" /> Planilha
          </button>
        </div>
      </div>

      {!isLoading && all.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Receita', value: fmt(totals.revenue), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Suprimentos', value: fmt(totals.deposits), icon: ArrowUpCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Sangrias', value: fmt(totals.withdrawals), icon: ArrowDownCircle, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Saldo líquido', value: fmt(totals.net), icon: totals.net >= 0 ? TrendingUp : TrendingDown, color: totals.net >= 0 ? 'text-green-600' : 'text-red-600', bg: totals.net >= 0 ? 'bg-green-50' : 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border bg-card p-3 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold text-sm break-words">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pedidos</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receita</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Suprimentos</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Sangrias</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo Líquido</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && days.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma movimentação no período.</td></tr>
            )}
            {days.map((day) => {
              const hasActivity = day.ordersCount > 0 || day.deposits > 0 || day.withdrawals > 0
              const pays = Object.entries(day.byPayment).sort((a, b) => b[1] - a[1])
              return (
                <tr key={day.date} className={cn('border-b last:border-0 transition-colors', hasActivity ? 'hover:bg-muted/20' : 'opacity-40')}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{dayLabel(day.date)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{dayLabel(day.date, 'EEEE')}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{day.ordersCount}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-medium text-green-600">{day.revenue > 0 ? fmt(day.revenue) : '—'}</p>
                    {pays.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {pays.map(([m, v]) => `${PAYMENT_LABELS[m] ?? m} ${fmt(v)}`).join(' · ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600">{day.deposits > 0 ? `+ ${fmt(day.deposits)}` : '—'}</td>
                  <td className="px-4 py-3 text-right text-red-600">{day.withdrawals > 0 ? `- ${fmt(day.withdrawals)}` : '—'}</td>
                  <td className={cn('px-4 py-3 text-right font-semibold', day.net > 0 ? 'text-green-600' : day.net < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                    {hasActivity ? fmt(day.net) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {!isLoading && days.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/40 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{totals.orders}</td>
                <td className="px-4 py-3 text-right text-green-600">{fmt(totals.revenue)}</td>
                <td className="px-4 py-3 text-right text-blue-600">+ {fmt(totals.deposits)}</td>
                <td className="px-4 py-3 text-right text-red-600">- {fmt(totals.withdrawals)}</td>
                <td className={cn('px-4 py-3 text-right', totals.net >= 0 ? 'text-green-600' : 'text-red-600')}>{fmt(totals.net)}</td>
              </tr>
            </tfoot>
          )}
        </table></div>
      </div>
    </div>
  )
}

// ─── Histórico de caixas ──────────────────────────────────────────────────────
function RegistersTab({ onOpen }: { onOpen: (id: string) => void }) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, isLoading } = useCashRegisterHistory(page, { from, to, status })
  const registers = data?.data ?? []
  const reset = (fn: () => void) => { fn(); setPage(1) }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select value={status} onChange={(e) => reset(() => setStatus(e.target.value))} aria-label="Situação do caixa"
          className="h-10 rounded-xl border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Abertos e fechados</option>
          <option value="OPEN">Só abertos</option>
          <option value="CLOSED">Só fechados</option>
        </select>
        <label className="text-muted-foreground">De</label>
        <input type="date" value={from} max={to || undefined} onChange={(e) => reset(() => setFrom(e.target.value))}
          className="h-10 rounded-xl border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <label className="text-muted-foreground">até</label>
        <input type="date" value={to} min={from || undefined} onChange={(e) => reset(() => setTo(e.target.value))}
          className="h-10 rounded-xl border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        {(status || from || to) && (
          <button onClick={() => reset(() => { setStatus(''); setFrom(''); setTo('') })}
            className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" /> Limpar
          </button>
        )}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Abertura</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fechamento</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fundo inicial</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pedidos</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receita</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Sobra / Falta</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && registers.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                {status || from || to ? 'Nenhum caixa com esses filtros.' : 'Nenhum caixa registrado. Abra o caixa em Caixa / PDV.'}
              </td></tr>
            )}
            {registers.map((reg) => {
              const diff = reg.closingBalance != null && reg.expectedBalance != null
                ? Number(reg.closingBalance) - Number(reg.expectedBalance)
                : null
              return (
                <tr key={reg.id} onClick={() => onOpen(reg.id)} className="cursor-pointer border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{format(new Date(reg.openedAt), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(reg.openedAt), 'HH:mm', { locale: ptBR })}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {reg.closedAt ? format(new Date(reg.closedAt), "dd/MM 'às' HH:mm", { locale: ptBR }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(Number(reg.openingBalance))}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{reg.ordersCount ?? 0}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{fmt(Number(reg.totalRevenue ?? 0))}</td>
                  <td className={cn('px-4 py-3 text-right font-medium',
                    diff == null ? 'text-muted-foreground' : diff === 0 ? 'text-green-600' : diff > 0 ? 'text-blue-600' : 'text-red-600')}>
                    {diff == null ? '—' : diff === 0 ? 'Bateu' : `${diff > 0 ? 'Sobra' : 'Falta'} ${fmt(Math.abs(diff))}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                      reg.status === 'OPEN' ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground')}>
                      {reg.status === 'OPEN' ? <><Unlock className="h-3 w-3" />Aberto</> : <><Lock className="h-3 w-3" />Fechado</>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Detalhes <ChevronRight className="h-3 w-3" />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{data.total} caixas</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="min-h-9 px-3 border rounded-lg hover:bg-muted disabled:opacity-40">Anterior</button>
            <span className="px-3 py-1.5">{page} / {data.totalPages}</span>
            <button disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}
              className="min-h-9 px-3 border rounded-lg hover:bg-muted disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'movements' | 'registers'

export default function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [detailId, setDetailId] = useState<string | null>(null)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Financeiro" />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Financeiro</h2>
          <p className="text-sm text-muted-foreground mt-1">Quanto a loja vendeu, como recebeu e o que entrou e saiu do caixa</p>
        </div>

        <div className="flex overflow-x-auto border-b">
          {[
            { key: 'overview' as const, label: 'Visão geral' },
            { key: 'movements' as const, label: 'Movimentações diárias' },
            { key: 'registers' as const, label: 'Histórico de caixas' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn('shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'movements' && <DailyMovementsTab />}
        {tab === 'registers' && <RegistersTab onOpen={setDetailId} />}
      </main>

      {detailId && <DetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
