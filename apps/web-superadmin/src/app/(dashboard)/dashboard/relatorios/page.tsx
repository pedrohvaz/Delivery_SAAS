'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Store, ShoppingBag, DollarSign, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

function currency(v: number | string | null | undefined) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RelatoriosPage() {
  const [period, setPeriod] = useState('30d')

  const { data, isLoading } = useQuery({
    queryKey: ['sa-reports', period],
    queryFn: () => api.get<{ data: any }>(`/super-admin/reports?period=${period}`).then(r => r.data.data),
  })

  const s = data?.summary
  const growthPositive = (s?.revenueGrowth ?? 0) >= 0

  const summaryCards = [
    { label: 'Receita no período', value: currency(s?.totalRevenue ?? 0), icon: DollarSign, color: 'text-green-600 bg-green-50', sub: s?.revenueGrowth != null ? `${growthPositive ? '+' : ''}${s.revenueGrowth.toFixed(1)}% vs período anterior` : null },
    { label: 'Pedidos no período', value: s?.totalOrders ?? '—', icon: ShoppingBag, color: 'text-blue-600 bg-blue-50', sub: null },
    { label: 'Lojas ativas', value: s?.activeStores ?? '—', icon: Store, color: 'text-purple-600 bg-purple-50', sub: `${s?.totalStores ?? 0} total` },
    { label: 'Lojas suspensas', value: s?.suspendedStores ?? 0, icon: AlertCircle, color: 'text-orange-600 bg-orange-50', sub: `${s?.newStores ?? 0} novas no período` },
  ]

  const chartData = (data?.revenueByDay ?? []).map((d: any) => ({
    day: format(parseISO(d.day), 'dd/MM', { locale: ptBR }),
    receita: d.revenue,
    pedidos: d.orders,
  }))

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios Financeiros</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão financeira consolidada de todas as lojas</p>
        </div>
        <div className="flex rounded-xl border bg-muted/30 p-0.5 gap-0.5">
          {[['7d', '7 dias'], ['30d', '30 dias'], ['90d', '90 dias']].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', period === v ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="bg-card border rounded-xl p-5 space-y-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
              {sub && <p className={cn('text-xs mt-0.5 font-medium', growthPositive ? 'text-green-600' : 'text-red-600')}>{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold">Receita diária no período</h2>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados no período.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, name: string) => [
                name === 'receita' ? currency(v) : v, name === 'receita' ? 'Receita' : 'Pedidos'
              ]} />
              <Area type="monotone" dataKey="receita" stroke="#6366f1" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top lojas por receita */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Receita por Loja</h2>
          <span className="text-xs text-muted-foreground">Período: {period}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">#</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Loja</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Pedidos</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Receita</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Ticket Médio</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Carregando...</td></tr>}
            {(data?.storeRevenue ?? []).length === 0 && !isLoading && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Nenhum pedido no período.</td></tr>
            )}
            {(data?.storeRevenue ?? []).map((item: any, i: number) => (
              <tr key={item.storeId} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-5 py-3 text-muted-foreground font-medium">{i + 1}</td>
                <td className="px-5 py-3">
                  <p className="font-medium">{item.store?.name ?? item.storeId}</p>
                  <p className="text-xs text-muted-foreground">/{item.store?.slug}</p>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{item.orders}</td>
                <td className="px-5 py-3 font-semibold text-green-700">{currency(item.revenue)}</td>
                <td className="px-5 py-3 text-muted-foreground">{item.orders > 0 ? currency(item.revenue / item.orders) : '—'}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/dashboard/lojas/${item.storeId}`} className="text-xs text-blue-600 hover:underline">Ver loja →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lojas inativas */}
      {(data?.inactiveStores ?? []).length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b bg-orange-50">
            <h2 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Lojas sem pedidos no período
            </h2>
            <p className="text-xs text-orange-600 mt-0.5">Essas lojas estão ativas mas não tiveram movimentação</p>
          </div>
          <div className="divide-y">
            {(data?.inactiveStores ?? []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">/{s.slug} · cadastrada em {format(new Date(s.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
                <Link href={`/dashboard/lojas/${s.id}`} className="text-xs text-blue-600 hover:underline">Ver →</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
