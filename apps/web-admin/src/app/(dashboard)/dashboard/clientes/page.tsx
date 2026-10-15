'use client'

import { useState, useRef } from 'react'
import {
  Search, Users, Phone, Mail, ShoppingBag, ChevronLeft, ChevronRight, X, MapPin, Clock, Plus,
  Pencil, Trash2, Check, Star, Download, UserPlus, MessageCircle, Copy, Heart, UserX, Repeat, Sparkles,
  ArrowLeft,
} from 'lucide-react'
import {
  useCustomers, useCustomer, useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
  useCreateAddress, useUpdateAddress, useDeleteAddress, useExportCustomers,
  type CustomerOrder, type CustomerAddress, type AddressInput, type CustomerSegment, type CustomerSort,
  type CustomerSummary,
} from '@/hooks/use-customers'
import { useAuthStore } from '@/store/auth'
import { currency } from '@/lib/utils'
import { STATUS_CONFIG, relativeTime } from '@/hooks/use-orders'
import { cn } from '@delivery/ui'

const INPUT = 'w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40'
const TYPE_LABELS: Record<string, string> = { DELIVERY: 'Entrega', PICKUP: 'Retirada', TABLE: 'Mesa', COUNTER: 'Balcão' }
const PAY_LABELS: Record<string, string> = { CASH: 'Dinheiro', PIX: 'PIX', CREDIT_CARD: 'Crédito', DEBIT_CARD: 'Débito' }

// ─── Telefone / WhatsApp ──────────────────────────────────────────────────────

const onlyDigits = (s: string) => s.replace(/\D/g, '')

function formatPhone(phone: string | null) {
  if (!phone) return ''
  let d = onlyDigits(phone)
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}

function whatsappUrl(phone: string | null, text?: string) {
  if (!phone) return null
  let d = onlyDigits(phone)
  if (d.length === 10 || d.length === 11) d = '55' + d
  if (d.length < 12) return null
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

function daysAgo(date: string | null) {
  if (!date) return null
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

// ─── Formulário de Cliente ────────────────────────────────────────────────────

type CustomerFormData = { name: string; phone: string | null; email: string | null; cpf: string | null; notes: string | null }

function CustomerForm({
  initial,
  onSave,
  onCancel,
  loading,
  error,
}: {
  initial?: { name: string; phone: string; email: string; cpf: string; notes: string }
  onSave: (data: CustomerFormData) => void
  onCancel: () => void
  loading: boolean
  error: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [cpf, setCpf] = useState(initial?.cpf ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const nil = (v: string) => (v.trim() ? v.trim() : null)

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave({ name: name.trim(), phone: nil(phone), email: nil(email), cpf: nil(cpf), notes: nil(notes) }) }}
      className="space-y-3 p-4 bg-muted/30 rounded-xl border"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground">Nome *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" autoFocus className={INPUT} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">WhatsApp / Telefone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" className={INPUT} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">CPF</label>
          <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" className={INPUT} />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground">E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email" className={INPUT} />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground">Observações</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Preferências, alergias, ponto da carne..."
            className="w-full rounded-xl border px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading || name.trim().length < 2}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
          <Check className="h-4 w-4" />{loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl border text-sm font-medium hover:bg-muted transition">
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── Formulário de Endereço ───────────────────────────────────────────────────

function AddressForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Partial<AddressInput>
  onSave: (data: AddressInput) => void
  onCancel: () => void
  loading: boolean
}) {
  const [street, setStreet] = useState(initial?.street ?? '')
  const [number, setNumber] = useState(initial?.number ?? '')
  const [complement, setComplement] = useState(initial?.complement ?? '')
  const [district, setDistrict] = useState(initial?.district ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [state, setState] = useState(initial?.state ?? '')
  const [zipCode, setZipCode] = useState(initial?.zipCode ?? '')
  const [reference, setReference] = useState(initial?.reference ?? '')
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false)

  async function handleCep(cep: string) {
    setZipCode(cep)
    const clean = cep.replace(/\D/g, '')
    if (clean.length === 8) {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
        const d = await r.json()
        if (!d.erro) {
          setStreet(d.logradouro || '')
          setDistrict(d.bairro || '')
          setCity(d.localidade || '')
          setState(d.uf || '')
        }
      } catch {}
    }
  }

  const valid = street && number && district && city && state

  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-xl border text-sm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-3 space-y-1">
          <label className="text-xs font-medium">CEP</label>
          <input value={zipCode} onChange={(e) => handleCep(e.target.value)} placeholder="00000-000" maxLength={9}
            className="w-full h-10 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-2 sm:col-span-2 space-y-1">
          <label className="text-xs font-medium">Rua *</label>
          <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rua..."
            className="w-full h-10 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Número *</label>
          <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="123"
            className="w-full h-10 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-2 sm:col-span-2 space-y-1">
          <label className="text-xs font-medium">Bairro *</label>
          <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Bairro"
            className="w-full h-10 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Complemento</label>
          <input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Apt..."
            className="w-full h-10 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-2 sm:col-span-2 space-y-1">
          <label className="text-xs font-medium">Cidade *</label>
          <input value={city} onChange={(e) => setCity(e.target.value)}
            className="w-full h-10 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">UF *</label>
          <input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} placeholder="SP"
            className="w-full h-10 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-2 sm:col-span-3 space-y-1">
          <label className="text-xs font-medium">Referência</label>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Próximo ao..."
            className="w-full h-10 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />
            <span className="text-xs font-medium">Endereço principal</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave({ street, number, complement: complement || undefined, district, city, state, zipCode: zipCode || undefined, reference: reference || undefined, isDefault })}
          disabled={loading || !valid}
          className="flex items-center gap-1 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition">
          <Check className="h-3 w-3" />{loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={onCancel} className="h-9 px-3 rounded-lg border text-xs hover:bg-muted transition">Cancelar</button>
      </div>
    </div>
  )
}

// ─── Botões de contato ────────────────────────────────────────────────────────

function ContactButtons({ phone, name, storeName, compact }: { phone: string | null; name: string; storeName?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  if (!phone) return null
  const wa = whatsappUrl(phone, `Olá, ${firstName(name)}! Aqui é da ${storeName ?? 'loja'}.`)
  const btn = cn('inline-flex items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition', compact ? 'h-9 w-9' : 'h-10 px-3')
  return (
    <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${name}`} title="Abrir conversa no WhatsApp"
          className={cn(btn, 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100')}>
          <MessageCircle className="h-4 w-4" />{!compact && 'WhatsApp'}
        </a>
      )}
      {!compact && (
        <>
          <a href={`tel:${onlyDigits(phone)}`} className={cn(btn, 'hover:bg-muted')}>
            <Phone className="h-4 w-4" /> Ligar
          </a>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(phone).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }}
            className={cn(btn, 'hover:bg-muted')}>
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />} {copied ? 'Copiado' : 'Copiar'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Painel de Perfil ─────────────────────────────────────────────────────────

function CustomerProfile({ id, onClose, onDeleted }: { id: string; onClose: () => void; onDeleted: () => void }) {
  const { data: customer, isLoading } = useCustomer(id)
  const storeName = useAuthStore((s) => s.store?.name)
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const deleteAddress = useDeleteAddress()

  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [addingAddress, setAddingAddress] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [tab, setTab] = useState<'info' | 'pedidos'>('info')

  if (isLoading || !customer) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
          <button onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 p-5 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      </div>
    )
  }

  async function handleSaveEdit(data: CustomerFormData) {
    setEditError('')
    try {
      await updateCustomer.mutateAsync({ id: customer!.id, ...data })
      setEditing(false)
    } catch (e: any) {
      setEditError(e?.response?.data?.message ?? 'Erro ao salvar.')
    }
  }

  async function handleDelete() {
    setDeleteError('')
    try {
      await deleteCustomer.mutateAsync(customer!.id)
      onDeleted()
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message ?? 'Não foi possível excluir.')
    }
  }

  async function handleSaveAddress(data: AddressInput) {
    await createAddress.mutateAsync({ customerId: customer!.id, ...data })
    setAddingAddress(false)
  }

  async function handleUpdateAddress(addressId: string, data: AddressInput) {
    await updateAddress.mutateAsync({ customerId: customer!.id, addressId, ...data })
    setEditingAddressId(null)
  }

  const { stats } = customer
  const ultimo = daysAgo(stats.lastOrderAt)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-3 sm:px-5">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose} aria-label="Voltar para a lista" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-muted lg:hidden">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-base truncate">{customer.name}</h2>
            <p className="text-xs text-muted-foreground">Cliente desde {new Date(customer.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => { setEditing(true); setConfirmDelete(false) }} aria-label="Editar cliente" title="Editar"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => { setConfirmDelete(true); setDeleteError('') }} aria-label="Excluir cliente" title="Excluir"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} aria-label="Fechar" className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-muted lg:flex">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-4">
        {confirmDelete && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm font-medium text-destructive">Excluir {customer.name}?</p>
            <p className="text-xs text-muted-foreground">
              Os pedidos continuam no histórico da loja. Endereços e pontos de fidelidade deste cliente serão apagados.
            </p>
            {deleteError && <p className="text-xs font-medium text-destructive">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={deleteCustomer.isPending}
                className="h-10 px-4 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
                {deleteCustomer.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="h-10 px-4 rounded-xl border text-sm hover:bg-muted transition">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {editing && (
          <CustomerForm
            initial={{ name: customer.name, phone: customer.phone ?? '', email: customer.email ?? '', cpf: customer.cpf ?? '', notes: customer.notes ?? '' }}
            onSave={handleSaveEdit}
            onCancel={() => setEditing(false)}
            loading={updateCustomer.isPending}
            error={editError}
          />
        )}

        <ContactButtons phone={customer.phone} name={customer.name} storeName={storeName} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Pedidos', value: stats.totalOrders, color: '' },
            { label: 'Último pedido', value: ultimo ?? '—', color: '' },
            { label: 'Total gasto', value: currency(stats.totalSpent), color: 'text-primary' },
            { label: 'Ticket médio', value: currency(stats.avgTicket), color: '' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn('text-lg font-bold text-foreground', color)}>{value}</p>
            </div>
          ))}
        </div>
        <p className="-mt-2 text-[11px] text-muted-foreground">Pedidos cancelados não entram no total gasto nem no ticket médio.</p>

        {stats.favorites.length > 0 && (
          <div className="rounded-xl border p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Heart className="h-3.5 w-3.5" /> Mais pedidos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stats.favorites.map((f) => (
                <span key={f.name} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{f.quantity}x {f.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b gap-4">
          {(['info', 'pedidos'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('pb-2 text-sm font-medium border-b-2 transition-colors',
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t === 'info' ? 'Informações' : `Pedidos (${stats.totalOrders})`}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="space-y-4">
            <div className="rounded-xl border p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</p>
              {customer.phone && <p className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{formatPhone(customer.phone)}</p>}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline break-all">
                  <Mail className="h-3.5 w-3.5 shrink-0" />{customer.email}
                </a>
              )}
              {customer.cpf && <p className="text-sm text-muted-foreground">CPF: {customer.cpf}</p>}
              {!customer.phone && !customer.email && !customer.cpf && <p className="text-sm text-muted-foreground">Sem dados de contato</p>}
            </div>

            {customer.notes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Observações</p>
                <p className="text-sm text-amber-900 whitespace-pre-line">{customer.notes}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Endereços
                </p>
                <button onClick={() => setAddingAddress(true)}
                  className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs text-primary hover:bg-primary/10 font-medium">
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>

              {addingAddress && (
                <AddressForm onSave={handleSaveAddress} onCancel={() => setAddingAddress(false)} loading={createAddress.isPending} />
              )}

              {customer.addresses.length === 0 && !addingAddress && (
                <p className="text-sm text-muted-foreground py-1">Nenhum endereço cadastrado.</p>
              )}

              {customer.addresses.map((addr: CustomerAddress) => (
                <div key={addr.id}>
                  {editingAddressId === addr.id ? (
                    <AddressForm initial={addr} onSave={(data) => handleUpdateAddress(addr.id, data)}
                      onCancel={() => setEditingAddressId(null)} loading={updateAddress.isPending} />
                  ) : (
                    <div className="rounded-xl border p-2.5 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground">{addr.street}, {addr.number}{addr.complement ? ` — ${addr.complement}` : ''}</p>
                            {addr.isDefault && <Star className="h-3 w-3 text-yellow-500 shrink-0" aria-label="Endereço principal" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{addr.district}, {addr.city} — {addr.state}</p>
                          {addr.reference && <p className="text-xs text-muted-foreground italic">{addr.reference}</p>}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${addr.street}, ${addr.number}, ${addr.district}, ${addr.city} - ${addr.state}`)}`}
                            target="_blank" rel="noopener noreferrer" aria-label="Ver no mapa" title="Ver no mapa"
                            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                          </a>
                          <button onClick={() => setEditingAddressId(addr.id)} aria-label="Editar endereço"
                            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => { if (confirm('Apagar este endereço?')) deleteAddress.mutate({ customerId: customer.id, addressId: addr.id }) }}
                            aria-label="Apagar endereço"
                            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'pedidos' && (
          <div className="space-y-2">
            {customer.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum pedido ainda.</p>
            ) : (
              <>
                {customer.orders.map((order: CustomerOrder) => {
                  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PENDING']!
                  return (
                    <div key={order.id} className="rounded-xl border p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">#{order.orderNumber}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {TYPE_LABELS[order.type] ?? order.type}{order.paymentMethod ? ` · ${PAY_LABELS[order.paymentMethod] ?? order.paymentMethod}` : ''}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">{currency(Number(order.total))}</span>
                        <span className="flex items-center gap-1" title={new Date(order.createdAt).toLocaleString('pt-BR')}>
                          <Clock className="h-3 w-3" />{new Date(order.createdAt).toLocaleDateString('pt-BR')} · {relativeTime(order.createdAt)} atrás
                        </span>
                      </div>
                    </div>
                  )
                })}
                {stats.totalOrders > customer.orders.length && (
                  <p className="text-center text-xs text-muted-foreground">Mostrando os {customer.orders.length} pedidos mais recentes de {stats.totalOrders}.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal Novo Cliente ───────────────────────────────────────────────────────

function NovoClienteModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const createCustomer = useCreateCustomer()
  const [error, setError] = useState('')

  async function handleSave(data: CustomerFormData) {
    setError('')
    try {
      const customer = await createCustomer.mutateAsync({
        name: data.name, phone: data.phone ?? undefined, email: data.email ?? undefined, cpf: data.cpf ?? undefined, notes: data.notes ?? undefined,
      })
      onCreated(customer.id)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao criar cliente.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Novo cliente">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Novo cliente</h2>
          <button onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <CustomerForm onSave={handleSave} onCancel={onClose} loading={createCustomer.isPending} error={error} />
      </div>
    </div>
  )
}

// ─── Exportar planilha (abre direto no Excel em português) ────────────────────

function exportCSV(customers: CustomerSummary[]) {
  const headers = ['Nome', 'Telefone', 'E-mail', 'Pedidos', 'Total gasto (R$)', 'Último pedido', 'Cadastro']
  const rows = customers.map((c) => [
    c.name, formatPhone(c.phone), c.email ?? '', String(c.ordersCount),
    c.totalSpent.toFixed(2).replace('.', ','),
    c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('pt-BR') : '',
    new Date(c.createdAt).toLocaleDateString('pt-BR'),
  ])
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Página Principal ─────────────────────────────────────────────────────────

const SEGMENTOS: { key: CustomerSegment; label: string; hint: string; icon: typeof Users }[] = [
  { key: 'all', label: 'Todos', hint: '', icon: Users },
  { key: 'new', label: 'Novos', hint: 'Cadastrados nos últimos 30 dias', icon: Sparkles },
  { key: 'recurring', label: 'Fiéis', hint: '3 pedidos ou mais', icon: Repeat },
  { key: 'inactive', label: 'Sumidos', hint: 'Não pedem há mais de 30 dias — chame no WhatsApp', icon: UserX },
  { key: 'never', label: 'Nunca pediram', hint: 'Cadastrados que ainda não fizeram pedido', icon: ShoppingBag },
]

const ORDENS: { key: CustomerSort; label: string }[] = [
  { key: 'recent', label: 'Cadastro mais recente' },
  { key: 'last', label: 'Pediu por último' },
  { key: 'orders', label: 'Mais pedidos' },
  { key: 'spent', label: 'Mais gastou' },
  { key: 'name', label: 'Nome (A–Z)' },
]

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [segment, setSegment] = useState<CustomerSegment>('all')
  const [sort, setSort] = useState<CustomerSort>('recent')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const storeName = useAuthStore((s) => s.store?.name)

  const { data, isLoading, isFetching } = useCustomers(debouncedSearch || undefined, page, segment, sort)
  const exportCustomers = useExportCustomers()
  const customers = data?.data ?? []
  const meta = data?.meta
  const counts = meta?.counts
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.take)) : 1
  const segInfo = SEGMENTOS.find((s) => s.key === segment)!

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(v), 350)
  }

  async function handleExport() {
    const all = await exportCustomers.mutateAsync({ search: debouncedSearch || undefined, segment, sort })
    exportCSV(all)
  }

  const saudacao = (c: CustomerSummary) =>
    segment === 'inactive'
      ? `Oi, ${firstName(c.name)}! Sentimos sua falta aqui na ${storeName ?? 'loja'}. Bateu a fome? 😋`
      : `Olá, ${firstName(c.name)}! Aqui é da ${storeName ?? 'loja'}.`

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Lista */}
      <div className={cn('flex min-w-0 flex-col overflow-hidden', selectedId ? 'hidden lg:flex lg:flex-1' : 'flex-1')}>
        <div className="flex flex-col gap-3 border-b bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Clientes</h1>
            {counts && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{counts.all}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} disabled={exportCustomers.isPending || meta?.total === 0}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl border text-sm font-medium hover:bg-muted transition disabled:opacity-40"
              title={meta ? `Baixar planilha com ${meta.total} clientes` : 'Exportar'}>
              <Download className="h-4 w-4" />
              {exportCustomers.isPending ? 'Exportando...' : 'Planilha'}
            </button>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
              <UserPlus className="h-4 w-4" /> Novo cliente
            </button>
          </div>
        </div>

        {/* Segmentos, busca e ordem */}
        <div className="space-y-3 border-b bg-muted/30 px-4 py-3 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SEGMENTOS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setSegment(key); setPage(1) }}
                className={cn('inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition',
                  segment === key ? 'border-primary bg-primary text-primary-foreground' : 'bg-white text-muted-foreground hover:bg-muted')}>
                <Icon className="h-3.5 w-3.5" /> {label}
                {counts && <span className="opacity-70">{counts[key]}</span>}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-xl border bg-white pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Buscar por nome, telefone ou e-mail..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => handleSearch('')} aria-label="Limpar busca"
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select value={sort} onChange={(e) => { setSort(e.target.value as CustomerSort); setPage(1) }} aria-label="Ordenar por"
              className="h-10 rounded-xl border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-56">
              {ORDENS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          {segInfo.hint && <p className="text-xs text-muted-foreground">{segInfo.hint}</p>}
        </div>

        {/* Lista */}
        <div className={cn('flex-1 overflow-y-auto transition-opacity', isFetching && !isLoading && 'opacity-60')}>
          {isLoading ? (
            <div className="p-4 sm:p-6 space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">Nenhum cliente encontrado</p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch ? 'Tente outro nome ou telefone.' : segment !== 'all' ? 'Nenhum cliente neste grupo agora.' : 'Os clientes aparecem aqui quando fazem pedidos.'}
              </p>
              {segment === 'all' && !debouncedSearch && (
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition mt-1">
                  <Plus className="h-4 w-4" /> Cadastrar cliente
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Celular e tablet: cartões */}
              <ul className="divide-y md:hidden">
                {customers.map((c) => (
                  <li key={c.id}>
                    <div role="button" tabIndex={0} onClick={() => setSelectedId(c.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(c.id) }}
                      className={cn('flex items-center gap-3 px-4 py-3 active:bg-muted/60', selectedId === c.id && 'bg-primary/5')}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.ordersCount} pedido{c.ordersCount !== 1 ? 's' : ''} · {currency(c.totalSpent)}
                          {c.lastOrderAt ? ` · ${daysAgo(c.lastOrderAt)}` : ''}
                        </p>
                      </div>
                      {c.phone && (
                        <a href={whatsappUrl(c.phone, saudacao(c)) ?? undefined} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()} aria-label={`WhatsApp de ${c.name}`}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-700">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Computador: tabela */}
              <table className="hidden w-full text-sm md:table">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Telefone</th>
                    <th className="px-4 py-3 text-center font-medium">Pedidos</th>
                    <th className="px-4 py-3 text-right font-medium">Total gasto</th>
                    <th className="px-4 py-3 text-right font-medium">Último pedido</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((c) => (
                    <tr key={c.id} onClick={() => setSelectedId(c.id)} tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(c.id) }}
                      className={cn('cursor-pointer hover:bg-muted/40 transition-colors', selectedId === c.id && 'bg-primary/5')}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground">desde {new Date(c.createdAt).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatPhone(c.phone) || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                          <ShoppingBag className="h-3 w-3" />{c.ordersCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{c.totalSpent > 0 ? currency(c.totalSpent) : '—'}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">{daysAgo(c.lastOrderAt) ?? 'nunca'}</td>
                      <td className="px-4 py-3 text-right">
                        {c.phone && (
                          <a href={whatsappUrl(c.phone, saudacao(c)) ?? undefined} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()} aria-label={`WhatsApp de ${c.name}`} title="Chamar no WhatsApp"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
            <p className="text-xs text-muted-foreground">
              {((page - 1) * (meta?.take ?? 30)) + 1}–{Math.min(page * (meta?.take ?? 30), meta?.total ?? 0)} de {meta?.total ?? 0}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Página anterior"
                className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40 transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-muted-foreground">{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Próxima página"
                className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40 transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Painel lateral (tela cheia no celular) */}
      {selectedId && (
        <div className="flex w-full flex-col overflow-hidden border-l bg-white lg:w-[26rem] lg:shrink-0">
          <CustomerProfile id={selectedId} onClose={() => setSelectedId(null)} onDeleted={() => setSelectedId(null)} />
        </div>
      )}

      {!selectedId && customers.length > 0 && (
        <div className="hidden lg:flex lg:w-[26rem] lg:shrink-0 border-l bg-muted/20 items-center justify-center">
          <div className="text-center space-y-2 px-8">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Clique num cliente para ver contato, endereços, pedidos e o que ele mais pede</p>
          </div>
        </div>
      )}

      {showNew && (
        <NovoClienteModal onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); setSelectedId(id) }} />
      )}
    </div>
  )
}
