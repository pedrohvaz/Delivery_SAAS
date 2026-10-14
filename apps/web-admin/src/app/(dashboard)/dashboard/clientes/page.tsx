'use client'

import { useState, useRef } from 'react'
import {
  Search, Users, Phone, Mail, ShoppingBag, TrendingUp, ChevronLeft, ChevronRight,
  X, MapPin, Clock, Plus, Pencil, Trash2, Check, Star, Download, UserPlus,
} from 'lucide-react'
import {
  useCustomers, useCustomer, useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
  useCreateAddress, useUpdateAddress, useDeleteAddress, useExportCustomers,
  type CustomerOrder, type CustomerAddress, type AddressInput,
} from '@/hooks/use-customers'
import { currency } from '@/lib/utils'
import { STATUS_CONFIG, relativeTime } from '@/hooks/use-orders'
import { cn } from '@delivery/ui'

// ─── Formulário de Cliente ────────────────────────────────────────────────────

function CustomerForm({
  initial,
  onSave,
  onCancel,
  loading,
  error,
}: {
  initial?: { name: string; phone: string; email: string; cpf: string; notes: string }
  onSave: (data: any) => void
  onCancel: () => void
  loading: boolean
  error: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [cpf, setCpf] = useState(initial?.cpf ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-xl border">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground">Nome *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo"
            className="w-full h-9 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Telefone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999"
            className="w-full h-9 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">CPF</label>
          <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00"
            className="w-full h-9 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground">E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com"
            className="w-full h-9 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground">Observações</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Preferências, alergias, etc..."
            className="w-full rounded-xl border px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => onSave({ name, phone: phone || undefined, email: email || undefined, cpf: cpf || undefined, notes: notes || undefined })}
          disabled={loading || !name.trim()}
          className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition">
          <Check className="h-3.5 w-3.5" />{loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={onCancel} className="h-8 px-3 rounded-xl border text-xs font-medium hover:bg-muted transition">
          Cancelar
        </button>
      </div>
    </div>
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
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 space-y-1">
          <label className="text-xs font-medium">CEP</label>
          <input value={zipCode} onChange={(e) => handleCep(e.target.value)} placeholder="00000-000" maxLength={9}
            className="w-full h-8 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium">Rua *</label>
          <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rua..."
            className="w-full h-8 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Número *</label>
          <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="123"
            className="w-full h-8 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium">Bairro *</label>
          <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Bairro"
            className="w-full h-8 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Complemento</label>
          <input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Apt..."
            className="w-full h-8 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium">Cidade *</label>
          <input value={city} onChange={(e) => setCity(e.target.value)}
            className="w-full h-8 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">UF *</label>
          <input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} placeholder="SP"
            className="w-full h-8 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-3 space-y-1">
          <label className="text-xs font-medium">Referência</label>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Próximo ao..."
            className="w-full h-8 rounded-lg border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />
            <span className="text-xs font-medium">Endereço principal</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave({ street, number, complement: complement || undefined, district, city, state, zipCode: zipCode || undefined, reference: reference || undefined, isDefault })}
          disabled={loading || !valid}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition">
          <Check className="h-3 w-3" />{loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={onCancel} className="h-7 px-2.5 rounded-lg border text-xs hover:bg-muted transition">Cancelar</button>
      </div>
    </div>
  )
}

// ─── Painel de Perfil ─────────────────────────────────────────────────────────

function CustomerProfile({ id, onClose, onDeleted }: { id: string; onClose: () => void; onDeleted: () => void }) {
  const { data: customer, isLoading } = useCustomer(id)
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const deleteAddress = useDeleteAddress()

  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addingAddress, setAddingAddress] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [tab, setTab] = useState<'info' | 'pedidos'>('info')

  if (isLoading || !customer) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 p-5 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      </div>
    )
  }

  async function handleSaveEdit(data: any) {
    setEditError('')
    try {
      await updateCustomer.mutateAsync({ id: customer!.id, ...data })
      setEditing(false)
    } catch (e: any) {
      setEditError(e?.response?.data?.message ?? 'Erro ao salvar.')
    }
  }

  async function handleDelete() {
    await deleteCustomer.mutateAsync(customer!.id)
    onDeleted()
  }

  async function handleSaveAddress(data: AddressInput) {
    await createAddress.mutateAsync({ customerId: customer!.id, ...data })
    setAddingAddress(false)
  }

  async function handleUpdateAddress(addressId: string, data: AddressInput) {
    await updateAddress.mutateAsync({ customerId: customer!.id, addressId, ...data })
    setEditingAddressId(null)
  }

  async function handleDeleteAddress(addressId: string) {
    await deleteAddress.mutateAsync({ customerId: customer!.id, addressId })
  }

  const { stats } = customer

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-base truncate">{customer.name}</h2>
            <p className="text-xs text-muted-foreground">Cliente desde {new Date(customer.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => { setEditing(true); setConfirmDelete(false) }}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Confirmação de exclusão */}
        {confirmDelete && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm font-medium text-destructive">Excluir cliente permanentemente?</p>
            <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita. O histórico de pedidos será mantido.</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={deleteCustomer.isPending}
                className="h-8 px-3 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition disabled:opacity-50">
                {deleteCustomer.isPending ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="h-8 px-3 rounded-xl border text-xs hover:bg-muted transition">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Form de edição */}
        {editing && (
          <CustomerForm
            initial={{ name: customer.name, phone: customer.phone ?? '', email: customer.email ?? '', cpf: customer.cpf ?? '', notes: customer.notes ?? '' }}
            onSave={handleSaveEdit}
            onCancel={() => setEditing(false)}
            loading={updateCustomer.isPending}
            error={editError}
          />
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Pedidos totais', value: stats.totalOrders, color: '' },
            { label: 'Concluídos', value: stats.completedOrders, color: 'text-green-600' },
            { label: 'Total gasto', value: currency(stats.totalSpent), color: 'text-primary' },
            { label: 'Ticket médio', value: currency(stats.avgTicket), color: '' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn('text-lg font-bold text-foreground', color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b gap-4">
          {(['info', 'pedidos'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('pb-2 text-sm font-medium border-b-2 transition-colors capitalize',
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t === 'info' ? 'Informações' : 'Pedidos'}
            </button>
          ))}
        </div>

        {/* Tab Info */}
        {tab === 'info' && (
          <div className="space-y-4">
            {/* Contato */}
            <div className="rounded-xl border p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</p>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" />{customer.phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5" />{customer.email}
                </a>
              )}
              {customer.cpf && (
                <p className="text-sm text-muted-foreground">CPF: {customer.cpf}</p>
              )}
              {!customer.phone && !customer.email && !customer.cpf && (
                <p className="text-sm text-muted-foreground">Sem dados de contato</p>
              )}
            </div>

            {/* Observações */}
            {customer.notes && (
              <div className="rounded-xl border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
                <p className="text-sm text-muted-foreground italic">{customer.notes}</p>
              </div>
            )}

            {/* Endereços */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Endereços
                </p>
                <button onClick={() => setAddingAddress(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                  <Plus className="h-3 w-3" /> Adicionar
                </button>
              </div>

              {addingAddress && (
                <AddressForm
                  onSave={handleSaveAddress}
                  onCancel={() => setAddingAddress(false)}
                  loading={createAddress.isPending}
                />
              )}

              {customer.addresses.length === 0 && !addingAddress && (
                <p className="text-sm text-muted-foreground py-1">Nenhum endereço cadastrado.</p>
              )}

              {customer.addresses.map((addr: CustomerAddress) => (
                <div key={addr.id}>
                  {editingAddressId === addr.id ? (
                    <AddressForm
                      initial={addr}
                      onSave={(data) => handleUpdateAddress(addr.id, data)}
                      onCancel={() => setEditingAddressId(null)}
                      loading={updateAddress.isPending}
                    />
                  ) : (
                    <div className="rounded-xl border p-2.5 text-sm group relative">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground truncate">{addr.street}, {addr.number}{addr.complement ? ` — ${addr.complement}` : ''}</p>
                            {addr.isDefault && <Star className="h-3 w-3 text-yellow-500 shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{addr.district}, {addr.city} — {addr.state}</p>
                          {addr.reference && <p className="text-xs text-muted-foreground italic">{addr.reference}</p>}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => setEditingAddressId(addr.id)}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleDeleteAddress(addr.id)}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
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

        {/* Tab Pedidos */}
        {tab === 'pedidos' && (
          <div className="space-y-2">
            {customer.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum pedido encontrado.</p>
            ) : (
              customer.orders.map((order: CustomerOrder) => {
                const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PENDING']!
                return (
                  <div key={order.id} className="rounded-xl border p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">#{order.orderNumber}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">{currency(Number(order.total))}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{relativeTime(order.createdAt)} atrás
                      </span>
                    </div>
                  </div>
                )
              })
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

  async function handleSave(data: any) {
    setError('')
    try {
      const customer = await createCustomer.mutateAsync(data)
      onCreated(customer.id)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao criar cliente.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Novo Cliente</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <CustomerForm
          onSave={handleSave}
          onCancel={onClose}
          loading={createCustomer.isPending}
          error={error}
        />
      </div>
    </div>
  )
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────────

function exportCSV(customers: any[]) {
  const headers = ['Nome', 'Telefone', 'E-mail', 'Pedidos', 'Cadastro']
  const rows = customers.map((c) => [
    c.name, c.phone ?? '', c.email ?? '', c._count.orders,
    new Date(c.createdAt).toLocaleDateString('pt-BR'),
  ])
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, isLoading } = useCustomers(debouncedSearch || undefined, page)
  const exportCustomers = useExportCustomers()
  const customers = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta ? Math.ceil(meta.total / meta.take) : 1

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(v), 350)
  }

  async function handleExport() {
    const all = await exportCustomers.mutateAsync(debouncedSearch || undefined)
    exportCSV(all)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Lista */}
      <div className={`flex flex-col ${selectedId ? 'hidden lg:flex lg:flex-1' : 'flex-1'} overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Clientes</h1>
            {meta && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {meta.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exportCustomers.isPending || (meta?.total === 0)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-medium hover:bg-muted transition disabled:opacity-40"
              title={meta ? `Exportar ${meta.total} clientes` : 'Exportar'}
            >
              <Download className="h-4 w-4" />
              {exportCustomers.isPending ? 'Exportando...' : 'Exportar'}
            </button>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
              <UserPlus className="h-4 w-4" /> Novo cliente
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="border-b bg-muted/30 px-6 py-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-9 w-full rounded-xl border bg-white pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">Nenhum cliente encontrado</p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch ? 'Tente um termo diferente.' : 'Os clientes aparecerão aqui conforme fizerem pedidos.'}
              </p>
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition mt-1">
                <Plus className="h-4 w-4" /> Cadastrar cliente
              </button>
            </div>
          ) : (
            <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Telefone</th>
                  <th className="px-4 py-3 text-center font-medium">Pedidos</th>
                  <th className="px-4 py-3 text-right font-medium">Desde</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((c) => (
                  <tr key={c.id} onClick={() => setSelectedId(c.id)}
                    className={cn('cursor-pointer hover:bg-muted/40 transition-colors', selectedId === c.id && 'bg-primary/5')}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{c.name}</p>
                          {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                        <ShoppingBag className="h-3 w-3" />{c._count.orders}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-xs text-muted-foreground">
              Mostrando {((page - 1) * (meta?.take ?? 30)) + 1}–{Math.min(page * (meta?.take ?? 30), meta?.total ?? 0)} de {meta?.total ?? 0}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40 transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40 transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Painel lateral */}
      {selectedId && (
        <div className="w-full lg:w-96 border-l bg-white flex flex-col overflow-hidden">
          <CustomerProfile
            id={selectedId}
            onClose={() => setSelectedId(null)}
            onDeleted={() => setSelectedId(null)}
          />
        </div>
      )}

      {!selectedId && customers.length > 0 && (
        <div className="hidden lg:flex lg:w-96 border-l bg-muted/20 items-center justify-center">
          <div className="text-center space-y-2 px-8">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Selecione um cliente para ver o perfil completo</p>
          </div>
        </div>
      )}

      {/* Modal novo cliente */}
      {showNew && (
        <NovoClienteModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => { setShowNew(false); setSelectedId(id) }}
        />
      )}
    </div>
  )
}
