'use client'

import { useState } from 'react'
import { TrendingUp, ShoppingBag, Users, Percent, Download, Package } from 'lucide-react'
import {
  useSummary,
  useSalesChart,
  useTopProducts,
  useReportOrders,
  useExportReportOrders,
  type Period,
  type ReportOrder,
} from '@/hooks/use-reports'
import { currency } from '@/lib/utils'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
]

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_PRODUCTION: 'Em produção',
  OUT_FOR_DELIVERY: 'Saiu p/ entrega',
  READY_FOR_PICKUP: 'Pronto p/ retirar',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
}

function formatDateLabel(date: string, period: Period): string {
  if (period === 'today') return 'Hoje'
  const d = new Date(date + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// Gráfico de barras puro CSS
function BarChart({ data, period }: { data: { date: string; count: number; revenue: number }[]; period: Period }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)

  if (data.every((d) => d.revenue === 0)) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Nenhuma venda no período
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-40">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10">
              <div className="rounded-lg bg-foreground text-background text-xs px-2 py-1 whitespace-nowrap shadow">
                {currency(d.revenue)} · {d.count} pedido{d.count !== 1 ? 's' : ''}
              </div>
              <div className="w-2 h-2 bg-foreground rotate-45 -mt-1" />
            </div>
            <div
              className="w-full rounded-t-sm bg-primary/80 hover:bg-primary transition-all min-h-[2px]"
              style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, 2)}%` }}
            />
          </div>
        ))}
      </div>
      {/* Labels do eixo X — mostra só alguns para não poluir */}
      <div className="flex gap-1">
        {data.map((d, i) => {
          const showLabel = data.length <= 10 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0
          return (
            <div key={d.date} className="flex-1 text-center">
              {showLabel && (
                <span className="text-xs text-muted-foreground">{formatDateLabel(d.date, period)}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'Entrega', PICKUP: 'Retirada', TABLE: 'Mesa', COUNTER: 'Balcão',
}

// Exportação CSV client-side
function exportCSV(orders: ReportOrder[]) {
  if (!orders.length) return

  const header = ['#', 'Data', 'Cliente', 'Telefone', 'Tipo', 'Pagamento', 'Subtotal', 'Entrega', 'Desconto', 'Total', 'Status']
  const rows = orders.map((o) => [
    o.orderNumber,
    new Date(o.createdAt).toLocaleString('pt-BR'),
    o.customer?.name ?? '',
    o.customer?.phone ?? '',
    TYPE_LABELS[o.type] ?? o.type,
    o.paymentMethod ?? '',
    o.subtotal.toFixed(2).replace('.', ','),
    o.deliveryFee.toFixed(2).replace('.', ','),
    o.discount.toFixed(2).replace('.', ','),
    o.total.toFixed(2).replace('.', ','),
    STATUS_LABELS[o.status] ?? o.status,
  ])

  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pedidos-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<Period>('7d')
  const [ordersPage, setOrdersPage] = useState(1)

  const { data: summary, isLoading: summaryLoading } = useSummary(period)
  const { data: salesData = [], isLoading: salesLoading } = useSalesChart(period)
  const { data: topProducts = [], isLoading: topLoading } = useTopProducts(period)
  const ordersQuery = useReportOrders(period, ordersPage)
  const exportOrders = useExportReportOrders()

  const maxQty = Math.max(...topProducts.map((p) => p.quantity), 1)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão financeira e operacional da loja</p>
        </div>
        {/* Seletor de período */}
        <div className="flex max-w-full self-start overflow-x-auto rounded-xl border bg-card p-1 gap-1">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => { setPeriod(p.value); setOrdersPage(1) }}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 sm:px-4 py-1.5 text-sm font-medium transition-colors
                ${period === p.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de resumo (11.5) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Receita', value: currency(summary?.revenue ?? 0), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Pedidos', value: String(summary?.ordersCount ?? 0), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Ticket médio', value: currency(summary?.avgTicket ?? 0), icon: Percent, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Novos clientes', value: String(summary?.newCustomers ?? 0), icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border bg-card p-4 space-y-3">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{summaryLoading ? '...' : value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo financeiro detalhado (11.5) */}
      {summary && !summaryLoading && (
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold text-sm mb-4">Resumo financeiro</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Taxa de entrega', value: currency(summary.deliveryFees), color: '' },
              { label: 'Descontos aplicados', value: `- ${currency(summary.discounts)}`, color: 'text-green-600' },
              { label: 'Pedidos cancelados', value: String(summary.cancelled), color: summary.cancelled > 0 ? 'text-red-500' : '' },
              { label: 'Taxa de cancelamento', value: summary.ordersCount + summary.cancelled > 0
                  ? `${((summary.cancelled / (summary.ordersCount + summary.cancelled)) * 100).toFixed(1)}%`
                  : '0%',
                color: '' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-muted/30 p-3">
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico de vendas (11.2) */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Vendas por dia</h2>
        {salesLoading ? (
          <div className="h-40 rounded-xl bg-muted animate-pulse" />
        ) : (
          <BarChart data={salesData} period={period} />
        )}
      </div>

      {/* Top produtos (11.3) */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          Produtos mais vendidos
        </h2>
        {topLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum produto vendido no período</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.productId} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{p.quantity} un · {currency(p.revenue)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${(p.quantity / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de pedidos + exportação CSV (11.4) */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Histórico de pedidos</h2>
          <button
            onClick={async () => {
              const all = await exportOrders.mutateAsync(period)
              exportCSV(all)
            }}
            disabled={exportOrders.isPending || !ordersQuery.data?.meta.total}
            className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            {exportOrders.isPending ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>

        {ordersQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : !ordersQuery.data?.data.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido no período</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 text-left font-medium">#</th>
                    <th className="py-2 text-left font-medium">Data</th>
                    <th className="py-2 text-left font-medium">Cliente</th>
                    <th className="py-2 text-left font-medium">Tipo</th>
                    <th className="py-2 text-right font-medium">Total</th>
                    <th className="py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersQuery.data.data.map((o) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition">
                      <td className="py-2.5 font-mono text-xs text-muted-foreground">#{o.orderNumber}</td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 font-medium">{o.customer?.name ?? '—'}</td>
                      <td className="py-2.5 text-xs">
                        {o.type === 'DELIVERY' ? '🛵 Entrega' : '🏠 Retirada'}
                      </td>
                      <td className="py-2.5 text-right font-semibold">{currency(o.total)}</td>
                      <td className="py-2.5 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold
                          ${STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {ordersQuery.data.meta.pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  {ordersQuery.data.meta.total} pedidos · página {ordersQuery.data.meta.page} de {ordersQuery.data.meta.pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                    disabled={ordersPage === 1}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted transition"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setOrdersPage((p) => Math.min(ordersQuery.data!.meta.pages, p + 1))}
                    disabled={ordersPage === ordersQuery.data.meta.pages}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted transition"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
