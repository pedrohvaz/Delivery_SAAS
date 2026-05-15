'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { Header } from '@/components/layout/header'
import {
  ShoppingBag, Users, TrendingUp, BarChart2, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Clock, Receipt,
} from 'lucide-react'
import { useSummary } from '@/hooks/use-reports'
import { useOrders } from '@/hooks/use-orders'
import { useStockAlerts } from '@/hooks/use-stock'
import { useCategories } from '@/hooks/use-cardapio'
import { useSettings } from '@/hooks/use-settings'
import { currency } from '@/lib/utils'
import { cn } from '@delivery/ui'
import { relativeTime } from '@/hooks/use-orders'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { useMySubscription } from '@/hooks/use-plans'
import { Crown } from 'lucide-react'

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return null
  const positive = value >= 0
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

export default function DashboardPage() {
  const { store, user } = useAuthStore()
  const { data: summary, isLoading } = useSummary('today')
  const { data: allOrders = [] } = useOrders()
  const { data: stockAlerts = [] } = useStockAlerts()
  const { data: categories = [] } = useCategories()
  const { data: settings } = useSettings()
  const { data: subscription, isLoading: subLoading } = useMySubscription()

  // Detecta etapas do onboarding concluídas
  const completedSteps: string[] = []
  if (store?.name) completedSteps.push('store-info')
  if (categories.length > 0) completedSteps.push('cardapio')
  if ((settings?.paymentMethods?.length ?? 0) > 0) completedSteps.push('pagamentos')

  const pendingOrders = allOrders.filter((o) => o.status === 'PENDING')
  const activeOrders = allOrders.filter((o) =>
    ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'].includes(o.status)
  )

  const stats = [
    { label: 'Pedidos hoje', value: isLoading ? '...' : String(summary?.ordersCount ?? 0), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', growth: null },
    { label: 'Novos clientes', value: isLoading ? '...' : String(summary?.newCustomers ?? 0), icon: Users, color: 'text-green-600', bg: 'bg-green-50', growth: null },
    { label: 'Receita hoje', value: isLoading ? '...' : currency(summary?.revenue ?? 0), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', growth: summary?.revenueGrowth ?? null },
    { label: 'Ticket médio', value: isLoading ? '...' : currency(summary?.avgTicket ?? 0), icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50', growth: null },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Dashboard" />

      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Boas-vindas + status */}
        <div className="rounded-xl border bg-card p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Olá, {user?.name?.split(' ')[0]} 👋</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bem-vindo ao painel da <span className="font-medium text-foreground">{store?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status da loja:</span>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', store?.isOpen ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground')}>
              <span className={cn('h-1.5 w-1.5 rounded-full', store?.isOpen ? 'bg-green-500' : 'bg-gray-400')} />
              {store?.isOpen ? 'Aberta' : 'Fechada'}
            </span>
          </div>
        </div>

        {/* Banner de assinatura */}
        {!subLoading && (() => {
          if (!subscription) {
            return (
              <Link href="/dashboard/assinatura"
                className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 p-4 text-white hover:opacity-95 transition">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Escolha seu plano e desbloqueie todos os recursos</p>
                  <p className="text-xs text-white/80 mt-0.5">15 dias grátis · Sem cartão · Cancele quando quiser</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-white/80 shrink-0" />
              </Link>
            )
          }
          if (subscription.status === 'TRIALING') {
            const diff = subscription.trialEndsAt ? new Date(subscription.trialEndsAt).getTime() - Date.now() : 0
            const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
            const expired = days === 0
            return (
              <Link href="/dashboard/assinatura"
                className={cn(
                  'flex items-center gap-4 rounded-xl p-4 text-white hover:opacity-95 transition',
                  expired ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-orange-500 to-pink-500',
                )}>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {expired
                      ? `Período de teste do plano ${subscription.plan.name} encerrado`
                      : `Plano ${subscription.plan.name} · ${days} dia${days === 1 ? '' : 's'} de teste restantes`}
                  </p>
                  <p className="text-xs text-white/80 mt-0.5">
                    {expired ? 'Assine agora para continuar usando todos os recursos' : 'Clique para confirmar sua assinatura e garantir o plano'}
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-white/80 shrink-0" />
              </Link>
            )
          }
          if (subscription.status === 'PAST_DUE') {
            return (
              <Link href="/dashboard/assinatura"
                className="flex items-center gap-4 rounded-xl bg-red-500 p-4 text-white hover:opacity-95 transition">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Pagamento pendente do plano {subscription.plan.name}</p>
                  <p className="text-xs text-white/80 mt-0.5">Atualize seu método de pagamento para continuar usando o sistema</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-white/80 shrink-0" />
              </Link>
            )
          }
          return null
        })()}

        {/* Onboarding wizard — só aparece nas primeiras semanas */}
        {completedSteps.length < 5 && (
          <OnboardingWizard completedSteps={completedSteps} />
        )}

        {/* Alertas críticos */}
        {(pendingOrders.length > 0 || stockAlerts.length > 0) && (
          <div className="space-y-2">
            {pendingOrders.length > 0 && (
              <Link href="/dashboard/pedidos"
                className="flex items-center gap-3 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 hover:bg-yellow-100 transition">
                <div className="h-8 w-8 rounded-full bg-yellow-200 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-yellow-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-800">
                    {pendingOrders.length} pedido{pendingOrders.length > 1 ? 's' : ''} aguardando confirmação
                  </p>
                  <p className="text-xs text-yellow-600">Clique para ver e confirmar</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-yellow-600 shrink-0" />
              </Link>
            )}
            {stockAlerts.length > 0 && (
              <Link href="/dashboard/estoque"
                className="flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 hover:bg-orange-100 transition">
                <div className="h-8 w-8 rounded-full bg-orange-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-orange-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-800">
                    {stockAlerts.length} produto{stockAlerts.length > 1 ? 's' : ''} com estoque baixo ou esgotado
                  </p>
                  <p className="text-xs text-orange-600">
                    {stockAlerts.slice(0, 3).map((a: any) => a.name).join(', ')}{stockAlerts.length > 3 ? '...' : ''}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-orange-600 shrink-0" />
              </Link>
            )}
          </div>
        )}

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color, bg, growth }) => (
            <div key={label} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <GrowthBadge value={growth} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pedidos ativos recentes */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Pedidos em andamento</h3>
              <Link href="/dashboard/pedidos" className="text-xs text-primary hover:underline">Ver todos →</Link>
            </div>
            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum pedido ativo</p>
              </div>
            ) : (
              <div className="divide-y">
                {activeOrders.slice(0, 5).map((order) => (
                  <Link key={order.id} href="/dashboard/pedidos"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">#{order.orderNumber}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {order.customer?.name ?? 'Cliente'}
                      </p>
                      <p className="text-xs text-muted-foreground">{order.type} · {currency(Number(order.total))}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                        order.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        order.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        order.status === 'IN_PRODUCTION' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-purple-50 text-purple-700 border-purple-200'
                      )}>
                        {order.status === 'PENDING' ? 'Pendente' :
                         order.status === 'CONFIRMED' ? 'Confirmado' :
                         order.status === 'IN_PRODUCTION' ? 'Produzindo' : 'Entregando'}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(order.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Resumo financeiro + atalhos */}
          <div className="space-y-4">
            {summary && !isLoading && (
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <h3 className="text-sm font-semibold">Financeiro — hoje</h3>
                {[
                  { label: 'Subtotal', value: currency(summary.revenue + summary.discounts - summary.deliveryFees) },
                  { label: 'Taxa de entrega', value: currency(summary.deliveryFees) },
                  { label: 'Descontos', value: `- ${currency(summary.discounts)}`, cls: 'text-green-600' },
                  { label: 'Receita líquida', value: currency(summary.revenue), cls: 'font-bold text-primary' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cls ?? ''}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/caixa"
                className="rounded-xl border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition group flex flex-col gap-2">
                <Receipt className="h-6 w-6 text-muted-foreground/40 group-hover:text-primary/40 transition" />
                <p className="text-sm font-semibold">Caixa / PDV</p>
                <p className="text-xs text-muted-foreground">Registrar venda manual</p>
              </Link>
              <Link href="/dashboard/relatorios"
                className="rounded-xl border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition group flex flex-col gap-2">
                <BarChart2 className="h-6 w-6 text-muted-foreground/40 group-hover:text-primary/40 transition" />
                <p className="text-sm font-semibold">Relatórios</p>
                <p className="text-xs text-muted-foreground">Vendas e histórico</p>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
