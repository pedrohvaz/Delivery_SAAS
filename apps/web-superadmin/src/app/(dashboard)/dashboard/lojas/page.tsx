'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Search, Store, ToggleLeft, ToggleRight, ExternalLink, ShieldOff, ShieldCheck, Trash2, X, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface StoreItem {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  city: string | null
  state: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  isOpen: boolean
  acceptOrders: boolean
  suspendReason: string | null
  createdAt: string
  _count: { orders: number; users: number }
}

// Modal de suspensão
function SuspendModal({ store, onClose, onConfirm, loading }: {
  store: StoreItem; onClose: () => void; onConfirm: (reason: string) => void; loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
            <ShieldOff className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Suspender loja</h2>
            <p className="text-sm text-muted-foreground">{store.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground">A loja ficará invisível e não aceitará pedidos. O lojista precisará entrar em contato para reativar.</p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Motivo (opcional)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="Ex: Inadimplência, violação dos termos..."
            className="w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => onConfirm(reason)} disabled={loading}
            className="flex-1 h-10 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition disabled:opacity-50">
            {loading ? 'Suspendendo...' : 'Confirmar suspensão'}
          </button>
          <button onClick={onClose} className="h-10 px-4 rounded-xl border text-sm hover:bg-muted transition">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// Modal de exclusão
function DeleteModal({ store, onClose, onConfirm, loading }: {
  store: StoreItem; onClose: () => void; onConfirm: () => void; loading: boolean
}) {
  const [typed, setTyped] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-red-700">Excluir loja permanentemente</h2>
            <p className="text-sm text-muted-foreground">{store.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          ⚠ Esta ação é <strong>irreversível</strong>. Todos os dados da loja (pedidos, clientes, cardápio) serão apagados.
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Digite o slug da loja para confirmar: <code className="bg-muted px-1 rounded">{store.slug}</code></label>
          <input value={typed} onChange={e => setTyped(e.target.value)} placeholder={store.slug}
            className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/40" />
        </div>
        <div className="flex gap-2">
          <button onClick={onConfirm} disabled={loading || typed !== store.slug}
            className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
            {loading ? 'Excluindo...' : 'Excluir loja'}
          </button>
          <button onClick={onClose} className="h-10 px-4 rounded-xl border text-sm hover:bg-muted transition">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export default function LojasPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [suspendStore, setSuspendStore] = useState<StoreItem | null>(null)
  const [deleteStore, setDeleteStore] = useState<StoreItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sa-stores', page, search],
    queryFn: () =>
      api.get<{ data: StoreItem[]; total: number; totalPages: number }>(
        `/super-admin/stores?page=${page}&search=${search}`,
      ).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const toggleAccept = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/stores/${id}/toggle-accept`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-stores'] }),
  })

  const toggleOpen = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/stores/${id}/toggle-open`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-stores'] }),
  })

  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/super-admin/stores/${id}/suspend`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-stores'] }); setSuspendStore(null) },
  })

  const activate = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/stores/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-stores'] }),
  })

  const deleteStore2 = useMutation({
    mutationFn: (id: string) => api.delete(`/super-admin/stores/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-stores'] }); setDeleteStore(null) },
  })

  const allStores = data?.data ?? []
  const stores = allStores.filter(s => {
    if (filter === 'active') return s.status === 'ACTIVE'
    if (filter === 'suspended') return s.status === 'SUSPENDED'
    return true
  })

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lojas</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie todas as lojas do SaaS</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nome ou slug..."
            className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex rounded-xl border bg-muted/30 p-0.5 gap-0.5">
          {([['all', 'Todas'], ['active', 'Ativas'], ['suspended', 'Suspensas']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === v ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loja</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cidade</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pedidos</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cadastro</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aceitar</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>}
            {!isLoading && stores.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma loja encontrada.</td></tr>}
            {stores.map((store) => (
              <tr key={store.id} className={cn('border-b last:border-0 hover:bg-muted/20 transition-colors', store.status === 'SUSPENDED' && 'bg-orange-50/50')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-8 w-8 object-cover" /> : <Store className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{store.name}</p>
                      <p className="text-xs text-muted-foreground">/{store.slug}</p>
                    </div>
                    {store.status === 'SUSPENDED' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        <ShieldOff className="h-3 w-3" /> Suspensa
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{store.city && store.state ? `${store.city}, ${store.state}` : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{store._count.orders}</td>
                <td className="px-4 py-3 text-muted-foreground">{format(new Date(store.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleOpen.mutate(store.id)} disabled={store.status === 'SUSPENDED'}
                    className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-40',
                      store.isOpen ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                    {store.isOpen ? <><ToggleRight className="h-3.5 w-3.5" />Aberta</> : <><ToggleLeft className="h-3.5 w-3.5" />Fechada</>}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleAccept.mutate(store.id)} disabled={store.status === 'SUSPENDED'}
                    className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-40',
                      store.acceptOrders ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-red-50 text-red-700 hover:bg-red-100')}>
                    {store.acceptOrders ? 'Sim' : 'Não'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Link href={`/dashboard/lojas/${store.id}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mr-1">
                      <ExternalLink className="h-3 w-3" />Detalhes
                    </Link>
                    {store.status === 'SUSPENDED' ? (
                      <button onClick={() => activate.mutate(store.id)} disabled={activate.isPending}
                        className="flex items-center gap-1 text-xs text-green-700 hover:underline font-medium">
                        <ShieldCheck className="h-3.5 w-3.5" /> Reativar
                      </button>
                    ) : (
                      <button onClick={() => setSuspendStore(store)}
                        className="flex items-center gap-1 text-xs text-orange-600 hover:underline font-medium">
                        <ShieldOff className="h-3.5 w-3.5" /> Suspender
                      </button>
                    )}
                    <button onClick={() => setDeleteStore(store)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:underline font-medium ml-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.total} lojas no total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-md hover:bg-muted disabled:opacity-40">Anterior</button>
            <span className="px-3 py-1.5">{page} / {data.totalPages}</span>
            <button disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-md hover:bg-muted disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}

      {suspendStore && (
        <SuspendModal store={suspendStore} onClose={() => setSuspendStore(null)}
          onConfirm={(reason) => suspend.mutate({ id: suspendStore.id, reason })}
          loading={suspend.isPending} />
      )}
      {deleteStore && (
        <DeleteModal store={deleteStore} onClose={() => setDeleteStore(null)}
          onConfirm={() => deleteStore2.mutate(deleteStore.id)}
          loading={deleteStore2.isPending} />
      )}
    </div>
  )
}
