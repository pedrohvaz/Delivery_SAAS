import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CustomerSummary {
  id: string
  name: string
  phone: string | null
  email: string | null
  cpf: string | null
  createdAt: string
  _count: { orders: number }
  ordersCount: number
  totalSpent: number
  lastOrderAt: string | null
}

export type CustomerSegment = 'all' | 'new' | 'recurring' | 'inactive' | 'never'
export type CustomerSort = 'recent' | 'orders' | 'spent' | 'last' | 'name'

export interface CustomerAddress {
  id: string
  street: string
  number: string
  complement: string | null
  district: string
  city: string
  state: string
  zipCode: string
  reference: string | null
  isDefault: boolean
}

export interface CustomerOrderItem {
  name: string
  quantity: number
  price: number
}

export interface CustomerOrder {
  id: string
  orderNumber: number
  type: string
  status: string
  paymentMethod: string | null
  total: number
  createdAt: string
  items: CustomerOrderItem[]
}

export interface CustomerStats {
  totalOrders: number
  completedOrders: number
  totalSpent: number
  avgTicket: number
  lastOrderAt: string | null
  favorites: { name: string; quantity: number }[]
}

export interface CustomerDetail extends CustomerSummary {
  notes: string | null
  addresses: CustomerAddress[]
  orders: CustomerOrder[]
  stats: CustomerStats
}

export interface CustomersMeta {
  total: number
  page: number
  take: number
  counts: Record<CustomerSegment, number>
}

export interface AddressInput {
  street: string
  number: string
  complement?: string
  district: string
  city: string
  state: string
  zipCode?: string
  reference?: string
  isDefault?: boolean
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useCustomers(search?: string, page = 1, segment: CustomerSegment = 'all', sort: CustomerSort = 'recent') {
  return useQuery({
    queryKey: ['customers', search, page, segment, sort],
    placeholderData: (prev) => prev,
    queryFn: () => {
      const q = new URLSearchParams()
      if (search) q.set('search', search)
      q.set('page', String(page))
      q.set('segment', segment)
      q.set('sort', sort)
      return api.get<{ data: CustomerSummary[]; meta: CustomersMeta }>(`/customers?${q}`).then((r) => r.data)
    },
  })
}

export function useExportCustomers() {
  return useMutation({
    mutationFn: ({ search, segment = 'all', sort = 'recent' }: { search?: string; segment?: CustomerSegment; sort?: CustomerSort }) => {
      const q = new URLSearchParams()
      if (search) q.set('search', search)
      q.set('segment', segment)
      q.set('sort', sort)
      q.set('all', 'true')
      return api.get<{ data: CustomerSummary[] }>(`/customers?${q}`).then((r) => r.data.data)
    },
  })
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<{ data: CustomerDetail }>(`/customers/${id}`).then((r) => r.data.data),
    enabled: !!id,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; phone?: string; email?: string; cpf?: string; notes?: string }) =>
      api.post<{ data: CustomerSummary }>('/customers', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; phone?: string | null; email?: string | null; cpf?: string | null; notes?: string | null }) =>
      api.patch(`/customers/${id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer', vars.id] })
    },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

// ─── Address mutations ────────────────────────────────────────────────────────

export function useCreateAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, ...data }: AddressInput & { customerId: string }) =>
      api.post<{ data: CustomerAddress }>(`/customers/${customerId}/addresses`, data).then((r) => r.data.data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['customer', vars.customerId] }),
  })
}

export function useUpdateAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, addressId, ...data }: Partial<AddressInput> & { customerId: string; addressId: string }) =>
      api.patch<{ data: CustomerAddress }>(`/customers/${customerId}/addresses/${addressId}`, data).then((r) => r.data.data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['customer', vars.customerId] }),
  })
}

export function useDeleteAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, addressId }: { customerId: string; addressId: string }) =>
      api.delete(`/customers/${customerId}/addresses/${addressId}`),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['customer', vars.customerId] }),
  })
}
