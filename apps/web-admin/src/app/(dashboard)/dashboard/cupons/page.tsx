'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, Tag, Check, X, Copy } from 'lucide-react'
import {
  useCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  COUPON_TYPE_LABELS,
  type Coupon,
} from '@/hooks/use-coupons'
import { currency } from '@/lib/utils'

type CouponType = Coupon['type']

interface FormState {
  code: string
  type: CouponType
  value: string
  minOrder: string
  maxUses: string
  expiresAt: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  code: '',
  type: 'PERCENT_DISCOUNT',
  value: '',
  minOrder: '0',
  maxUses: '',
  expiresAt: '',
  isActive: true,
}

function typeIcon(type: string) {
  if (type === 'PERCENT_DISCOUNT') return '🏷️'
  if (type === 'FIXED_DISCOUNT') return '💵'
  if (type === 'FREE_DELIVERY') return '🛵'
  return '🎁'
}

function discountLabel(coupon: Coupon) {
  if (coupon.type === 'PERCENT_DISCOUNT') return `${Number(coupon.value)}% OFF`
  if (coupon.type === 'FIXED_DISCOUNT') return `${currency(Number(coupon.value))} OFF`
  if (coupon.type === 'FREE_DELIVERY') return 'Frete Grátis'
  return `${currency(Number(coupon.value))} OFF`
}

function couponStatus(coupon: Coupon): { label: string; color: string } {
  if (!coupon.isActive) return { label: 'Inativo', color: 'bg-muted text-muted-foreground' }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date())
    return { label: 'Expirado', color: 'bg-red-100 text-red-700' }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
    return { label: 'Esgotado', color: 'bg-orange-100 text-orange-700' }
  return { label: 'Ativo', color: 'bg-green-100 text-green-700' }
}

export default function CuponsPage() {
  const { data: coupons = [], isLoading } = useCoupons()
  const createCoupon = useCreateCoupon()
  const updateCoupon = useUpdateCoupon()
  const deleteCoupon = useDeleteCoupon()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  function set(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(c: Coupon) {
    setEditingId(c.id)
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minOrder: String(c.minOrder),
      maxUses: c.maxUses != null ? String(c.maxUses) : '',
      // Converte para data local (evita shift de timezone UTC→local)
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-CA') : '',
      isActive: c.isActive,
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

    if (form.code.trim().length < 3) { setFormError('Código deve ter pelo menos 3 caracteres'); return }
    const value = parseFloat(form.value)
    if (form.type !== 'FREE_DELIVERY' && (isNaN(value) || value < 0)) { setFormError('Valor do desconto inválido'); return }
    if (form.type === 'PERCENT_DISCOUNT' && value > 100) { setFormError('Percentual não pode ser maior que 100'); return }

    const payload = {
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value,
      minOrder: parseFloat(form.minOrder) || 0,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt + 'T23:59:59').toISOString() : null,
      isActive: form.isActive,
    }

    try {
      if (editingId) {
        await updateCoupon.mutateAsync({ id: editingId, ...payload })
      } else {
        await createCoupon.mutateAsync(payload)
      }
      cancelForm()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Erro ao salvar cupom')
    }
  }

  async function handleCopyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const isPending = createCoupon.isPending || updateCoupon.isPending

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cupons e Promoções</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie códigos de desconto para seus clientes
          </p>
        </div>
        {!showForm && (
          <button onClick={openCreate}
            className="flex shrink-0 self-start sm:self-auto items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" />
            Novo cupom
          </button>
        )}
      </div>

      {/* Formulário inline */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? 'Editar cupom' : 'Novo cupom'}</h2>
            <button type="button" onClick={cancelForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Código */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Código *</label>
              <input
                className="h-10 w-full rounded-xl border px-3 text-sm font-mono uppercase placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="ex: BEMVINDO10"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                required
              />
            </div>

            {/* Tipo */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Tipo de desconto *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponType, value: '' }))}
                className="h-10 w-full rounded-xl border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(COUPON_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Valor */}
            {form.type !== 'FREE_DELIVERY' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">
                  {form.type === 'PERCENT_DISCOUNT' ? 'Percentual (%)' : 'Valor (R$)'} *
                </label>
                <input
                  type="number" step={form.type === 'PERCENT_DISCOUNT' ? '1' : '0.50'} min="0"
                  max={form.type === 'PERCENT_DISCOUNT' ? '100' : undefined}
                  className="h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={form.type === 'PERCENT_DISCOUNT' ? '10' : '5.00'}
                  value={form.value}
                  onChange={(e) => set('value', e.target.value)}
                  required
                />
              </div>
            )}

            {/* Pedido mínimo */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Pedido mínimo (R$)</label>
              <input
                type="number" step="1" min="0"
                className="h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0"
                value={form.minOrder}
                onChange={(e) => set('minOrder', e.target.value)}
              />
            </div>

            {/* Limite de usos */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Limite de usos</label>
              <input
                type="number" step="1" min="1"
                className="h-10 w-full rounded-xl border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Sem limite"
                value={form.maxUses}
                onChange={(e) => set('maxUses', e.target.value)}
              />
            </div>

            {/* Expiração */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Válido até</label>
              <input
                type="date"
                className="h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.expiresAt}
                onChange={(e) => set('expiresAt', e.target.value)}
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
            <span className="text-sm font-medium">Cupom ativo</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
              <Check className="h-4 w-4" />
              {isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar cupom'}
            </button>
            <button type="button" onClick={cancelForm}
              className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de cupons */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
          <Tag className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">Nenhum cupom criado</p>
          <p className="text-xs text-muted-foreground">
            Crie cupons de desconto para aumentar as vendas e fidelizar clientes.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => {
            const st = couponStatus(c)
            return (
              <div key={c.id} className={`rounded-2xl border bg-card p-4 flex items-center gap-4 ${!c.isActive ? 'opacity-60' : ''}`}>
                <div className="text-2xl">{typeIcon(c.type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Código */}
                    <button
                      onClick={() => handleCopyCode(c.code)}
                      className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-0.5 font-mono text-sm font-bold hover:bg-muted/80 transition"
                      title="Copiar código"
                    >
                      {c.code}
                      {copied === c.code
                        ? <Check className="h-3 w-3 text-green-600" />
                        : <Copy className="h-3 w-3 text-muted-foreground" />
                      }
                    </button>

                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="font-semibold text-primary">{discountLabel(c)}</span>
                    <span>{COUPON_TYPE_LABELS[c.type] ?? c.type}</span>
                    {Number(c.minOrder) > 0 && <span>mín: {currency(Number(c.minOrder))}</span>}
                    {c.maxUses && (
                      <span>{c.usedCount}/{c.maxUses} usos</span>
                    )}
                    {!c.maxUses && c.usedCount > 0 && (
                      <span>{c.usedCount} uso{c.usedCount > 1 ? 's' : ''}</span>
                    )}
                    {c.expiresAt && (
                      <span>até {new Date(c.expiresAt).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Toggle ativo */}
                  <button
                    onClick={() => updateCoupon.mutate({ id: c.id, isActive: !c.isActive })}
                    className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none
                      ${c.isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                      ${c.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                  <button onClick={() => openEdit(c)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir o cupom "${c.code}"? Esta ação não pode ser desfeita.`))
                        deleteCoupon.mutate(c.id)
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
