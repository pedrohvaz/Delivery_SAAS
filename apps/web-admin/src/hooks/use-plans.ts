import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Cycle, PlanPriceInfo } from '@/lib/billing'

export interface Plan {
  id: string
  slug: string
  name: string
  tagline: string | null
  monthlyPrice: number
  features: string[]
  limits: Record<string, unknown>
  color: string
  highlight: boolean
  badge: string | null
  isActive: boolean
  position: number
  stripePriceId: string | null
  prices: PlanPriceInfo[] // um por período: mensal, 3, 6 e 12 meses
}

export interface Subscription {
  id: string
  storeId: string
  planId: string
  cycle: Cycle | null
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'UNPAID'
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  plan: Plan
}

// ─── PÚBLICO ─────────────────────────────────────────────────────────────────

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<{ data: Plan[] }>('/plans').then((r) => r.data.data),
  })
}

// ─── ASSINATURA DA LOJA ──────────────────────────────────────────────────────

export function useMySubscription() {
  return useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => api.get<{ data: Subscription | null }>('/plans/me').then((r) => r.data.data),
  })
}

export function useCheckout() {
  return useMutation({
    mutationFn: ({ planSlug, cycle }: { planSlug: string; cycle: Cycle }) =>
      api.post<{ data: { url: string } }>('/plans/checkout', {
        planSlug,
        cycle,
        successUrl: `${window.location.origin}/dashboard?billing=success`,
        cancelUrl: `${window.location.origin}/dashboard?billing=canceled`,
      }).then((r) => r.data.data),
  })
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: () =>
      api.post<{ data: { url: string } }>('/plans/portal', {
        returnUrl: `${window.location.origin}/dashboard`,
      }).then((r) => r.data.data),
  })
}

// ─── SUPERADMIN (CRUD) ───────────────────────────────────────────────────────

export function useAdminPlans() {
  return useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => api.get<{ data: Plan[] }>('/plans/admin').then((r) => r.data.data),
  })
}

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Plan>) =>
      api.post<{ data: Plan }>('/plans/admin', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
      qc.invalidateQueries({ queryKey: ['plans'] })
    },
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Plan> & { id: string }) =>
      api.patch<{ data: Plan }>(`/plans/admin/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
      qc.invalidateQueries({ queryKey: ['plans'] })
    },
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/plans/admin/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
  })
}
