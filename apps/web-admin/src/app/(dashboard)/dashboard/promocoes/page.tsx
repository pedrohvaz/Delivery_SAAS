'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { useCashback, useUpdateCashback, usePromoStats } from '@/hooks/use-promocoes'
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, COUPON_TYPE_LABELS } from '@/hooks/use-coupons'
import {
  Tag, Gift, TrendingDown, Percent, Plus, Pencil, Trash2, Copy,
  Check, ToggleLeft, ToggleRight, X, RefreshCw,
} from 'lucide-react'
import { cn, MoneyInput } from '@delivery/ui'
import { currency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const COUPON_EMOJIS: Record<string, string> = {
  PERCENT_DISCOUNT: '🏷️',
  FIXED_DISCOUNT: '💵',
  FREE_DELIVERY: '🚚',
  ITEM_DISCOUNT: '🎯',
}

function couponStatus(c: { isActive: boolean; expiresAt: string | null; usedCount: number; maxUses: number | null }) {
  if (!c.isActive) return { label: 'Inativo', color: 'bg-muted text-muted-foreground' }
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: 'Expirado', color: 'bg-red-100 text-red-700' }
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { label: 'Esgotado', color: 'bg-orange-100 text-orange-700' }
  return { label: 'Ativo', color: 'bg-green-100 text-green-700' }
}

function couponDescription(c: { type: string; value: number }) {
  if (c.type === 'FREE_DELIVERY') return 'Frete grátis'
  if (c.type === 'PERCENT_DISCOUNT') return `${c.value}% de desconto`
  if (c.type === 'FIXED_DISCOUNT') return `${currency(c.value)} de desconto`
  return `Desconto no item`
}

// ─── Formulário de Cupom ─────────────────────────────────────────────────────

function CouponForm({ initial, onSave, onCancel, loading, error }: {
  initial?: any; onSave: (d: any) => void; onCancel: () => void; loading: boolean; error?: string
}) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [type, setType] = useState(initial?.type ?? 'PERCENT_DISCOUNT')
  const [value, setValue] = useState(initial?.value ? String(initial.value) : '')
  const [minOrder, setMinOrder] = useState(initial?.minOrder ? String(initial.minOrder) : '0')
  const [maxUses, setMaxUses] = useState(initial?.maxUses ? String(initial.maxUses) : '')
  const [expiresAt, setExpiresAt] = useState(
    initial?.expiresAt ? new Date(initial.expiresAt).toLocaleDateString('en-CA') : '',
  )

  const needsValue = type !== 'FREE_DELIVERY'
  const isPercent = type === 'PERCENT_DISCOUNT'

  function buildPayload() {
    const parsedValue = needsValue ? parseFloat(value) : 0
    // Fim do dia selecionado no fuso local para evitar shift de timezone
    const expiresIso = expiresAt ? `${expiresAt}T23:59:59` : null
    return {
      code, type,
      value: parsedValue,
      minOrder: parseFloat(minOrder) || 0,
      maxUses: maxUses ? parseInt(maxUses) : null,
      expiresAt: expiresIso,
      isActive: initial?.isActive ?? true,
    }
  }

  const isValid = code.trim().length >= 3 && (!needsValue || (value !== '' && parseFloat(value) >= 0 && (!isPercent || parseFloat(value) <= 100)))

  return (
    <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Código *</label>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EX: DESCONTO10"
            className="w-full h-9 rounded-xl border px-3 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Tipo *</label>
          <select value={type} onChange={(e) => { setType(e.target.value); setValue('') }}
            className="w-full h-9 rounded-xl border px-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40">
            {Object.entries(COUPON_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {needsValue && (
          <div className="space-y-1">
            <label className="text-xs font-medium">Valor * {isPercent && <span className="text-muted-foreground">(máx 100)</span>}</label>
            {isPercent ? (
              <input
                type="number" min="0" max={100} step="1" inputMode="numeric"
                value={value} onChange={(e) => setValue(e.target.value)}
                placeholder="10"
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            ) : (
              <MoneyInput
                value={value} onValueChange={setValue}
                className="w-full h-10 rounded-xl border px-3 text-sm tabular-nums bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium">Pedido mínimo (R$)</label>
          <MoneyInput value={minOrder} onValueChange={setMinOrder} placeholder="Sem mínimo"
            className="w-full h-10 rounded-xl border px-3 text-sm tabular-nums bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Limite de usos</label>
          <input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Ilimitado"
            className="w-full h-9 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Expira em</label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full h-9 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => onSave(buildPayload())} disabled={loading || !isValid}
          className="h-8 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" />{loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={onCancel} className="h-8 px-3 rounded-xl border text-xs hover:bg-muted transition">Cancelar</button>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function PromocoesPage() {
  const { data: stats } = usePromoStats()
  const { data: cashback } = useCashback()
  const updateCashback = useUpdateCashback()
  const { data: coupons = [] } = useCoupons()
  const createCoupon = useCreateCoupon()
  const updateCoupon = useUpdateCoupon()
  const deleteCoupon = useDeleteCoupon()

  // Cashback form
  const [percentBack, setPercentBack] = useState('5')
  const [minOrderCb, setMinOrderCb] = useState('0')
  const [expirationDays, setExpirationDays] = useState('30')
  const [cbSaved, setCbSaved] = useState(false)

  useEffect(() => {
    if (cashback) {
      setPercentBack(String(cashback.percentBack))
      setMinOrderCb(String(cashback.minOrderValue))
      setExpirationDays(String(cashback.expirationDays))
    }
  }, [cashback])

  // Cupons
  const [showNewCoupon, setShowNewCoupon] = useState(false)
  const [newCouponError, setNewCouponError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCouponError, setEditCouponError] = useState('')
  const [cbError, setCbError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  async function handleSaveCashback(e: React.FormEvent) {
    e.preventDefault()
    setCbError('')
    try {
      await updateCashback.mutateAsync({
        percentBack: parseFloat(percentBack),
        minOrderValue: parseFloat(minOrderCb) || 0,
        expirationDays: parseInt(expirationDays) || 30,
      })
      setCbSaved(true)
      setTimeout(() => setCbSaved(false), 3000)
    } catch (err: any) {
      setCbError(err?.response?.data?.message ?? 'Erro ao salvar cashback.')
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const filteredCoupons = coupons.filter((c) => {
    const expired = c.expiresAt != null && new Date(c.expiresAt) < new Date()
    const exhausted = c.maxUses != null && c.usedCount >= c.maxUses
    if (filter === 'active') return c.isActive && !expired && !exhausted
    if (filter === 'inactive') return !c.isActive || expired || exhausted
    return true
  })

  const statCards = [
    { label: 'Descontos concedidos (30d)', value: currency(Number(stats?.totalDiscount30d ?? 0)), icon: TrendingDown, color: 'text-red-600 bg-red-50' },
    { label: 'Pedidos com desconto (30d)', value: stats?.ordersWithDiscount30d ?? '—', icon: Tag, color: 'text-blue-600 bg-blue-50' },
    { label: 'Usos totais de cupons', value: stats?.totalCouponsUsed ?? '—', icon: RefreshCw, color: 'text-purple-600 bg-purple-50' },
    { label: 'Cupons ativos', value: stats?.activeCoupons ?? '—', icon: Percent, color: 'text-green-600 bg-green-50' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Promoções" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
              <div>
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Cashback ── */}
        <section className="bg-card border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-yellow-50 flex items-center justify-center">
                <Gift className="h-4.5 w-4.5 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Cashback</h2>
                <p className="text-xs text-muted-foreground">Devolva uma % do valor ao cliente para próximas compras</p>
              </div>
            </div>
            <button
              onClick={() => updateCashback.mutate({ isActive: !cashback?.isActive })}
              disabled={updateCashback.isPending}
              className={cn('relative h-7 w-12 rounded-full transition-colors duration-200', cashback?.isActive ? 'bg-green-500' : 'bg-muted-foreground/30')}
            >
              <span className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: cashback?.isActive ? 'translateX(22px)' : 'translateX(2px)' }} />
            </button>
          </div>

          {cashback?.isActive && (
            <form onSubmit={handleSaveCashback} className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">% de retorno</label>
                <div className="relative">
                  <input type="number" min="1" max="100" value={percentBack} onChange={(e) => setPercentBack(e.target.value)}
                    className="w-full h-9 rounded-xl border px-3 pr-8 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Pedido mínimo</label>
                <MoneyInput value={minOrderCb} onValueChange={setMinOrderCb} placeholder="Sem mínimo"
                  className="w-full h-10 rounded-xl border px-3 text-sm tabular-nums bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Válido por (dias)</label>
                <input type="number" min="1" value={expirationDays} onChange={(e) => setExpirationDays(e.target.value)}
                  className="w-full h-9 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="col-span-3 space-y-2">
                {cbError && <p className="text-xs text-destructive">{cbError}</p>}
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={updateCashback.isPending}
                    className="h-9 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2">
                    {cbSaved ? <><Check className="h-4 w-4" />Salvo!</> : 'Salvar Cashback'}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Cliente recebe <strong>{percentBack}%</strong> de volta válido por <strong>{expirationDays} dias</strong>
                  </p>
                </div>
              </div>
            </form>
          )}
        </section>

        {/* ── Top Cupons ── */}
        {(stats?.topCoupons?.length ?? 0) > 0 && (
          <section className="bg-card border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Top Cupons Mais Usados</h2>
            <div className="space-y-2">
              {stats!.topCoupons.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <code className="font-mono font-semibold text-foreground">{c.code}</code>
                  <span className="text-muted-foreground">{couponDescription({ type: c.type, value: Number(c.value) })}</span>
                  <span className="ml-auto text-muted-foreground">{c.usedCount} uso{c.usedCount !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Cupons ── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground">Cupons de Desconto</h2>
              <span className="text-xs text-muted-foreground">{coupons.length} total</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro */}
              <div className="flex rounded-xl border bg-muted/30 p-0.5 gap-0.5">
                {([['all', 'Todos'], ['active', 'Ativos'], ['inactive', 'Inativos']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setFilter(v)}
                    className={cn('inline-flex min-h-9 items-center px-3 py-1 rounded-lg text-xs font-medium transition-colors', filter === v ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground')}>
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowNewCoupon(true)}
                className="flex shrink-0 items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition">
                <Plus className="h-3.5 w-3.5" /> Novo Cupom
              </button>
            </div>
          </div>

          {showNewCoupon && (
            <CouponForm
              onSave={async (data) => {
                setNewCouponError('')
                try {
                  await createCoupon.mutateAsync(data)
                  setShowNewCoupon(false)
                } catch (err: any) {
                  setNewCouponError(err?.response?.data?.message ?? 'Erro ao criar cupom.')
                }
              }}
              onCancel={() => { setShowNewCoupon(false); setNewCouponError('') }}
              loading={createCoupon.isPending}
              error={newCouponError}
            />
          )}

          {filteredCoupons.length === 0 && !showNewCoupon && (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <Tag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum cupom encontrado</p>
            </div>
          )}

          <div className="space-y-2">
            {filteredCoupons.map((c) => {
              const status = couponStatus(c)
              if (editingId === c.id) {
                return (
                  <CouponForm key={c.id} initial={c}
                    onSave={async (data) => {
                      setEditCouponError('')
                      try {
                        await updateCoupon.mutateAsync({ id: c.id, ...data })
                        setEditingId(null)
                      } catch (err: any) {
                        setEditCouponError(err?.response?.data?.message ?? 'Erro ao atualizar cupom.')
                      }
                    }}
                    onCancel={() => { setEditingId(null); setEditCouponError('') }}
                    loading={updateCoupon.isPending}
                    error={editCouponError}
                  />
                )
              }
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 hover:shadow-sm transition-shadow group">
                  <span className="text-xl shrink-0">{COUPON_EMOJIS[c.type] ?? '🏷️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono font-bold text-sm text-foreground">{c.code}</code>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', status.color)}>{status.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {couponDescription(c)}
                      {Number(c.minOrder) > 0 && ` · mín. ${currency(Number(c.minOrder))}`}
                      {c.expiresAt && ` · expira ${format(new Date(c.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <span>{c.usedCount}{c.maxUses != null ? `/${c.maxUses}` : ''} uso{c.usedCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => updateCoupon.mutate({ id: c.id, isActive: !c.isActive })}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition" title={c.isActive ? 'Desativar' : 'Ativar'}>
                      {c.isActive ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button onClick={() => copyCode(c.code)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition">
                      {copied === c.code ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => setEditingId(c.id)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {confirmDelete === c.id ? (
                      <div className="flex items-center gap-1 ml-1">
                        <button onClick={async () => { await deleteCoupon.mutateAsync(c.id); setConfirmDelete(null) }}
                          className="h-7 px-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition">
                          Excluir
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(c.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
