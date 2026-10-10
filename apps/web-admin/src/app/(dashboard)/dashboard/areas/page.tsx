'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, MapPin, Check, X } from 'lucide-react'
import {
  useDeliveryAreas,
  useCreateDeliveryArea,
  useUpdateDeliveryArea,
  useDeleteDeliveryArea,
  type DeliveryArea,
  type DeliveryAreaInput,
} from '@/hooks/use-delivery-areas'
import { currency } from '@/lib/utils'

type AreaType = 'DISTRICT' | 'RADIUS'

interface FormState {
  type: AreaType
  name: string
  district: string
  radiusKm: string
  fee: string
  minOrder: string
  freeFrom: string
}

const EMPTY_FORM: FormState = {
  type: 'DISTRICT',
  name: '',
  district: '',
  radiusKm: '',
  fee: '',
  minOrder: '0',
  freeFrom: '',
}

const TYPE_LABELS: Record<string, string> = {
  DISTRICT: 'Bairro',
  RADIUS: 'Taxa fixa',
  POLYGON: 'Polígono',
}

export default function AreasPage() {
  const { data: areas = [], isLoading } = useDeliveryAreas()
  const createArea = useCreateDeliveryArea()
  const updateArea = useUpdateDeliveryArea()
  const deleteArea = useDeleteDeliveryArea()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(area: DeliveryArea) {
    setEditingId(area.id)
    setForm({
      type: area.type as AreaType,
      name: area.name ?? '',
      district: area.district ?? '',
      radiusKm: area.radiusKm ? String(area.radiusKm) : '',
      fee: String(area.fee),
      minOrder: String(area.minOrder),
      freeFrom: area.freeFrom != null ? String(area.freeFrom) : '',
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

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const fee = parseFloat(form.fee)
    if (isNaN(fee) || fee < 0) { setFormError('Taxa de entrega inválida'); return }
    if (form.type === 'DISTRICT' && !form.district.trim()) { setFormError('Nome do bairro é obrigatório'); return }

    const freeFromVal = form.freeFrom.trim() ? parseFloat(form.freeFrom) : null
    const nameVal = form.name.trim() || null

    try {
      if (editingId) {
        // No edit: envia null explicitamente para limpar campos opcionais
        await updateArea.mutateAsync({
          id: editingId,
          type: form.type,
          name: nameVal,
          district: form.type === 'DISTRICT' ? form.district.trim() : null,
          radiusKm: null,
          fee,
          minOrder: parseFloat(form.minOrder) || 0,
          freeFrom: freeFromVal,
          // isActive não é alterado pelo form — use o toggle na lista
        })
      } else {
        const payload: DeliveryAreaInput = {
          type: form.type,
          name: nameVal,
          district: form.type === 'DISTRICT' ? form.district.trim() : null,
          radiusKm: null,
          fee,
          minOrder: parseFloat(form.minOrder) || 0,
          freeFrom: freeFromVal,
          isActive: true,
        }
        await createArea.mutateAsync(payload)
      }
      cancelForm()
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Erro ao salvar área. Tente novamente.')
    }
  }

  const isPending = createArea.isPending || updateArea.isPending

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Áreas de Entrega</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure os bairros ou raio de entrega e as taxas correspondentes
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            <Plus className="h-4 w-4" />
            Adicionar área
          </button>
        )}
      </div>

      {/* Formulário inline */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? 'Editar área' : 'Nova área de entrega'}</h2>
            <button type="button" onClick={cancelForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Tipo de área</label>
            <div className="grid grid-cols-2 gap-2">
              {(['DISTRICT', 'RADIUS'] as AreaType[]).map((t) => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  className={`rounded-xl border py-2.5 text-sm font-medium transition-colors
                    ${form.type === t ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  {t === 'DISTRICT' ? '🏘️ Por bairro' : '💲 Taxa fixa'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {form.type === 'DISTRICT' && (
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-medium">Nome do bairro *</label>
                <input className="h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: Centro, Jardim América..."
                  value={form.district} onChange={(e) => set('district', e.target.value)} required />
              </div>
            )}

            {form.type === 'RADIUS' && (
              <p className="col-span-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Vale para qualquer endereço. Se você também cadastrar bairros, eles usam a taxa deles e os demais pagam a taxa fixa.
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Taxa de entrega (R$) *</label>
              <input type="number" step="0.50" min="0"
                className="h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="5.00" value={form.fee} onChange={(e) => set('fee', e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Pedido mínimo (R$)</label>
              <input type="number" step="1" min="0"
                className="h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0" value={form.minOrder} onChange={(e) => set('minOrder', e.target.value)} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Entrega grátis a partir de (R$)</label>
              <input type="number" step="1" min="0"
                className="h-10 w-full rounded-xl border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Deixe vazio para não aplicar" value={form.freeFrom} onChange={(e) => set('freeFrom', e.target.value)} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Nome/apelido (opcional)</label>
              <input className="h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: Zona Sul, Norte..." value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
              <Check className="h-4 w-4" />
              {isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar área'}
            </button>
            <button type="button" onClick={cancelForm}
              className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de áreas */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : areas.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">Nenhuma área configurada</p>
          <p className="text-xs text-muted-foreground">
            Cadastre uma taxa fixa ou a taxa de cada bairro. Sem nenhuma área, a entrega sai sem taxa.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {areas.map((area) => (
            <div key={area.id} className={`rounded-2xl border bg-card px-4 py-3 flex items-center gap-4
              ${!area.isActive ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {area.type === 'DISTRICT' ? `🏘️ ${area.district}` : '💲 Qualquer endereço'}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {TYPE_LABELS[area.type] ?? area.type}
                  </span>
                  {area.name && (
                    <span className="text-xs text-muted-foreground">— {area.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">{currency(Number(area.fee))}</span>
                  {Number(area.minOrder) > 0 && <span>mín: {currency(Number(area.minOrder))}</span>}
                  {area.freeFrom && <span className="text-green-600">grátis a partir de {currency(Number(area.freeFrom))}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => updateArea.mutate({ id: area.id, isActive: !area.isActive })}
                  className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none
                    ${area.isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                    ${area.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <button onClick={() => openEdit(area)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir a área "${area.district ?? area.name ?? area.type}"? Esta ação não pode ser desfeita.`))
                      deleteArea.mutate(area.id)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dica */}
      {areas.length > 0 && (
        <p className="text-xs text-muted-foreground">
          💡 A taxa é calculada automaticamente no checkout com base no bairro informado pelo cliente.
          Bairros não listados serão recusados na finalização do pedido.
        </p>
      )}
    </div>
    </div>
  )
}
