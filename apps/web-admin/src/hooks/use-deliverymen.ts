import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Deliveryman {
  id: string
  name: string
  phone: string | null
  vehicle: string | null
  isActive: boolean
  commission: number
  commissionType: 'PERCENT' | 'FIXED'
  plate: string | null
  createdAt: string
  _count: { orders: number }
}

export interface DeliverymanStats {
  deliverymanId: string
  deliveries: number
  fees: number
  ordersTotal: number
  toPay: number
  inRoute: number
}

export interface DeliveryRow {
  id: string
  orderNumber: number
  status: string
  createdAt: string
  paymentMethod: string | null
  customer: string | null
  district: string | null
  address: string | null
  deliveryFee: number
  total: number
  toPay: number
}

export function useDeliverymenReport(from: string, to: string) {
  return useQuery({
    queryKey: ['deliverymen', 'report', from, to],
    queryFn: () => api.get<{ data: DeliverymanStats[]; meta: { from: string; to: string; totals: { deliveries: number; toPay: number; fees: number; inRoute: number }; unassigned: number } }>(
      '/deliverymen/report', { params: { from, to } }).then((r) => r.data),
    refetchInterval: 60_000,
  })
}

export function useDeliverymanDeliveries(id: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['deliverymen', 'deliveries', id, from, to],
    enabled: !!id,
    queryFn: () => api.get<{ data: DeliveryRow[] }>(`/deliverymen/${id}/deliveries`, { params: { from, to } }).then((r) => r.data.data),
  })
}

export function useDeliverymen() {
  return useQuery({
    queryKey: ['deliverymen'],
    queryFn: () => api.get<{ data: Deliveryman[] }>('/deliverymen').then((r) => r.data.data),
  })
}

export function useCreateDeliveryman() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Deliveryman, 'id' | '_count' | 'createdAt'>) =>
      api.post<{ data: Deliveryman }>('/deliverymen', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliverymen'] }),
  })
}

export function useUpdateDeliveryman() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Omit<Deliveryman, '_count'>> & { id: string }) =>
      api.patch(`/deliverymen/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliverymen'] }),
  })
}

export function useDeleteDeliveryman() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deliverymen/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliverymen'] }),
  })
}

export function useAssignDeliveryman() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, deliverymanId }: { orderId: string; deliverymanId: string | null }) =>
      api.patch(`/orders/${orderId}/deliveryman`, { deliverymanId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}
