'use client'

import { useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { usePlans, useMySubscription, useCheckout, useBillingPortal } from '@/hooks/use-plans'
import { Check, CreditCard, Zap, Crown, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@delivery/ui'

function PlanCard({
  plan,
  isCurrent,
  onSelect,
  loading,
}: {
  plan: any
  isCurrent: boolean
  onSelect: () => void
  loading: boolean
}) {
  const isFree = Number(plan.monthlyPrice) === 0
  return (
    <div className={cn(
      'relative rounded-2xl border-2 p-6 flex flex-col transition-all',
      isCurrent ? 'border-primary bg-primary/5' : plan.highlight ? 'border-orange-400 shadow-lg shadow-orange-100' : 'border-border hover:border-primary/40',
    )}>
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
          Plano atual
        </span>
      )}
      {plan.badge && !isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold text-white">
          ⚡ {plan.badge}
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.tagline}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-black text-foreground">
          {isFree ? 'Grátis' : `R$ ${Number(plan.monthlyPrice).toFixed(0)}`}
        </span>
        {!isFree && <span className="text-sm text-muted-foreground">/mês</span>}
      </div>

      <ul className="space-y-2 flex-1 mb-6">
        {plan.features.map((f: string) => (
          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {!isCurrent && !isFree && (
        <button
          onClick={onSelect}
          disabled={loading}
          className={cn(
            'w-full rounded-xl py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2',
            plan.highlight
              ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:shadow-lg hover:shadow-orange-200'
              : 'bg-foreground text-background hover:opacity-90',
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {loading ? 'Redirecionando...' : 'Assinar este plano'}
        </button>
      )}
      {isCurrent && !isFree && (
        <div className="w-full rounded-xl py-2.5 text-sm font-bold text-center bg-primary/10 text-primary">
          Plano ativo
        </div>
      )}
      {isFree && !isCurrent && (
        <div className="w-full rounded-xl py-2.5 text-sm font-bold text-center bg-muted text-muted-foreground">
          Plano gratuito
        </div>
      )}
    </div>
  )
}

export default function AssinaturaPage() {
  const { data: plans = [], isLoading: plansLoading } = usePlans()
  const { data: subscription, isLoading: subLoading } = useMySubscription()
  const checkout = useCheckout()
  const portal = useBillingPortal()
  const autoCheckoutDone = useRef(false)

  useEffect(() => {
    if (autoCheckoutDone.current) return
    if (plansLoading || plans.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const checkoutPlan = params.get('checkout')
    if (!checkoutPlan) return
    const plan = plans.find((p: any) => p.slug === checkoutPlan)
    if (!plan?.stripePriceId) return
    autoCheckoutDone.current = true
    checkout.mutate(checkoutPlan, {
      onSuccess: (data: any) => { window.location.href = data.url },
    })
  }, [plans, plansLoading])

  function handleSelectPlan(slug: string) {
    checkout.mutate(slug, {
      onSuccess: (data: any) => { window.location.href = data.url },
    })
  }

  function handlePortal() {
    portal.mutate(undefined, {
      onSuccess: (data: any) => { window.location.href = data.url },
    })
  }

  const currentPlanSlug = subscription?.plan?.slug
  const isLoading = plansLoading || subLoading

  const statusLabel: Record<string, string> = {
    TRIALING: 'Período de teste',
    ACTIVE: 'Ativa',
    PAST_DUE: 'Pagamento pendente',
    CANCELED: 'Cancelada',
    INCOMPLETE: 'Incompleta',
    UNPAID: 'Não paga',
  }

  const checkoutPending = checkout.isPending

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Assinatura" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {checkoutPending && (
          <div className="flex items-center justify-center gap-3 rounded-xl border bg-primary/5 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-medium text-primary">Redirecionando para o pagamento...</p>
          </div>
        )}

        {subscription && (
          <div className="rounded-xl border bg-card p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Plano {subscription.plan.name}</p>
                <p className="text-sm text-muted-foreground">
                  Status:{' '}
                  <span className={cn('font-medium', subscription.status === 'ACTIVE' || subscription.status === 'TRIALING' ? 'text-green-600' : 'text-orange-500')}>
                    {statusLabel[subscription.status] ?? subscription.status}
                  </span>
                  {subscription.currentPeriodEnd && (
                    <> · Renova em {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}</>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handlePortal}
              disabled={portal.isPending}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition shrink-0"
            >
              {portal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Gerenciar assinatura
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )}

        {!subscription && !subLoading && (
          <div className="rounded-xl border bg-orange-50 border-orange-200 p-4">
            <p className="text-sm font-medium text-orange-800">
              Você ainda não tem uma assinatura ativa. Escolha um plano abaixo para começar com 7 dias grátis.
            </p>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">
            {subscription ? 'Mudar plano' : 'Escolha seu plano'}
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan: any) => (
                <PlanCard
                  key={plan.slug}
                  plan={plan}
                  isCurrent={currentPlanSlug === plan.slug}
                  onSelect={() => handleSelectPlan(plan.slug)}
                  loading={checkoutPending && checkout.variables === plan.slug}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          💳 Pagamento seguro via Stripe · Cancele quando quiser · 7 dias grátis nos planos pagos
        </p>
      </main>
    </div>
  )
}
