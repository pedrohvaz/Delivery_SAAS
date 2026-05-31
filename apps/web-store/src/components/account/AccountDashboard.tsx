'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'
import { ShoppingBag, MapPin, ChevronRight, Trash2, Plus } from 'lucide-react'
import { cn } from '@delivery/ui'
import { useCustomerAuth } from '@/store/customer-auth'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:          { label: 'Pendente',       color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED:        { label: 'Confirmado',      color: 'bg-blue-100 text-blue-700' },
  IN_PRODUCTION:    { label: 'Em produção',     color: 'bg-orange-100 text-orange-700' },
  OUT_FOR_DELIVERY: { label: 'Saindo',          color: 'bg-purple-100 text-purple-700' },
  READY_FOR_PICKUP: { label: 'Pronto',          color: 'bg-indigo-100 text-indigo-700' },
  DELIVERED:        { label: 'Entregue',        color: 'bg-green-100 text-green-700' },
  CANCELLED:        { label: 'Cancelado',       color: 'bg-red-100 text-red-700' },
}

interface AccountAddress {
  id: string; label: string | null; street: string; number: string; complement: string | null
  district: string; city: string; state: string; zipCode: string; isDefault: boolean
}

interface AccountOrder {
  id: string; orderNumber: number; status: string; total: number; type: string; createdAt: string
  store: { name: string; slug: string; logoUrl: string | null }
  items: { name: string; quantity: number }[]
}

function AddAddressForm({ onDone }: { onDone: () => void }) {
  const [label, setLabel] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchCep(cep: string) {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await r.json()
      if (!data.erro) {
        setStreet(data.logradouro ?? ''); setDistrict(data.bairro ?? '')
        setCity(data.localidade ?? ''); setState(data.uf ?? '')
      }
    } catch { /* ignora */ }
  }

  async function handleSave() {
    setError('')
    if (!street || !number || !district || !city || !state || !zipCode) { setError('Preencha o endereço completo'); return }
    setLoading(true)
    try {
      await api.post('/customer/addresses', { label: label || undefined, street, number, complement: complement || undefined, district, city, state, zipCode })
      onDone()
    } catch {
      setError('Não foi possível salvar o endereço')
    } finally { setLoading(false) }
  }

  const field = 'h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <div className="rounded-2xl bg-white border p-4 space-y-2">
      <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome (ex.: Casa, Trabalho)" className={field} />
      <input value={zipCode} onChange={e => { setZipCode(e.target.value); fetchCep(e.target.value) }} placeholder="CEP" inputMode="numeric" className={field} />
      <div className="grid grid-cols-3 gap-2">
        <input value={street} onChange={e => setStreet(e.target.value)} placeholder="Rua" className={`${field} col-span-2`} />
        <input value={number} onChange={e => setNumber(e.target.value)} placeholder="Nº" className={field} />
      </div>
      <input value={complement} onChange={e => setComplement(e.target.value)} placeholder="Complemento (opcional)" className={field} />
      <div className="grid grid-cols-3 gap-2">
        <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Bairro" className={`${field} col-span-2`} />
        <input value={state} onChange={e => setState(e.target.value)} placeholder="UF" maxLength={2} className={field} />
      </div>
      <input value={city} onChange={e => setCity(e.target.value)} placeholder="Cidade" className={field} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={loading} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar endereço'}
        </button>
        <button onClick={onDone} className="h-10 px-4 rounded-xl border text-sm text-muted-foreground hover:bg-muted transition">Cancelar</button>
      </div>
    </div>
  )
}

export function AccountDashboard() {
  const account = useCustomerAuth((s) => s.account)
  const logout = useCustomerAuth((s) => s.logout)
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)

  const { data: orders } = useQuery({
    queryKey: ['account-orders'],
    queryFn: () => api.get<{ data: AccountOrder[] }>('/customer/orders').then(r => r.data.data),
  })
  const { data: addresses } = useQuery({
    queryKey: ['account-addresses'],
    queryFn: () => api.get<{ data: AccountAddress[] }>('/customer/addresses').then(r => r.data.data),
  })

  async function deleteAddress(id: string) {
    await api.delete(`/customer/addresses/${id}`)
    queryClient.invalidateQueries({ queryKey: ['account-addresses'] })
  }
  async function setDefault(id: string) {
    await api.patch(`/customer/addresses/${id}`, { isDefault: true })
    queryClient.invalidateQueries({ queryKey: ['account-addresses'] })
  }

  return (
    <>
      {/* Perfil */}
      <div className="bg-white rounded-2xl border p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
          {account?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{account?.name}</p>
          <p className="text-sm text-muted-foreground">{account?.email ?? account?.phone}</p>
        </div>
        <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground underline">Sair</button>
      </div>

      {/* Endereços */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Meus endereços</h3>
          {!adding && (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </button>
          )}
        </div>
        {adding && <AddAddressForm onDone={() => { setAdding(false); queryClient.invalidateQueries({ queryKey: ['account-addresses'] }) }} />}
        {addresses?.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground bg-white rounded-2xl border p-4">Nenhum endereço salvo ainda.</p>
        )}
        {addresses?.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl border p-4 flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {a.label ? `${a.label} · ` : ''}{a.street}, {a.number}
                {a.isDefault && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Padrão</span>}
              </p>
              <p className="text-xs text-muted-foreground">{a.complement ? `${a.complement} — ` : ''}{a.district}, {a.city}/{a.state}</p>
              <div className="flex gap-3 mt-1.5">
                {!a.isDefault && <button onClick={() => setDefault(a.id)} className="text-xs text-primary hover:underline">Tornar padrão</button>}
                <button onClick={() => deleteAddress(a.id)} className="text-xs text-red-600 hover:underline flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remover</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Histórico global */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground px-1 flex items-center gap-1.5"><ShoppingBag className="h-4 w-4" /> Meus pedidos</h3>
        {!orders && <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}</div>}
        {orders?.length === 0 && (
          <div className="bg-white rounded-2xl border p-8 text-center space-y-1">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Você ainda não fez nenhum pedido.</p>
          </div>
        )}
        {orders?.map((order) => {
          const st = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-muted text-muted-foreground' }
          const isActive = !['DELIVERED', 'CANCELLED'].includes(order.status)
          return (
            <Link key={order.id} href={`/${order.store.slug}/pedido/${order.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl border p-4 hover:shadow-sm transition">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {order.store.logoUrl
                  ? <img src={order.store.logoUrl} alt="" className="h-full w-full object-cover" />
                  : <span className="text-xs font-bold text-muted-foreground">#{order.orderNumber}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{order.store.name}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', st.color)}>{st.label}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {order.items?.slice(0, 2).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </span>
                </div>
                <p className="text-sm font-semibold text-primary mt-0.5">{currency(order.total)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          )
        })}
      </div>
    </>
  )
}
