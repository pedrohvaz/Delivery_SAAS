'use client'

import { useState } from 'react'
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
  Printer, TrendingUp, TrendingDown,
} from 'lucide-react'

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Dinheiro', PIX: 'PIX', CREDIT_CARD: 'Crédito', DEBIT_CARD: 'Débito', PICPAY: 'PicPay',
}

function fmt(n: number) { return `R$ ${n.toFixed(2).replace('.', ',')}` }

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
<h2>${storeName ?? 'Fechamento de Caixa'}</h2>
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
  <span>${diff >= 0 ? 'Sobra' : 'Falta'}</span><span>R$ ${Math.abs(diff).toFixed(2).replace('.', ',')}</span>
</div>` : ''}
${data.notes ? `<hr class="sep"/><p>Obs: ${data.notes}</p>` : ''}
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
                          <span>R$ {Math.abs(diff).toFixed(2).replace('.', ',')}</span>
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

// ─── Daily Movements Tab ──────────────────────────────────────────────────────
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
  const today = new Date().toISOString().split('T')[0]!
  const thirtyAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().split('T')[0]! })()
  const [from, setFrom] = useState(thirtyAgo)
  const [to, setTo] = useState(today)

  const { data, isLoading } = useQuery<{ data: DayMovement[] }>({
    queryKey: ['daily-movements', from, to],
    queryFn: () => api.get(`/reports/daily-movements?from=${from}&to=${to}`).then(r => r.data),
  })

  const days = data?.data ?? []
  const totals = days.reduce(
    (acc, d) => ({ revenue: acc.revenue + d.revenue, deposits: acc.deposits + d.deposits, withdrawals: acc.withdrawals + d.withdrawals, net: acc.net + d.net, orders: acc.orders + d.ordersCount }),
    { revenue: 0, deposits: 0, withdrawals: 0, net: 0, orders: 0 }
  )

  return (
    <div className="space-y-4">
      {/* Filtro de datas */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-muted-foreground font-medium">De</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="h-9 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card" />
          <label className="text-muted-foreground font-medium">Até</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="h-9 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card" />
        </div>
      </div>

      {/* Cards de totais */}
      {!isLoading && days.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Receita total', value: fmt(totals.revenue), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Suprimentos', value: fmt(totals.deposits), icon: ArrowUpCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Sangrias', value: fmt(totals.withdrawals), icon: ArrowDownCircle, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Saldo líquido', value: fmt(totals.net), icon: totals.net >= 0 ? TrendingUp : TrendingDown, color: totals.net >= 0 ? 'text-green-600' : 'text-red-600', bg: totals.net >= 0 ? 'bg-green-50' : 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border bg-card p-3 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold text-sm">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela de movimentações */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
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
              return (
                <tr key={day.date} className={cn('border-b last:border-0 transition-colors', hasActivity ? 'hover:bg-muted/20' : 'opacity-40')}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {format(new Date(day.date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(day.date + 'T12:00:00'), "EEEE", { locale: ptBR })}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{day.ordersCount}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{day.revenue > 0 ? fmt(day.revenue) : '—'}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{day.deposits > 0 ? `+ ${fmt(day.deposits)}` : '—'}</td>
                  <td className="px-4 py-3 text-right text-red-600">{day.withdrawals > 0 ? `- ${fmt(day.withdrawals)}` : '—'}</td>
                  <td className={cn('px-4 py-3 text-right font-semibold', day.net > 0 ? 'text-green-600' : day.net < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                    {hasActivity ? fmt(day.net) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const [tab, setTab] = useState<'registers' | 'movements'>('registers')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const { data, isLoading } = useCashRegisterHistory(page)

  const registers = data?.data ?? []

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Financeiro" />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Financeiro</h2>
          <p className="text-sm text-muted-foreground mt-1">Histórico de caixas e movimentações diárias</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b -mb-2">
          {[
            { key: 'registers' as const, label: 'Histórico de Caixas' },
            { key: 'movements' as const, label: 'Movimentações Diárias' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'movements' ? (
          <DailyMovementsTab />
        ) : (
          <>
            {/* Tabela de caixas */}
            <div className="bg-card border rounded-xl overflow-hidden">
              <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Abertura</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fechamento</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fundo Inicial</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pedidos</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Receita Total</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
                  )}
                  {!isLoading && registers.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum caixa registrado.</td></tr>
                  )}
                  {registers.map((reg) => {
                    const diff = reg.closingBalance != null && reg.expectedBalance != null
                      ? Number(reg.closingBalance) - Number(reg.expectedBalance)
                      : null

                    return (
                      <tr key={reg.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{format(new Date(reg.openedAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(reg.openedAt), "HH:mm", { locale: ptBR })}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {reg.closedAt ? format(new Date(reg.closedAt), "HH:mm", { locale: ptBR }) : '—'}
                        </td>
                        <td className="px-4 py-3">{fmt(Number(reg.openingBalance))}</td>
                        <td className="px-4 py-3 text-muted-foreground">{reg.ordersCount ?? 0}</td>
                        <td className="px-4 py-3 font-medium text-green-600">
                          {fmt(Number(reg.totalRevenue ?? 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                            reg.status === 'OPEN' ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground',
                          )}>
                            {reg.status === 'OPEN' ? <><Unlock className="h-3 w-3" />Aberto</> : <><Lock className="h-3 w-3" />Fechado</>}
                          </span>
                          {diff !== null && diff !== 0 && (
                            <span className={cn('ml-2 text-xs font-medium', diff > 0 ? 'text-blue-600' : 'text-red-600')}>
                              {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setDetailId(reg.id)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            Ver <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table></div>
            </div>

            {/* Paginação */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{data.total} registros</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 border rounded-lg hover:bg-muted disabled:opacity-40">Anterior</button>
                  <span className="px-3 py-1.5">{page} / {data.totalPages}</span>
                  <button disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border rounded-lg hover:bg-muted disabled:opacity-40">Próxima</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {detailId && <DetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
