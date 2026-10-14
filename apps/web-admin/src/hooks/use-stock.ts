import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface StockProduct {
  id: string
  name: string
  stockControl: boolean
  stockQty: number | null
  minStock: number | null
  isActive: boolean
  category: { id: string; name: string }
  price: number
}

export interface StockAlert {
  id: string
  name: string
  stockQty: number | null
  minStock: number | null
  isActive: boolean
  category: { name: string }
}

export function useStockProducts() {
  return useQuery({
    queryKey: ['stock', 'products'],
    queryFn: () =>
      api
        .get<{ data: (StockProduct & { _count: { addonGroups: number } })[] }>('/products')
        .then((r) => r.data.data),
    staleTime: 30_000,
  })
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ['stock', 'alerts'],
    queryFn: () =>
      api.get<{ data: StockAlert[] }>('/products/stock-alerts').then((r) => r.data.data),
    staleTime: 30_000,
  })
}

export function useUpdateStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      stockQty?: number
      stockControl?: boolean
      minStock?: number | null
      delta?: number
    }) => api.patch(`/products/${id}/stock`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
