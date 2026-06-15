'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Bell, RotateCcw, AlertTriangle, X, LayoutGrid, Columns3 } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { useOrders, useUpdateOrderStatus, STATUS_CONFIG, getNextStatus, type Order } from '@/hooks/use-orders'
import { OrderCard } from '@/components/pedidos/order-card'
import { OrderBoard } from '@/components/pedidos/order-board'
import { OrderModal } from '@/components/pedidos/order-modal'
import { useAuthStore } from '@/store/auth'
import { createSocket, playNewOrderSound } from '@/lib/socket'

type Tab = 'active' | 'scheduled' | 'done'

const ACTIVE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'])
const DONE_STATUSES = new Set(['DELIVERED', 'CANCELLED'])

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'IN_PRODUCTION', label: 'Em produção' },
  { value: 'OUT_FOR_DELIVERY', label: 'Saiu p/ entrega' },
  { value: 'READY_FOR_PICKUP', label: 'Pronto p/ retirar' },
]

export default function PedidosPage() {
  const { accessToken } = useAuthStore()
  const qc = useQueryClient()
  const updateStatus = useUpdateOrderStatus()

  const [tab, setTab] = useState<Tab>('active')
  const [view, setView] = useState<'board' | 'grid'>('board')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')

  // Preferência de visualização (Quadro/Grade) persistida
  useEffect(() => {
    const saved = localStorage.getItem('pedidos-view')
    if (saved === 'board' || saved === 'grid') setView(saved)
  }, [])
  function changeView(v: 'board' | 'grid') {
    setView(v)
    localStorage.setItem('pedidos-view', v)
  }
  const [showNoticeInput, setShowNoticeInput] = useState(false)
  const [noticeMsg, setNoticeMsg] = useState('')
  const createNotice = useMutation({
    mutationFn: (message: string) => api.post('/notices', { message, type: 'warning' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['internal-notices'] }); setNoticeMsg(''); setShowNoticeInput(false) },
  })
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [openingCancellation, setOpeningCancellation] = useState(false)
  const [newOrderCount, setNewOrderCount] = useState(0)

  const socketRef = useRef<Socket | null>(null)

  // ── Socket.io ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return

    const socket = createSocket(accessToken)
    socketRef.current = socket

    socket.on('new_order', () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      playNewOrderSound()
      setNewOrderCount((n) => n + 1)
    })

    socket.on('order_updated', () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
    })

    return () => {
      socket.disconnect()
    }
  }, [accessToken, qc])

  // ── Dados ──────────────────────────────────────────────────────────
  // Busca os dois conjuntos (normais e agendados) para os contadores das abas
  // ficarem corretos independente da aba ativa.
  const regular = useOrders()
  const scheduled = useOrders({ scheduled: true })
  const allOrders = tab === 'scheduled' ? (scheduled.data ?? []) : (regular.data ?? [])
  const isLoading = tab === 'scheduled' ? scheduled.isLoading : regular.isLoading
  const isFetching = regular.isFetching || scheduled.isFetching
  const refetch = () => { regular.refetch(); scheduled.refetch() }

  // Filtra client-side por tab + statusFilter + search
  const filteredOrders = allOrders.filter((order) => {
    if (tab === 'active' && !ACTIVE_STATUSES.has(order.status)) return false
    if (tab === 'done' && !DONE_STATUSES.has(order.status)) return false
    if (statusFilter && order.status !== statusFilter) return false
    if (typeFilter && order.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matches =
        String(order.orderNumber).includes(q) ||
        (order.customer?.name.toLowerCase().includes(q) ?? false) ||
        (order.customer?.phone?.includes(q) ?? false)
      if (!matches) return false
    }
    return true
  })

  const regularOrders = regular.data ?? []
  const activeCount = regularOrders.filter((o) => ACTIVE_STATUSES.has(o.status)).length
  const doneCount = regularOrders.filter((o) => DONE_STATUSES.has(o.status)).length
  const scheduledCount = (scheduled.data ?? []).length
  const pendingCount = regularOrders.filter((o) => o.status === 'PENDING').length

  // Avisos internos
  const { data: notices = [] } = useQuery({
    queryKey: ['internal-notices'],
    queryFn: () => api.get<{ data: any[] }>('/notices').then(r => r.data.data),
    refetchInterval: 60_000,
  })
  const deleteNotice = useMutation({
    mutationFn: (id: string) => api.delete(`/notices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['internal-notices'] }),
  })

  function handleTabChange(t: Tab) {
    setTab(t)
    setStatusFilter('')
    setTypeFilter('')
    if (t === 'active') setNewOrderCount(0)
  }

  const handleAdvance = useCallback(async (order: Order) => {
    const next = getNextStatus(order.status, order.type)
    if (!next) return
    await updateStatus.mutateAsync({ id: order.id, status: next })
  }, [updateStatus])

  const handleCancel = useCallback((order: Order) => {
    setOpeningCancellation(true)
    setSelectedOrder(order)
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-700">
              <Bell className="h-3 w-3" />
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
          {newOrderCount > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground animate-pulse">
              +{newOrderCount} novo{newOrderCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {newOrderCount > 0 && (
            <button onClick={() => setNewOrderCount(0)}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition">
              <RotateCcw className="h-3.5 w-3.5" /> Zerar (+{newOrderCount})
            </button>
          )}
          {showNoticeInput ? (
            <div className="flex items-center gap-1.5">
              <input value={noticeMsg} onChange={e => setNoticeMsg(e.target.value)} placeholder="Aviso para a equipe..."
                className="h-9 w-48 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={() => createNotice.mutate(noticeMsg)} disabled={!noticeMsg.trim() || createNotice.isPending}
                className="h-9 px-3 rounded-xl bg-yellow-500 text-white text-xs font-semibold hover:bg-yellow-600 disabled:opacity-50 transition">Publicar</button>
              <button onClick={() => { setShowNoticeInput(false); setNoticeMsg('') }}
                className="h-9 w-9 flex items-center justify-center rounded-xl border hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <button onClick={() => setShowNoticeInput(true)}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs text-muted-foreground hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700 transition">
              <AlertTriangle className="h-3.5 w-3.5" /> Aviso interno
            </button>
          )}
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 transition">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Avisos internos */}
      {notices.length > 0 && (
        <div className="px-6 py-2 space-y-1.5">
          {notices.map((n: any) => (
            <div key={n.id} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm ${n.type === 'urgent' ? 'bg-red-50 border border-red-200 text-red-800' : n.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{n.message}</span>
              <button onClick={() => deleteNotice.mutate(n.id)} className="p-0.5 hover:opacity-70"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b bg-white px-6">
        {[
          { key: 'active' as Tab, label: `Ativos (${activeCount})` },
          { key: 'scheduled' as Tab, label: `Agendados (${scheduledCount})` },
          { key: 'done' as Tab, label: `Finalizados (${doneCount})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtros de status + tipo + busca */}
      <div className="flex flex-col gap-2 border-b bg-muted/30 px-6 py-3">
        {tab === 'active' && (
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-white border text-muted-foreground hover:border-primary/40'}`}>
                {f.label}
                {f.value && STATUS_CONFIG[f.value] && (
                  <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[f.value]!.dot}`} />
                )}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Filtro por tipo */}
          <div className="flex gap-1 rounded-xl border bg-white p-0.5">
            {[['', 'Todos'], ['DELIVERY', '🛵 Entrega'], ['PICKUP', '🏠 Retirada'], ['TABLE', '🪑 Mesa'], ['COUNTER', '🧾 Balcão']].map(([v, l]) => (
              <button key={v} onClick={() => setTypeFilter(v)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${typeFilter === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {l}
              </button>
            ))}
          </div>
          <input
            className="h-9 flex-1 min-w-[180px] rounded-xl border bg-white px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Buscar por nome, número ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {tab === 'active' && (
            <div className="flex gap-0.5 rounded-xl border bg-white p-0.5">
              <button onClick={() => changeView('board')} title="Quadro"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${view === 'board' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Columns3 className="h-4 w-4" />
              </button>
              <button onClick={() => changeView('grid')} title="Grade"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pedidos: quadro (Kanban) nos Ativos ou grade */}
      {tab === 'active' && view === 'board' && !isLoading && filteredOrders.length > 0 ? (
        <div className="flex-1 overflow-hidden px-6 py-4">
          <OrderBoard
            orders={filteredOrders}
            onAdvance={handleAdvance}
            onCancel={handleCancel}
            onClick={setSelectedOrder}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
              <div className="text-5xl">📋</div>
              <p className="font-semibold text-foreground">Nenhum pedido encontrado</p>
              <p className="text-sm text-muted-foreground">
                {tab === 'active' ? 'Aguardando novos pedidos...' : 'Sem pedidos nesta categoria.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAdvance={handleAdvance}
                  onCancel={handleCancel}
                  onClick={setSelectedOrder}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de detalhes */}
      <OrderModal
        order={selectedOrder}
        onClose={() => { setSelectedOrder(null); setOpeningCancellation(false) }}
        initialCancelling={openingCancellation}
      />
    </div>
  )
}
