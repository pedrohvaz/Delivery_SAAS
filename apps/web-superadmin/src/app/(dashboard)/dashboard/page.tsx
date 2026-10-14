'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Store, TrendingUp, ShoppingBag, DollarSign, UserPlus } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sa-metrics'],
    queryFn: () => api.get<{ data: any }>('/super-admin/metrics').then((r) => r.data.data),
  })

  const cards = [
    { label: 'Total de Lojas',   value: data?.totalStores  ?? '—', icon: Store,      color: 'text-blue-600 bg-blue-50' },
    { label: 'Lojas Abertas',    value: data?.openStores   ?? '—', icon: TrendingUp,  color: 'text-green-600 bg-green-50' },
    { label: 'Total de Pedidos', value: data?.totalOrders  ?? '—', icon: ShoppingBag, color: 'text-purple-600 bg-purple-50' },
    {
      label: 'Receita Total',
      value: data ? `R$ ${Number(data.revenueTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—',
      icon: DollarSign,
      color: 'text-yellow-600 bg-yellow-50',
    },
    { label: 'Novas Lojas (30d)', value: data?.newStores ?? '—', icon: UserPlus, color: 'text-pink-600 bg-pink-50' },
  ]

  const chartData = (data?.ordersPerDay ?? []).map((d: any) => ({
    day: format(parseISO(d.day), 'dd/MM', { locale: ptBR }),
    pedidos: d.count,
  }))

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumo geral do seu SaaS</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              <p className="text-lg sm:text-xl font-bold text-foreground break-words">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Pedidos nos últimos 30 dias</h2>
        {isLoading
          ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
          : chartData.length === 0
            ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados no período.</div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPedidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => [v, 'Pedidos']}
                  />
                  <Area type="monotone" dataKey="pedidos" stroke="#6366f1" strokeWidth={2} fill="url(#colorPedidos)" />
                </AreaChart>
              </ResponsiveContainer>
            )
        }
      </div>

      {/* Top Lojas */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-foreground">Top 5 Lojas por Pedidos</h2>
        </div>
        <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">#</th>
              <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Loja</th>
              <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Pedidos</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {(data?.topStores ?? []).map((s: any, i: number) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-5 py-3 text-muted-foreground font-medium">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-foreground">{s.name} <span className="text-muted-foreground font-normal">/{s.slug}</span></td>
                <td className="px-5 py-3 text-muted-foreground">{s._count.orders}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/dashboard/lojas/${s.id}`} className="text-xs text-blue-600 hover:underline">Ver detalhes</Link>
                </td>
              </tr>
            ))}
            {!isLoading && (data?.topStores ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">Nenhum dado.</td></tr>
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
