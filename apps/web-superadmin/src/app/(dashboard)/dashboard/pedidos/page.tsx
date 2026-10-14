'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING',          label: 'Pendente' },
  { value: 'CONFIRMED',        label: 'Confirmado' },
  { value: 'IN_PRODUCTION',    label: 'Em produção' },
  { value: 'OUT_FOR_DELIVERY', label: 'Saiu p/ entrega' },
  { value: 'READY_FOR_PICKUP', label: 'Pronto p/ retirada' },
  { value: 'DELIVERED',        label: 'Entregue' },
  { value: 'CANCELLED',        label: 'Cancelado' },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING:          'bg-yellow-50 text-yellow-700',
  CONFIRMED:        'bg-blue-50 text-blue-700',
  IN_PRODUCTION:    'bg-orange-50 text-orange-700',
  OUT_FOR_DELIVERY: 'bg-purple-50 text-purple-700',
  READY_FOR_PICKUP: 'bg-indigo-50 text-indigo-700',
  DELIVERED:        'bg-green-50 text-green-700',
  CANCELLED:        'bg-red-50 text-red-700',
}

const TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'Entrega', PICKUP: 'Retirada', TABLE: 'Mesa', COUNTER: 'Balcão',
}

export default function PedidosPage() {
  const [page, setPage] = useState(1)
  const [storeId, setStoreId] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const params = new URLSearchParams({ page: String(page) })
  if (storeId) params.set('storeId', storeId)
  if (status)  params.set('status', status)
  if (from)    params.set('from', from)
  if (to)      params.set('to', to)

  const { data, isLoading } = useQuery({
    queryKey: ['sa-orders', page, storeId, status, from, to],
    queryFn: () => api.get<{ data: any[]; total: number; totalPages: number }>(`/super-admin/orders?${params}`).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const { data: storesData } = useQuery({
    queryKey: ['sa-stores-select'],
    queryFn: () => api.get<{ data: any[] }>('/super-admin/stores?page=1').then((r) => r.data.data),
  })

  function resetFilters() {
    setStoreId(''); setStatus(''); setFrom(''); setTo(''); setPage(1)
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
        <p className="text-sm text-muted-foreground mt-1">Todos os pedidos do SaaS</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Loja</label>
          <select
            value={storeId}
            onChange={(e) => { setStoreId(e.target.value); setPage(1) }}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas as lojas</option>
            {(storesData ?? []).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {(storeId || status || from || to) && (
          <button onClick={resetFilters} className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground border rounded-md hover:bg-muted transition-colors">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loja</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nº</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Valor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum pedido encontrado.</td></tr>
            )}
            {data?.data.map((o: any) => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/lojas/${o.store.id}`} className="font-medium text-foreground hover:underline">
                    {o.store.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">#{o.orderNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.customer?.name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[o.type] ?? o.type}</td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground')}>
                    {STATUS_OPTIONS.find((s) => s.value === o.status)?.label ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-3">R$ {Number(o.total).toFixed(2).replace('.', ',')}</td>
                <td className="px-4 py-3 text-muted-foreground">{format(new Date(o.createdAt), 'dd/MM/yy HH:mm')}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {/* Paginação */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.total} pedidos no total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded-md hover:bg-muted disabled:opacity-40">Anterior</button>
            <span className="px-3 py-1.5">{page} / {data.totalPages}</span>
            <button disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded-md hover:bg-muted disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}
    </div>
  )
}
