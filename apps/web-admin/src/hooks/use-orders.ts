import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface OrderAddon {
  groupName: string
  optionName: string
  price: number
}

export interface OrderItem {
  name: string
  quantity: number
  price: number
  notes: string | null
  addons: OrderAddon[]
}

export interface Order {
  id: string
  orderNumber: number
  type: 'DELIVERY' | 'PICKUP' | 'TABLE' | 'COUNTER'
  status: string
  paymentStatus: string
  paymentMethod: string | null
  changeFor: number | null
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  notes: string | null
  address: {
    street: string; number: string; complement?: string
    district: string; city: string; state: string; zipCode?: string
  } | null
  scheduledTo: string | null
  cancelReason: string | null
  createdAt: string
  customer: { name: string; phone: string } | null
  items: OrderItem[]
  deliveryman: { id: string; name: string } | null
}

// ─── GET /orders ──────────────────────────────────────────────────────────────
export function useOrders(params?: { status?: string; type?: string; scheduled?: boolean }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => {
      const q = new URLSearchParams()
      if (params?.status) q.set('status', params.status)
      if (params?.type) q.set('type', params.type)
      if (params?.scheduled !== undefined) q.set('scheduled', String(params.scheduled))
      return api.get<{ data: Order[] }>(`/orders?${q}`).then((r) => r.data.data)
    },
    refetchInterval: 30_000,
  })
}

// ─── PATCH /orders/:id/status ─────────────────────────────────────────────────
export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, cancelReason }: { id: string; status: string; cancelReason?: string }) =>
      api.patch(`/orders/${id}/status`, { status, cancelReason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}

// ─── PATCH /orders/:id/payment-status ───────────────────────────────────────────
export function useUpdatePaymentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: 'PAID' | 'PENDING' }) =>
      api.patch(`/orders/${id}/payment-status`, { paymentStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Terminais — não permitem avanço
const TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED'])

export function getNextStatus(status: string, type: string): string | null {
  if (TERMINAL_STATUSES.has(status)) return null
  const noDelivery = type === 'PICKUP' || type === 'TABLE' || type === 'COUNTER'
  const map: Record<string, string> = {
    PENDING: 'CONFIRMED',
    CONFIRMED: 'IN_PRODUCTION',
    IN_PRODUCTION: noDelivery ? 'READY_FOR_PICKUP' : 'OUT_FOR_DELIVERY',
    OUT_FOR_DELIVERY: 'DELIVERED',
    READY_FOR_PICKUP: 'DELIVERED',
  }
  return map[status] ?? null
}

export function getAdvanceLabel(status: string, type: string): string {
  const labels: Record<string, Record<string, string>> = {
    PENDING:            { default: 'Confirmar pedido' },
    CONFIRMED:          { default: 'Iniciar produção' },
    IN_PRODUCTION:      { PICKUP: 'Pronto para retirar', TABLE: 'Pronto para servir', COUNTER: 'Pronto', default: 'Saiu para entrega' },
    OUT_FOR_DELIVERY:   { default: 'Marcar entregue' },
    READY_FOR_PICKUP:   { default: 'Marcar retirado' },
  }
  const group = labels[status]
  if (!group) return ''
  return group[type] ?? group.default ?? ''
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:           { label: 'Pendente',           color: 'bg-yellow-100 text-yellow-700 border-yellow-200',  dot: 'bg-yellow-400' },
  CONFIRMED:         { label: 'Confirmado',          color: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-400' },
  IN_PRODUCTION:     { label: 'Em produção',         color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  OUT_FOR_DELIVERY:  { label: 'Saiu p/ entrega',     color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
  READY_FOR_PICKUP:  { label: 'Pronto p/ retirar',   color: 'bg-teal-100 text-teal-700 border-teal-200',       dot: 'bg-teal-400' },
  DELIVERED:         { label: 'Entregue',            color: 'bg-green-100 text-green-700 border-green-200',    dot: 'bg-green-400' },
  CANCELLED:         { label: 'Cancelado',           color: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-400' },
}

export function relativeTime(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h`
}

// Re-renderiza periodicamente para os tempos/atrasos atualizarem sem refetch.
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

const ACTIVE_FOR_AGING = new Set(['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'])
const AGING_WARN_MIN = 10
const AGING_LATE_MIN = 20

export type AgingLevel = 'ok' | 'warn' | 'late'

/** Nível de atraso de um pedido ativo, pelo tempo desde createdAt. */
export function orderAging(order: Order): { level: AgingLevel; minutes: number } {
  const minutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
  if (!ACTIVE_FOR_AGING.has(order.status)) return { level: 'ok', minutes }
  if (minutes >= AGING_LATE_MIN) return { level: 'late', minutes }
  if (minutes >= AGING_WARN_MIN) return { level: 'warn', minutes }
  return { level: 'ok', minutes }
}

/** Mais antigo primeiro (FIFO) — para os pedidos ativos não serem esquecidos. */
export function sortFifo(a: Order, b: Order): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}

/** Link wa.me a partir do telefone do cliente (só dígitos + DDI 55). */
export function whatsappLink(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  const withDdi = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withDdi}`
}
