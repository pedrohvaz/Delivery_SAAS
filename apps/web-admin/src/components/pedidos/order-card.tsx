'use client'

import { Bike, Home, Clock, ChevronRight, Printer, MessageCircle } from 'lucide-react'
import {
  type Order,
  STATUS_CONFIG,
  getNextStatus,
  getAdvanceLabel,
  relativeTime,
  orderAging,
  whatsappLink,
  useNow,
} from '@/hooks/use-orders'
import { currency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { printOrder } from './order-ticket'

interface Props {
  order: Order
  onAdvance: (order: Order) => void
  onCancel: (order: Order) => void
  onClick: (order: Order) => void
}

export function OrderCard({ order, onAdvance, onCancel, onClick }: Props) {
  useNow() // re-renderiza p/ tempo/atraso atualizarem ao vivo
  const { store } = useAuthStore()
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PENDING']!
  const nextStatus = getNextStatus(order.status, order.type)
  const advanceLabel = getAdvanceLabel(order.status, order.type)
  const isTerminal = !nextStatus
  const isCancelled = order.status === 'CANCELLED'

  const aging = orderAging(order)
  const waLink = whatsappLink(order.customer?.phone)

  const itemsSummary = order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')

  const borderClass =
    aging.level === 'late'
      ? 'border-red-300 ring-1 ring-red-200'
      : order.status === 'PENDING'
        ? 'border-yellow-300 ring-1 ring-yellow-200'
        : ''

  const timeClass =
    aging.level === 'late'
      ? 'text-red-600 font-bold animate-pulse'
      : aging.level === 'warn'
        ? 'text-amber-600 font-semibold'
        : 'text-muted-foreground'

  return (
    <div
      className={`rounded-2xl border bg-card p-4 space-y-3 transition hover:shadow-md cursor-pointer ${borderClass}`}
      onClick={() => onClick(order)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">#{order.orderNumber}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {order.type === 'DELIVERY' ? <Bike className="h-3.5 w-3.5" /> : <Home className="h-3.5 w-3.5" />}
            {order.type === 'DELIVERY' ? 'Entrega' : order.type === 'TABLE' ? 'Mesa' : order.type === 'COUNTER' ? 'Balcão' : 'Retirada'}
          </span>
        </div>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" title="Falar no WhatsApp"
              className="flex h-7 w-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-green-50 hover:text-green-600 transition">
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
          <button onClick={() => store && printOrder(order, store.name)} title="Imprimir comanda"
            className="flex h-7 w-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted transition">
            <Printer className="h-3.5 w-3.5" />
          </button>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Cliente */}
      <div>
        <p className="text-sm font-medium text-foreground">{order.customer?.name ?? '—'}</p>
        {order.customer?.phone && <p className="text-xs text-muted-foreground">{order.customer.phone}</p>}
      </div>

      {/* Itens */}
      <p className="text-xs text-muted-foreground line-clamp-2">{itemsSummary}</p>

      {/* Total + tempo */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-primary">{currency(order.total)}</span>
        <span className={`flex items-center gap-1 text-xs ${timeClass}`}>
          <Clock className="h-3 w-3" />
          {relativeTime(order.createdAt)}
        </span>
      </div>

      {/* Ações */}
      {!isCancelled && (
        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          {nextStatus && (
            <button
              onClick={() => onAdvance(order)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              {advanceLabel}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
          {!isTerminal && (
            <button
              onClick={() => onCancel(order)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
}
