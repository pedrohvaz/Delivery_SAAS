import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CashTransaction {
  id: string
  type: 'DEPOSIT' | 'WITHDRAWAL'
  amount: number
  description: string
  createdAt: string
}

export interface CashRegister {
  id: string
  status: 'OPEN' | 'CLOSED'
  openingBalance: number
  closingBalance: number | null
  expectedBalance: number | null
  notes: string | null
  openedAt: string
  closedAt: string | null
  transactions: CashTransaction[]
  // computed
  ordersCount?: number
  totalRevenue?: number
  cashRevenue?: number
  deposits?: number
  withdrawals?: number
}

// ─── GET current ─────────────────────────────────────────────────────────────
export function useCurrentCashRegister() {
  return useQuery({
    queryKey: ['cash-register', 'current'],
    queryFn: () => api.get<{ data: CashRegister | null }>('/cash-register/current').then((r) => r.data.data),
    refetchInterval: 30_000,
  })
}

// ─── POST open ───────────────────────────────────────────────────────────────
export function useOpenCashRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (openingBalance: number) =>
      api.post<{ data: CashRegister }>('/cash-register/open', { openingBalance }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-register'] }),
  })
}

// ─── PATCH close ─────────────────────────────────────────────────────────────
export function useCloseCashRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, closingBalance, notes }: { id: string; closingBalance: number; notes?: string }) =>
      api.patch<{ data: CashRegister }>(`/cash-register/${id}/close`, { closingBalance, notes }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-register'] }),
  })
}

// ─── POST transaction ─────────────────────────────────────────────────────────
export function useAddCashTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ registerId, type, amount, description }: { registerId: string; type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; description: string }) =>
      api.post(`/cash-register/${registerId}/transaction`, { type, amount, description }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-register'] }),
  })
}

// ─── GET history ──────────────────────────────────────────────────────────────
export function useCashRegisterHistory(page = 1, filters: { from?: string; to?: string; status?: string } = {}) {
  const qs = new URLSearchParams({ page: String(page), ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) })
  return useQuery({
    queryKey: ['cash-register', 'history', page, filters],
    queryFn: () =>
      api.get<{ data: (CashRegister & { ordersCount: number; totalRevenue: number; deposits: number; withdrawals: number })[]; total: number; totalPages: number }>(
        `/cash-register/history?${qs}`,
      ).then((r) => r.data),
  })
}

// ─── GET detail ───────────────────────────────────────────────────────────────
export function useCashRegisterDetail(id: string) {
  return useQuery({
    queryKey: ['cash-register', id],
    queryFn: () => api.get<{ data: any }>(`/cash-register/${id}`).then((r) => r.data.data),
    enabled: !!id,
  })
}
