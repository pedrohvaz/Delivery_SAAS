'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { usePlans, useMySubscription, useCheckout, useBillingPortal } from '@/hooks/use-plans'
import { Check, CreditCard, Zap, Crown, ExternalLink, Loader2, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@delivery/ui'

function daysRemaining(date: string | null): number {
  if (!date) return 0
  const diff = new Date(date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function AssinaturaPage() {
  const [error, setError] = useState('')

  const { data: plans = [], isLoading: plansLoading } = usePlans()
  const { data: subscription, isLoading: subLoading } = useMySubscription()
  const checkout = useCheckout()
  const portal = useBillingPortal()

  function handleSelectPlan(slug: string) {
    setError('')
    checkout.mutate(slug, {
      onSuccess: (data: any) => { window.location.href = data.url },
      onError: (err: any) => {
        setError(err?.response?.data?.message ?? 'Erro ao iniciar checkout.')
      },
    })
  }

  function handlePortal() {
    portal.mutate(undefined, {
      onSuccess: (data: any) => { window.location.href = data.url },
    })
  }

  const currentPlanSlug = subscription?.plan?.slug
  const isLoading = plansLoading || subLoading
  const isTrialing = subscription?.status === 'TRIALING'
  const isActive = subscription?.status === 'ACTIVE'
  const trialDays = isTrialing ? daysRemaining(subscription.trialEndsAt) : 0
  const isPaid = subscription && subscription.currentPeriodEnd && (isActive || subscription.status === 'PAST_DUE')

  const statusLabel: Record<string, string> = {
    TRIALING: 'Período de teste',
    ACTIVE: 'Ativa',
    PAST_DUE: 'Pagamento pendente',
    CANCELED: 'Cancelada',
    INCOMPLETE: 'Incompleta',
    UNPAID: 'Não paga',
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Assinatura e Pagamentos" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Card de trial em andamento */}
        {isTrialing && (
          <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 p-6 text-white">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold">
                  <Clock className="h-3 w-3" /> Período de teste
                </div>
                <h2 className="text-2xl font-black mt-2">Plano {subscription.plan.name}</h2>
                <p className="text-sm text-white/90">
                  Você tem <strong>{trialDays} dia{trialDays === 1 ? '' : 's'}</strong> restantes do seu teste grátis.
                </p>
                {subscription.trialEndsAt && (
                  <p className="text-xs text-white/70 mt-1">
                    Acaba em {new Date(subscription.trialEndsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleSelectPlan(currentPlanSlug!)}
                disabled={checkout.isPending}
                className="rounded-xl bg-white text-orange-600 font-bold px-6 py-3 hover:shadow-lg transition flex items-center gap-2 shrink-0"
              >
                {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {checkout.isPending ? 'Redirecionando...' : 'Assinar agora'}
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 text-xs text-white/80">
              Ao assinar agora você garante a continuidade do plano. Cancele quando quiser pelo painel.
            </div>
          </div>
        )}

        {/* Card de trial expirado sem assinatura */}
        {isTrialing && trialDays === 0 && (
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900">Período de teste encerrado</h3>
                <p className="text-sm text-red-700 mt-1">
                  Para continuar usando o plano {subscription.plan.name}, assine agora.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Card de assinatura paga ativa */}
        {isPaid && (
          <div className="rounded-2xl border bg-card p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Plano {subscription.plan.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Status:{' '}
                    <span className={cn('font-medium', isActive ? 'text-green-600' : 'text-orange-500')}>
                      {statusLabel[subscription.status]}
                    </span>
                    {subscription.currentPeriodEnd && (
                      <> · Próxima cobrança em {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}</>
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
          </div>
        )}

        {/* Sem assinatura nenhuma */}
        {!subscription && !subLoading && (
          <div className="rounded-2xl border bg-orange-50 border-orange-200 p-5">
            <p className="text-sm font-medium text-orange-800">
              Você está no plano <strong>Grátis</strong>. Faça upgrade para um dos planos pagos abaixo para desbloquear todos os recursos.
            </p>
          </div>
        )}

        {/* Lista de planos */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">
            {isTrialing || isPaid ? 'Mudar plano' : 'Escolha seu plano'}
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan: any) => {
                const isFree = Number(plan.monthlyPrice) === 0
                const isCurrent = currentPlanSlug === plan.slug
                return (
                  <div key={plan.slug} className={cn(
                    'relative rounded-2xl border-2 p-6 flex flex-col transition-all',
                    isCurrent ? 'border-primary bg-primary/5' :
                    plan.highlight ? 'border-orange-300 shadow-lg' :
                    'border-border hover:border-primary/40',
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
                        onClick={() => handleSelectPlan(plan.slug)}
                        disabled={checkout.isPending}
                        className={cn(
                          'w-full rounded-xl py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2',
                          plan.highlight
                            ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:shadow-lg'
                            : 'bg-foreground text-background hover:opacity-90',
                        )}
                      >
                        {checkout.isPending && checkout.variables === plan.slug
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecionando...</>
                          : <><Zap className="h-4 w-4" /> Assinar {plan.name}</>
                        }
                      </button>
                    )}
                    {isCurrent && isTrialing && !isFree && (
                      <button
                        onClick={() => handleSelectPlan(plan.slug)}
                        disabled={checkout.isPending}
                        className="w-full rounded-xl py-2.5 text-sm font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:shadow-lg transition flex items-center justify-center gap-2"
                      >
                        {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        Confirmar assinatura
                      </button>
                    )}
                    {isCurrent && isPaid && (
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
              })}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          💳 Pagamento seguro via Stripe · Cancele quando quiser
        </p>
      </main>
    </div>
  )
}
