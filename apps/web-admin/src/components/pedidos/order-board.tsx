'use client'

import { type Order, STATUS_CONFIG, sortFifo } from '@/hooks/use-orders'
import { OrderCard } from './order-card'

interface Props {
  orders: Order[]
  onAdvance: (order: Order) => void
  onCancel: (order: Order) => void
  onClick: (order: Order) => void
}

// Colunas do quadro (Saiu p/ entrega e Pronto p/ retirar juntos em "Saindo/Pronto").
const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: 'PENDING', label: 'Pendente', statuses: ['PENDING'] },
  { key: 'CONFIRMED', label: 'Confirmado', statuses: ['CONFIRMED'] },
  { key: 'IN_PRODUCTION', label: 'Em produção', statuses: ['IN_PRODUCTION'] },
  { key: 'OUT', label: 'Saindo / Pronto', statuses: ['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'] },
]

export function OrderBoard({ orders, onAdvance, onCancel, onClick }: Props) {
  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => col.statuses.includes(o.status)).sort(sortFifo)
        const dot = STATUS_CONFIG[col.statuses[0]!]?.dot ?? 'bg-muted-foreground'
        return (
          <div key={col.key} className="flex w-72 shrink-0 flex-col rounded-2xl bg-muted/40">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="text-sm font-semibold text-foreground">{col.label}</span>
              <span className="ml-auto rounded-full bg-white border px-2 py-0.5 text-xs font-bold text-muted-foreground">
                {colOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {colOrders.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">—</p>
              ) : (
                colOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onAdvance={onAdvance} onCancel={onCancel} onClick={onClick} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
