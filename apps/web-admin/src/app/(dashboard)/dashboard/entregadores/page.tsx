'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, Bike, Check, X } from 'lucide-react'
import {
  useDeliverymen,
  useCreateDeliveryman,
  useUpdateDeliveryman,
  useDeleteDeliveryman,
  type Deliveryman,
} from '@/hooks/use-deliverymen'

const VEHICLE_OPTIONS = [
  { value: 'Moto', label: '🏍️ Moto' },
  { value: 'Bicicleta', label: '🚲 Bicicleta' },
  { value: 'Carro', label: '🚗 Carro' },
  { value: 'A pé', label: '🚶 A pé' },
]

interface FormState {
  name: string
  phone: string
  vehicle: string
  commission: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  phone: '',
  vehicle: 'Moto',
  commission: '0',
  isActive: true,
}

export default function EntregadoresPage() {
  const { data: deliverymen = [], isLoading } = useDeliverymen()
  const createDeliveryman = useCreateDeliveryman()
  const updateDeliveryman = useUpdateDeliveryman()
  const deleteDeliveryman = useDeleteDeliveryman()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  function set(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(d: Deliveryman) {
    setEditingId(d.id)
    setForm({
      name: d.name,
      phone: d.phone ?? '',
      vehicle: d.vehicle ?? 'Moto',
      commission: String(d.commission),
      isActive: d.isActive,
    })
    setFormError('')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (form.name.trim().length < 2) { setFormError('Nome deve ter pelo menos 2 caracteres'); return }
    const commission = parseFloat(form.commission)
    if (isNaN(commission) || commission < 0 || commission > 100) {
      setFormError('Comissão deve ser entre 0 e 100')
      return
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      vehicle: form.vehicle || null,
      commission,
      isActive: form.isActive,
    }

    try {
      if (editingId) {
        await updateDeliveryman.mutateAsync({ id: editingId, ...payload })
      } else {
        await createDeliveryman.mutateAsync({ ...payload, isActive: form.isActive })
      }
      cancelForm()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Erro ao salvar entregador')
    }
  }

  const isPending = createDeliveryman.isPending || updateDeliveryman.isPending

  // Estatísticas
  const totalActive = deliverymen.filter((d) => d.isActive).length
  const totalDeliveries = deliverymen.reduce((s, d) => s + d._count.orders, 0)

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entregadores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie sua equipe de entrega
          </p>
        </div>
        {!showForm && (
          <button onClick={openCreate}
            className="flex shrink-0 self-start sm:self-auto items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" />
            Novo entregador
          </button>
        )}
      </div>

      {/* Cards de resumo */}
      {!isLoading && deliverymen.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Entregadores ativos</p>
            <p className="text-2xl font-bold mt-1">{totalActive}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Entregas concluídas</p>
            <p className="text-2xl font-bold mt-1">{totalDeliveries}</p>
          </div>
        </div>
      )}

      {/* Formulário inline */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? 'Editar entregador' : 'Novo entregador'}</h2>
            <button type="button" onClick={cancelForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Nome */}
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-medium">Nome *</label>
              <input
                className="h-10 w-full rounded-xl border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nome do entregador"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>

            {/* Telefone */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">WhatsApp</label>
              <input
                type="tel"
                className="h-10 w-full rounded-xl border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>

            {/* Veículo */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Veículo</label>
              <select
                value={form.vehicle}
                onChange={(e) => set('vehicle', e.target.value)}
                className="h-10 w-full rounded-xl border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {VEHICLE_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Comissão */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Comissão (%)</label>
              <input
                type="number" step="0.5" min="0" max="100"
                className="h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0"
                value={form.commission}
                onChange={(e) => set('commission', e.target.value)}
              />
            </div>
          </div>

          {/* Toggle ativo */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => set('isActive', !form.isActive)}
              className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none
                ${form.isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-sm font-medium">Entregador ativo</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
              <Check className="h-4 w-4" />
              {isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
            </button>
            <button type="button" onClick={cancelForm}
              className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : deliverymen.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
          <Bike className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">Nenhum entregador cadastrado</p>
          <p className="text-xs text-muted-foreground">
            Cadastre sua equipe de entrega para atribuir pedidos rapidamente.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {deliverymen.map((d) => (
            <div key={d.id}
              className={`rounded-2xl border bg-card p-4 flex items-center gap-4 ${!d.isActive ? 'opacity-60' : ''}`}>
              {/* Ícone / veículo */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Bike className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{d.name}</span>
                  {d.vehicle && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {VEHICLE_OPTIONS.find(v => v.value === d.vehicle)?.label ?? d.vehicle}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {d.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {d.phone && <span>{d.phone}</span>}
                  {d.commission > 0 && <span>{d.commission}% comissão</span>}
                  <span className="font-medium">{d._count.orders} entrega{d._count.orders !== 1 ? 's' : ''} concluída{d._count.orders !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Toggle ativo */}
                <button
                  onClick={() => updateDeliveryman.mutate({ id: d.id, isActive: !d.isActive })}
                  className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none
                    ${d.isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                    ${d.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
                <button onClick={() => openEdit(d)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir "${d.name}"? Os pedidos atribuídos a ele serão desvinculados.`))
                      deleteDeliveryman.mutate(d.id)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela de entregas por entregador (10.5) */}
      {!isLoading && deliverymen.length > 0 && (
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Relatório de entregas</h2>
          <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 text-left font-medium">Entregador</th>
                <th className="py-2 text-left font-medium">Veículo</th>
                <th className="py-2 text-center font-medium">Entregas concluídas</th>
                <th className="py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliverymen.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="py-2.5 font-medium">{d.name}</td>
                  <td className="py-2.5 text-muted-foreground">
                    {VEHICLE_OPTIONS.find(v => v.value === d.vehicle)?.label ?? d.vehicle ?? '—'}
                  </td>
                  <td className="py-2.5 text-center font-semibold">{d._count.orders}</td>
                  <td className="py-2.5 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold
                      ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                      {d.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  )
}
