'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { ChefHat, Clock, Bike, Home, CheckCircle2, RefreshCw, LayoutGrid } from 'lucide-react'
import { useOrders, useUpdateOrderStatus, type Order } from '@/hooks/use-orders'
import { useAuthStore } from '@/store/auth'
import { createSocket, playNewOrderSound } from '@/lib/socket'

// ─── Cores por status ──────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { label: string; card: string; badge: string; border: string }> = {
  PENDING:      { label: 'Pendente',     card: 'bg-yellow-950/60', badge: 'bg-yellow-500 text-yellow-950', border: 'border-yellow-500/40' },
  CONFIRMED:    { label: 'Confirmado',   card: 'bg-blue-950/60',   badge: 'bg-blue-500 text-blue-950',    border: 'border-blue-500/40' },
  IN_PRODUCTION:{ label: 'Produzindo',   card: 'bg-orange-950/60', badge: 'bg-orange-500 text-white',     border: 'border-orange-500/60' },
}

type TypeFilter = 'ALL' | 'DELIVERY' | 'PICKUP'

// ─── Hook: timer em segundos por pedido ───────────────────────────────────────
function useOrderAge(createdAt: string): string {
  const [age, setAge] = useState(0)

  useEffect(() => {
    const initial = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
    setAge(initial)
    const interval = setInterval(() => setAge((a) => a + 1), 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const m = Math.floor(age / 60)
  const s = age % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Cor do timer (verde → amarelo → vermelho) ────────────────────────────────
function timerColor(createdAt: string): string {
  const min = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (min < 15) return 'text-green-400'
  if (min < 30) return 'text-yellow-400'
  return 'text-red-400 animate-pulse'
}

// ─── Card de pedido ───────────────────────────────────────────────────────────
function KdsCard({ order, onAdvance }: { order: Order; onAdvance: (id: string, next: string) => void }) {
  const style = STATUS_STYLE[order.status] ?? STATUS_STYLE['PENDING']!
  const timer = useOrderAge(order.createdAt)
  const color = timerColor(order.createdAt)

  const nextStatus: Record<string, string> = {
    PENDING:       'CONFIRMED',
    CONFIRMED:     'IN_PRODUCTION',
    IN_PRODUCTION: order.type === 'PICKUP' ? 'READY_FOR_PICKUP' : 'OUT_FOR_DELIVERY',
  }
  const advanceLabel: Record<string, string> = {
    PENDING:       'Confirmar',
    CONFIRMED:     'Iniciar',
    IN_PRODUCTION: order.type === 'PICKUP' ? 'Pronto p/ retirar' : 'Saiu p/ entrega',
  }

  const next = nextStatus[order.status]
  const label = advanceLabel[order.status] ?? ''

  return (
    <div className={`flex flex-col rounded-2xl border ${style.border} ${style.card} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-white">#{order.orderNumber}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${style.badge}`}>
            {style.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {order.type === 'DELIVERY'
            ? <Bike className="h-4 w-4 text-blue-400" />
            : <Home className="h-4 w-4 text-green-400" />
          }
          <span className={`font-mono text-sm font-bold ${color}`}>{timer}</span>
        </div>
      </div>

      {/* Cliente */}
      {order.customer && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Cliente</p>
          <p className="text-sm font-semibold text-white truncate">{order.customer.name}</p>
        </div>
      )}

      {/* Itens */}
      <div className="flex-1 px-4 py-3 space-y-1.5">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Itens</p>
        {order.items.map((item, i) => (
          <div key={i}>
            <div className="flex items-start gap-2 text-sm">
              <span className="font-black text-white shrink-0 w-5 text-right">{item.quantity}×</span>
              <div className="flex-1">
                <span className="font-semibold text-white">{item.name}</span>
                {item.addons.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.addons.map((a) => a.optionName).join(' · ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-yellow-300 mt-0.5 italic">⚠ {item.notes}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Obs do pedido */}
      {order.notes && (
        <div className="mx-4 mb-3 rounded-xl bg-yellow-900/40 border border-yellow-700/30 px-3 py-2">
          <p className="text-xs text-yellow-300 italic">⚠ {order.notes}</p>
        </div>
      )}

      {/* Botão avançar */}
      {next && (
        <button
          onClick={() => onAdvance(order.id, next)}
          className="flex items-center justify-center gap-2 border-t border-white/10 py-3 text-sm font-bold text-white hover:bg-white/10 active:bg-white/20 transition"
        >
          <CheckCircle2 className="h-4 w-4" />
          {label}
        </button>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const KDS_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION']

export default function KdsPage() {
  const { accessToken, store } = useAuthStore()
  const qc = useQueryClient()
  const updateStatus = useUpdateOrderStatus()
  const socketRef = useRef<Socket | null>(null)

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Busca pedidos dos 3 status relevantes para cozinha
  const { data: allOrders = [], isLoading } = useOrders()

  const kdsOrders = allOrders
    .filter((o) => KDS_STATUSES.includes(o.status))
    .filter((o) => typeFilter === 'ALL' || o.type === typeFilter)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) // mais antigos primeiro

  // Socket.io
  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['orders'] })
    setLastUpdate(new Date())
  }, [qc])

  useEffect(() => {
    if (!accessToken) return
    const socket = createSocket(accessToken)
    socketRef.current = socket
    socket.on('new_order', () => { refresh(); playNewOrderSound() })
    socket.on('order_updated', () => refresh())
    return () => { socket.disconnect(); socketRef.current = null }
  }, [accessToken, refresh])

  async function handleAdvance(id: string, next: string) {
    await updateStatus.mutateAsync({ id, status: next }).catch(() => {}) // erro já avisado no hook
  }

  // Contadores por status
  const countByStatus = KDS_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = kdsOrders.filter((o) => o.status === s).length
    return acc
  }, {})

  return (
    <div className="flex flex-col h-screen">
      {/* Header fixo */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-white/10 px-3 sm:px-6 py-3 bg-gray-900 shrink-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <ChefHat className="h-6 w-6 text-orange-400" />
          <div>
            <h1 className="font-black text-white text-lg leading-none">KDS</h1>
            <p className="text-xs text-gray-400">{store?.name ?? 'Cozinha'}</p>
          </div>
          {/* Contadores */}
          <div className="flex items-center gap-2 sm:ml-4 overflow-x-auto max-w-full">
            {[
              { key: 'PENDING', label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
              { key: 'CONFIRMED', label: 'Confirmado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
              { key: 'IN_PRODUCTION', label: 'Produzindo', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
            ].map(({ key, label, color }) => (
              <span key={key} className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${color}`}>
                {countByStatus[key] ?? 0} {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Filtro tipo */}
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 gap-1">
            {([['ALL', 'Todos'], ['DELIVERY', '🛵 Entrega'], ['PICKUP', '🏠 Retirada']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setTypeFilter(v)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors
                  ${typeFilter === v ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Atualizado */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          <button onClick={refresh} aria-label="Atualizar"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Grid de pedidos */}
      <main className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : kdsOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
            <LayoutGrid className="h-16 w-16" />
            <div className="text-center">
              <p className="text-xl font-bold text-gray-500">Cozinha livre</p>
              <p className="text-sm mt-1">Nenhum pedido em andamento{typeFilter !== 'ALL' ? ` (${typeFilter === 'DELIVERY' ? 'entrega' : 'retirada'})` : ''}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-start">
            {kdsOrders.map((order) => (
              <KdsCard key={order.id} order={order} onAdvance={handleAdvance} />
            ))}
          </div>
        )}
      </main>

      {/* Footer com total */}
      {kdsOrders.length > 0 && (
        <footer className="border-t border-white/10 bg-gray-900 px-6 py-2 shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {kdsOrders.length} pedido{kdsOrders.length !== 1 ? 's' : ''} na cozinha
          </p>
          <p className="text-xs text-gray-600">
            Ordenado por horário de chegada — mais antigos primeiro
          </p>
        </footer>
      )}
    </div>
  )
}
