'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Search, CreditCard, TrendingUp, Clock, AlertCircle, XCircle, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Subscription {
  id: string
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'UNPAID'
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  createdAt: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  plan: {
    id: string
    name: string
    slug: string
    monthlyPrice: string
  }
  store: {
    id: string
    name: string
    slug: string
    createdAt: string
  }
}

interface SubscriptionsResponse {
  data: Subscription[]
  stats: {
    total: number
    trialing: number
    active: number
    pastDue: number
    canceled: number
    mrr: number
  }
}

const STATUS_CONFIG = {
  TRIALING:   { label: 'Trial',      color: 'bg-blue-50 text-blue-700 border-blue-200',         icon: Clock },
  ACTIVE:     { label: 'Ativa',      color: 'bg-green-50 text-green-700 border-green-200',     icon: CheckCircle2 },
  PAST_DUE:   { label: 'Em atraso',  color: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertCircle },
  CANCELED:   { label: 'Cancelada',  color: 'bg-red-50 text-red-700 border-red-200',           icon: XCircle },
  INCOMPLETE: { label: 'Incompleta', color: 'bg-gray-50 text-gray-700 border-gray-200',        icon: AlertCircle },
  UNPAID:     { label: 'Não paga',   color: 'bg-red-50 text-red-700 border-red-200',           icon: XCircle },
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function currency(value: number | string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

export default function AssinaturasPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<SubscriptionsResponse>({
    queryKey: ['admin-subscriptions', statusFilter],
    queryFn: () => api.get(`/plans/admin/subscriptions${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`)
      .then((r) => r.data),
  })

  const filtered = (data?.data ?? []).filter((s) =>
    !search || s.store.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Assinaturas</h1>
          <p className="text-sm text-muted-foreground">Gerencie todas as assinaturas e cobranças do sistema</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard icon={TrendingUp} label="MRR" value={currency(data?.stats.mrr ?? 0)} color="bg-green-50 text-green-600" />
          <StatCard icon={CreditCard} label="Total" value={data?.stats.total ?? 0} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Clock} label="Em trial" value={data?.stats.trialing ?? 0} color="bg-orange-50 text-orange-600" />
          <StatCard icon={CheckCircle2} label="Ativas" value={data?.stats.active ?? 0} color="bg-green-50 text-green-600" />
          <StatCard icon={AlertCircle} label="Em atraso" value={data?.stats.pastDue ?? 0} color="bg-orange-50 text-orange-600" />
          <StatCard icon={XCircle} label="Canceladas" value={data?.stats.canceled ?? 0} color="bg-red-50 text-red-600" />
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text" placeholder="Buscar por loja..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['ALL', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium border transition',
                  statusFilter === s ? 'bg-foreground text-background border-foreground' : 'bg-card hover:bg-accent',
                )}
              >
                {s === 'ALL' ? 'Todas' : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhuma assinatura encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Loja</th>
                    <th className="text-left px-4 py-3 font-medium">Plano</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Valor</th>
                    <th className="text-left px-4 py-3 font-medium">Trial até</th>
                    <th className="text-left px-4 py-3 font-medium">Renova em</th>
                    <th className="text-left px-4 py-3 font-medium">Stripe</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((sub) => {
                    const cfg = STATUS_CONFIG[sub.status]
                    const StatusIcon = cfg.icon
                    return (
                      <tr key={sub.id} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{sub.store.name}</p>
                            <p className="text-xs text-muted-foreground">/{sub.store.slug}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{sub.plan.name}</td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border', cfg.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">{currency(sub.plan.monthlyPrice)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {sub.trialEndsAt ? format(new Date(sub.trialEndsAt), "dd/MM/yyyy", { locale: ptBR }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {sub.currentPeriodEnd ? format(new Date(sub.currentPeriodEnd), "dd/MM/yyyy", { locale: ptBR }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {sub.stripeSubscriptionId ? (
                            <a
                              href={`https://dashboard.stripe.com/subscriptions/${sub.stripeSubscriptionId}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Ver no Stripe →
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Sem cobrança</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
