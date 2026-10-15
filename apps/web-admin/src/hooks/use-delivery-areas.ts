import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type AreaType = 'DISTRICT' | 'RADIUS' | 'DISTANCE' | 'POLYGON'

export interface DeliveryArea {
  id: string
  name: string | null
  type: AreaType
  fee: number
  minOrder: number
  freeFrom: number | null
  district: string | null
  radiusKm: number | null
  baseKm: number | null
  perKmFee: number | null
  isActive: boolean
}

export type DeliveryAreaInput = {
  type: Exclude<AreaType, 'POLYGON'>
  name?: string | null
  district?: string | null
  radiusKm?: number | null
  baseKm?: number | null
  perKmFee?: number | null
  fee: number
  minOrder: number
  freeFrom?: number | null
  isActive: boolean
}

export interface StoreLocation {
  lat: number | null
  lng: number | null
  address: string | null
  number: string | null
  district: string | null
  city: string | null
  state: string | null
  zipCode: string | null
}

export interface DeliveryQuote {
  available: boolean
  fee: number
  baseFee: number
  distanceKm: number | null
  minOrder: number
  belowMinOrder: boolean
  areaType: string | null
  areaLabel: string | null
  freeFrom: number | null
  distanceUnknown: boolean
  message: string | null
}

const invalidate = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ['delivery-areas'] })

export function useDeliveryAreas() {
  return useQuery({
    queryKey: ['delivery-areas'],
    queryFn: () => api.get<{ data: DeliveryArea[] }>('/delivery-areas').then((r) => r.data.data),
  })
}

export function useCreateDeliveryArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DeliveryAreaInput) =>
      api.post<{ data: DeliveryArea }>('/delivery-areas', data).then((r) => r.data.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useBulkDistricts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { districts: string[]; fee: number; minOrder: number; freeFrom?: number | null }) =>
      api.post<{ data: { created: number; skipped: string[] } }>('/delivery-areas/bulk', data).then((r) => r.data.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateDeliveryArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<DeliveryAreaInput> & { id: string }) =>
      api.patch(`/delivery-areas/${id}`, data),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteDeliveryArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/delivery-areas/${id}`),
    onSuccess: () => invalidate(qc),
  })
}

export function useStoreLocation() {
  return useQuery({
    queryKey: ['delivery-areas', 'store-location'],
    queryFn: () => api.get<{ data: StoreLocation }>('/delivery-areas/store-location').then((r) => r.data.data),
  })
}

export function useSaveStoreLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { lat: number; lng: number } | { fromAddress: true }) =>
      api.put<{ data: { lat: number; lng: number } }>('/delivery-areas/store-location', body).then((r) => r.data.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeliveryQuote() {
  return useMutation({
    mutationFn: (body: { district?: string; street?: string; number?: string; city?: string; zipCode?: string; subtotal: number }) =>
      api.post<{ data: DeliveryQuote }>('/delivery-areas/quote', body).then((r) => r.data.data),
  })
}
