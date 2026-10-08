import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface PaymentMethod {
  id: string
  type: string
  label: string
  isActive: boolean
}

export interface StoreSettings {
  asaasApiKey: string | null
  asaasSandbox: boolean
  minOrderValue: number
  estimatedTime: number
  isOpen: boolean
  acceptOrders: boolean
  evolutionApiUrl: string | null
  evolutionApiKey: string | null
  evolutionInstance: string | null
  mpAccessToken: string | null
  mpPublicKey: string | null
  mpSandbox: boolean
  primaryColor: string
  layoutStyle: 'grid' | 'list'
  bannerUrl: string | null
  logoUrl: string | null
  facebookPixelId: string | null
  googleTagManagerId: string | null
  storeNotice: string | null
  storeNoticeType: string | null
  orderSoundUrl: string | null
  customDomain: string | null
  paymentMethods: PaymentMethod[]
}

// ─── GET /settings ────────────────────────────────────────────────────────────
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ data: StoreSettings }>('/settings').then((r) => r.data.data),
  })
}

// ─── PATCH /settings ──────────────────────────────────────────────────────────
export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Omit<StoreSettings, 'paymentMethods' | 'isOpen' | 'acceptOrders'>>) =>
      api.patch<{ data: StoreSettings }>('/settings', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

// ─── PATCH /settings/payment-methods/:id ──────────────────────────────────────
export function useTogglePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/settings/payment-methods/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

// ─── POST /settings/payment-methods ───────────────────────────────────────────
export function useCreatePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { type: string; label: string }) =>
      api.post<{ data: PaymentMethod }>('/settings/payment-methods', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

// ─── GET/PATCH /settings/store-info ──────────────────────────────────────────

export interface StoreInfo {
  name: string; phone: string | null; whatsapp: string | null
  address: string | null; number: string | null; complement: string | null
  district: string | null; city: string | null; state: string | null; zipCode: string | null
  description: string | null; instagram: string | null; facebook: string | null
}

export function useStoreInfo() {
  return useQuery({
    queryKey: ['store-info'],
    queryFn: () => api.get<{ data: StoreInfo }>('/settings/store-info').then((r) => r.data.data),
  })
}

export function useUpdateStoreInfo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<StoreInfo>) =>
      api.patch<{ data: StoreInfo }>('/settings/store-info', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-info'] }),
  })
}

// ─── DELETE /settings/payment-methods/:id ─────────────────────────────────────
export function useDeletePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/settings/payment-methods/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}
