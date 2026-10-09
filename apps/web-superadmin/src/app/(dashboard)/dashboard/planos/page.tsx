'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, Sparkles, RefreshCw } from 'lucide-react'

// Períodos de contrato (pago adiantado). O mensal vem do "Valor mensal"; os outros são opcionais.
const LONG_CYCLES = [
  { cycle: 'QUARTERLY', key: 'q3', label: '3 meses', months: 3 },
  { cycle: 'SEMIANNUAL', key: 'q6', label: '6 meses', months: 6 },
  { cycle: 'ANNUAL', key: 'q12', label: '1 ano', months: 12 },
] as const
const ALL_CYCLES = [{ cycle: 'MONTHLY', label: 'Mensal', months: 1 }, ...LONG_CYCLES] as const
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface PlanPrice {
  cycle: string
  monthlyPrice: number | string
  stripePriceId: string | null
}

interface Plan {
  id: string
  slug: string
  name: string
  tagline: string | null
  monthlyPrice: number
  features: string[]
  color: string
  highlight: boolean
  badge: string | null
  isActive: boolean
  position: number
  stripePriceId: string | null
  stripeProductId: string | null
  prices: PlanPrice[]
}

interface FormState {
  slug: string
  name: string
  tagline: string
  monthlyPrice: string
  features: string  // textarea com uma feature por linha
  color: string
  highlight: boolean
  badge: string
  position: string
  q3: string // R$ por mês no plano de 3 meses ('' = não oferece)
  q6: string
  q12: string
}

const EMPTY_FORM: FormState = {
  slug: '', name: '', tagline: '', monthlyPrice: '0', features: '',
  color: 'from-gray-400 to-gray-500', highlight: false, badge: '', position: '0', q3: '', q6: '', q12: '',
}

const COLOR_PRESETS = [
  { value: 'from-gray-400 to-gray-500',     label: 'Cinza' },
  { value: 'from-orange-500 to-pink-500',   label: 'Laranja → Rosa' },
  { value: 'from-purple-500 to-indigo-600', label: 'Roxo → Índigo' },
  { value: 'from-green-400 to-emerald-500', label: 'Verde' },
  { value: 'from-blue-500 to-cyan-500',     label: 'Azul' },
  { value: 'from-yellow-400 to-orange-500', label: 'Amarelo → Laranja' },
]

function priceOf(p: Plan, cycle: string) {
  const v = p.prices?.find(x => x.cycle === cycle)?.monthlyPrice
  return v == null ? '' : String(Number(v))
}

export default function PlanosPage() {
  const qc = useQueryClient()
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => api.get<{ data: Plan[] }>('/plans/admin').then(r => r.data.data),
  })

  const createPlan = useMutation({
    mutationFn: (data: any) => api.post('/plans/admin', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
  })

  const updatePlan = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/plans/admin/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
  })

  const deletePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/admin/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
  })

  // Cria na Stripe os produtos e preços que ainda não existem (depois de colocar a chave no servidor)
  const syncStripe = useMutation({
    mutationFn: () => api.post<{ data: { slug: string; created: number; error?: string }[] }>('/plans/admin/sync-stripe').then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
  })
  const [syncMsg, setSyncMsg] = useState('')
  async function handleSync() {
    setSyncMsg('')
    try {
      const r = await syncStripe.mutateAsync()
      const created = r.reduce((n, x) => n + x.created, 0)
      const errs = r.filter(x => x.error)
      setSyncMsg(errs.length
        ? 'Erro na Stripe: ' + errs.map(e => e.slug + ': ' + e.error).join(' | ')
        : created ? created + ' preço(s) criado(s) na Stripe. A assinatura online já está ligada.' : 'Tudo já estava sincronizado com a Stripe.')
    } catch (err: any) {
      setSyncMsg(err?.response?.data?.message ?? 'Erro ao sincronizar com a Stripe')
    }
  }

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState('')

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  function openEdit(p: Plan) {
    setEditingId(p.id)
    setForm({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline ?? '',
      monthlyPrice: String(p.monthlyPrice),
      features: p.features.join('\n'),
      color: p.color,
      highlight: p.highlight,
      badge: p.badge ?? '',
      position: String(p.position),
      q3: priceOf(p, 'QUARTERLY'),
      q6: priceOf(p, 'SEMIANNUAL'),
      q12: priceOf(p, 'ANNUAL'),
    })
    setError('')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const features = form.features.split('\n').map(s => s.trim()).filter(Boolean)
    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      tagline: form.tagline.trim() || null,
      monthlyPrice: parseFloat(form.monthlyPrice) || 0,
      features,
      color: form.color,
      highlight: form.highlight,
      badge: form.badge.trim() || null,
      position: parseInt(form.position) || 0,
      // vazio ou 0 = o plano não oferece esse período
      prices: Object.fromEntries(LONG_CYCLES.map(c => [c.cycle, parseFloat(form[c.key]) || null])),
    }

    try {
      const res: any = editingId
        ? await updatePlan.mutateAsync({ id: editingId, ...payload })
        : await createPlan.mutateAsync(payload)
      if (res?.data?.stripeError) setSyncMsg('Plano salvo, mas a Stripe recusou: ' + res.data.stripeError)
      cancelForm()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao salvar plano')
    }
  }

  async function toggleActive(p: Plan) {
    await updatePlan.mutateAsync({ id: p.id, isActive: !p.isActive })
  }

  async function handleDelete(p: Plan) {
    if (!confirm(`Excluir o plano "${p.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deletePlan.mutateAsync(p.id)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Erro ao excluir')
    }
  }

  const isPending = createPlan.isPending || updatePlan.isPending

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os planos e o preço de cada período (mensal, 3, 6 e 12 meses, pagos adiantado). Com a Stripe ligada, os preços são criados lá automaticamente.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={handleSync} disabled={syncStripe.isPending}
            className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition disabled:opacity-60">
            <RefreshCw className={cn('h-4 w-4', syncStripe.isPending && 'animate-spin')} /> Sincronizar com a Stripe
          </button>
          {!showForm && (
            <button onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition">
              <Plus className="h-4 w-4" /> Novo plano
            </button>
          )}
        </div>
      </div>

      {syncMsg && (
        <p className={cn('rounded-xl border px-3 py-2 text-sm', /Erro|recusou/.test(syncMsg) ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800')}>
          {syncMsg}
        </p>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">{editingId ? 'Editar plano' : 'Novo plano'}</h2>
            <button type="button" onClick={cancelForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Slug *</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="ex: gratis, pro, elite" disabled={!!editingId}
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" required />
              {editingId && <p className="text-xs text-muted-foreground">Slug não pode ser alterado após criação.</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Grátis, Pro, Elite..."
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Tagline</label>
              <input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                placeholder="Pra quem quer crescer"
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor mensal (R$) *</label>
              <input type="number" min="0" step="0.01" value={form.monthlyPrice}
                onChange={e => setForm(f => ({ ...f, monthlyPrice: e.target.value }))}
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" required />
              <p className="text-xs text-muted-foreground">0 = grátis. Acima disso, cria produto + preço na Stripe.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Posição (ordem)</label>
              <input type="number" value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {/* Preço por mês dos períodos longos (o total cobrado é o valor x meses) */}
            <div className="col-span-2 grid grid-cols-3 gap-3 rounded-xl border bg-muted/30 p-3">
              {LONG_CYCLES.map(c => {
                const monthly = parseFloat(form.monthlyPrice) || 0
                const v = parseFloat(form[c.key]) || 0
                const pct = monthly && v ? Math.round((1 - v / monthly) * 100) : 0
                return (
                  <div key={c.cycle} className="space-y-1.5">
                    <label className="text-sm font-medium">{c.label} (R$ por mês)</label>
                    <input type="number" min="0" step="0.01" value={form[c.key]} placeholder="não oferece"
                      onChange={e => setForm(f => ({ ...f, [c.key]: e.target.value }))}
                      className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                    <p className="text-xs text-muted-foreground">
                      {v ? brl(v * c.months) + ' a cada ' + c.months + ' meses' + (pct > 0 ? ' · ' + pct + '% off' : '') : 'vazio = não oferece'}
                    </p>
                  </div>
                )
              })}
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Features (uma por linha) *</label>
              <textarea value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                rows={6} placeholder={`Pedidos ilimitados\nWhatsApp automatizado\nPIX automático\n...`}
                className="w-full rounded-xl border px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cor (gradiente)</label>
              <select value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                {COLOR_PRESETS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Badge (opcional)</label>
              <input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                placeholder="MAIS POPULAR, NOVO, etc"
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button type="button" onClick={() => setForm(f => ({ ...f, highlight: !f.highlight }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.highlight ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.highlight ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm font-medium">Plano em destaque (highlight visual na landing)</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
              <Check className="h-4 w-4" />
              {isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar plano'}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center space-y-2">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">Nenhum plano cadastrado</p>
          <p className="text-xs text-muted-foreground">Crie planos que aparecerão na landing page automaticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className={cn(
              'relative rounded-2xl border bg-card p-5 space-y-4 flex flex-col',
              plan.highlight && 'ring-2 ring-primary border-primary',
              !plan.isActive && 'opacity-50',
            )}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-orange-900">⚡ {plan.badge}</span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold',
                  plan.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                )}>
                  {plan.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">{brl(Number(plan.monthlyPrice))}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>

              {/* Preço de cada período e se já existe na Stripe */}
              {plan.prices?.length > 0 && (
                <div className="rounded-lg border divide-y text-xs">
                  {ALL_CYCLES.map(c => {
                    const p = plan.prices.find(x => x.cycle === c.cycle)
                    if (!p) return null
                    const v = Number(p.monthlyPrice)
                    return (
                      <div key={c.cycle} className="flex items-center justify-between gap-2 px-2 py-1.5">
                        <span className="font-medium">{c.label}</span>
                        <span className="text-muted-foreground">{brl(v)}/mês{c.months > 1 ? ' · ' + brl(v * c.months) : ''}</span>
                        <span className={cn('rounded px-1.5 py-0.5 font-semibold', p.stripePriceId ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800')}>
                          {p.stripePriceId ? 'Stripe ok' : 'pendente'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex-1 space-y-1.5">
                {plan.features.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
                {plan.features.length > 5 && (
                  <p className="text-xs text-muted-foreground">+ {plan.features.length - 5} feature(s)</p>
                )}
              </div>

              {/* Stripe IDs (referência) */}
              {(plan.stripeProductId || plan.stripePriceId) && (
                <div className="rounded-lg bg-muted/50 p-2 text-[10px] text-muted-foreground space-y-0.5 font-mono">
                  {plan.stripeProductId && <p>prod: {plan.stripeProductId.slice(0, 20)}...</p>}
                  {plan.stripePriceId && <p>price: {plan.stripePriceId.slice(0, 20)}...</p>}
                </div>
              )}

              <div className="flex gap-1.5 pt-2 border-t">
                <button onClick={() => toggleActive(plan)}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs hover:bg-muted transition">
                  {plan.isActive ? <ToggleRight className="h-3.5 w-3.5 text-green-600" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  {plan.isActive ? 'Desativar' : 'Ativar'}
                </button>
                <button onClick={() => openEdit(plan)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted transition">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(plan)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Stripe */}
      <div className="rounded-2xl border bg-blue-50/50 border-blue-200 p-4 text-sm space-y-2">
        <p className="font-semibold text-blue-900">💳 Configurar Stripe</p>
        <p className="text-xs text-blue-800">Coloque estas variáveis no arquivo .env do servidor (serviço da API), publique a API e depois clique em "Sincronizar com a Stripe":</p>
        <ul className="text-xs text-blue-800 list-disc pl-5 space-y-0.5 font-mono">
          <li><strong>STRIPE_SECRET_KEY</strong> — chave secreta do Stripe (sk_test_... ou sk_live_...)</li>
          <li><strong>STRIPE_WEBHOOK_SECRET</strong> — segredo do webhook (whsec_...)</li>
        </ul>
        <p className="text-xs text-blue-800">Webhook URL: <code className="bg-blue-100 px-1 rounded">{(process.env.NEXT_PUBLIC_API_URL ?? 'https://api.bylink.shop') + '/stripe/webhook'}</code></p>
        <p className="text-xs text-blue-800">Eventos do webhook: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed.</p>
      </div>
    </div>
  )
}
