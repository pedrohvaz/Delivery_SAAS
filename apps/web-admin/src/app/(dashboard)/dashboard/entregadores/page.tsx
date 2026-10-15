'use client'

import { useMemo, useState } from 'react'
import {
  Plus, Trash2, Pencil, Bike, Check, X, Search, MessageCircle, Phone, Navigation, Wallet, Users, PackageCheck,
  ListChecks, Download, AlertTriangle, Power,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  useDeliverymen, useCreateDeliveryman, useUpdateDeliveryman, useDeleteDeliveryman,
  useDeliverymenReport, useDeliverymanDeliveries,
  type Deliveryman, type DeliverymanStats,
} from '@/hooks/use-deliverymen'
import { useAuthStore } from '@/store/auth'
import { currency } from '@/lib/utils'
import { cn, MoneyInput } from '@delivery/ui'

// ─── Utilidades ───────────────────────────────────────────────────────────────

const VEICULOS = [
  { value: 'Moto', emoji: '🏍️' },
  { value: 'Bicicleta', emoji: '🚲' },
  { value: 'Carro', emoji: '🚗' },
  { value: 'A pé', emoji: '🚶' },
]
const emojiDe = (v: string | null) => VEICULOS.find((x) => x.value === v)?.emoji ?? '🛵'
const onlyDigits = (s: string) => s.replace(/\D/g, '')
function whatsappUrl(phone: string | null, text?: string) {
  if (!phone) return null
  let d = onlyDigits(phone)
  if (d.length === 10 || d.length === 11) d = '55' + d
  if (d.length < 12) return null
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
function formatPhone(phone: string | null) {
  if (!phone) return ''
  let d = onlyDigits(phone)
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}
const comissaoLabel = (d: Pick<Deliveryman, 'commission' | 'commissionType'>) =>
  d.commissionType === 'FIXED'
    ? `${currency(d.commission)} por entrega`
    : d.commission > 0 ? `${d.commission.toLocaleString('pt-BR')}% da taxa de entrega` : 'Sem valor definido'

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
const shift = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d }
const diaBR = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`
type Preset = 'today' | 'yesterday' | '7d' | 'month' | 'custom'
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Hoje' }, { key: 'yesterday', label: 'Ontem' }, { key: '7d', label: '7 dias' },
  { key: 'month', label: 'Este mês' }, { key: 'custom', label: 'Escolher datas' },
]
function rangeOf(p: Preset): { from: string; to: string } {
  const now = new Date()
  if (p === 'yesterday') return { from: ymd(shift(-1)), to: ymd(shift(-1)) }
  if (p === '7d') return { from: ymd(shift(-6)), to: ymd(now) }
  if (p === 'month') return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) }
  return { from: ymd(now), to: ymd(now) }
}

// ─── Formulário ───────────────────────────────────────────────────────────────

interface FormState {
  name: string; phone: string; vehicle: string; plate: string
  commissionType: 'PERCENT' | 'FIXED'; commission: string; isActive: boolean
}
const EMPTY_FORM: FormState = { name: '', phone: '', vehicle: 'Moto', plate: '', commissionType: 'FIXED', commission: '', isActive: true }
const INPUT = 'h-10 w-full rounded-xl border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function FormModal({ editing, onClose, onDelete }: { editing: Deliveryman | null; onClose: () => void; onDelete?: () => void }) {
  const create = useCreateDeliveryman()
  const update = useUpdateDeliveryman()
  const [form, setForm] = useState<FormState>(editing ? {
    name: editing.name, phone: editing.phone ?? '', vehicle: editing.vehicle ?? 'Moto', plate: editing.plate ?? '',
    commissionType: editing.commissionType ?? 'PERCENT', commission: editing.commission ? String(editing.commission) : '', isActive: editing.isActive,
  } : EMPTY_FORM)
  const [erro, setErro] = useState('')
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (form.name.trim().length < 2) { setErro('Informe o nome'); return }
    const commission = form.commission.trim() === '' ? 0 : parseFloat(form.commission.replace(',', '.'))
    if (isNaN(commission) || commission < 0) { setErro('Valor de pagamento inválido'); return }
    if (form.commissionType === 'PERCENT' && commission > 100) { setErro('A porcentagem vai de 0 a 100'); return }
    const payload = {
      name: form.name.trim(), phone: form.phone.trim() || null, vehicle: form.vehicle || null, plate: form.plate.trim() || null,
      commissionType: form.commissionType, commission, isActive: form.isActive,
    }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...payload })
      else await create.mutateAsync(payload)
      onClose()
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? 'Erro ao salvar entregador')
    }
  }

  const pending = create.isPending || update.isPending
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editing ? 'Editar entregador' : 'Novo entregador'}
        className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{editing ? 'Editar entregador' : 'Novo entregador'}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium sm:col-span-2">Nome *
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: João Silva" autoFocus className={INPUT} />
          </label>
          <label className="space-y-1 text-xs font-medium">WhatsApp
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" className={INPUT} />
          </label>
          <label className="space-y-1 text-xs font-medium">Placa
            <input value={form.plate} onChange={(e) => set('plate', e.target.value.toUpperCase())} placeholder="ABC1D23" maxLength={10} className={INPUT} />
          </label>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium">Veículo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {VEICULOS.map((v) => (
              <button key={v.value} type="button" onClick={() => set('vehicle', v.value)}
                className={cn('min-h-10 rounded-xl border text-sm', form.vehicle === v.value ? 'border-primary bg-primary/10 font-semibold text-primary' : 'hover:bg-muted')}>
                {v.emoji} {v.value}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border p-3">
          <p className="text-xs font-medium">Como ele recebe</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ k: 'FIXED' as const, l: 'Valor por entrega' }, { k: 'PERCENT' as const, l: '% da taxa de entrega' }].map((o) => (
              <button key={o.k} type="button" onClick={() => { set('commissionType', o.k); set('commission', '') }}
                className={cn('min-h-10 rounded-xl border px-2 text-sm', form.commissionType === o.k ? 'border-primary bg-primary/10 font-semibold text-primary' : 'hover:bg-muted')}>
                {o.l}
              </button>
            ))}
          </div>
          {form.commissionType === 'FIXED' ? (
            <MoneyInput value={form.commission} onValueChange={(v) => set('commission', v)} placeholder="Ex.: R$ 6,00 por entrega" className={INPUT} />
          ) : (
            <div className="relative">
              <input type="number" min="0" max="100" step="1" inputMode="numeric" value={form.commission}
                onChange={(e) => set('commission', e.target.value)} placeholder="Ex.: 100 (fica com a taxa toda)" className={cn(INPUT, 'pr-8')} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Usado para calcular quanto pagar a ele no período. Deixe vazio se não quiser calcular.</p>
        </div>

        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          Ativo (aparece para escolher nos pedidos)
        </label>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:flex-none sm:px-6">
            <Check className="h-4 w-4" /> {pending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={onClose} className="h-11 rounded-xl border px-5 text-sm font-medium hover:bg-muted">Cancelar</button>
          {onDelete && (
            <button type="button" onClick={onDelete} aria-label="Excluir entregador" title="Excluir entregador"
              className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

// ─── Entregas de um entregador ────────────────────────────────────────────────

function EntregasModal({ d, from, to, onClose }: { d: Deliveryman; from: string; to: string; onClose: () => void }) {
  const { data: rows = [], isLoading } = useDeliverymanDeliveries(d.id, from, to)
  const storeName = useAuthStore((s) => s.store?.name)
  const feitas = rows.filter((r) => r.status === 'DELIVERED')
  const total = feitas.reduce((a, r) => a + r.toPay, 0)
  const periodo = from === to ? diaBR(from) : `${diaBR(from)} a ${diaBR(to)}`
  const resumo = `Olá, ${d.name.split(' ')[0]}! Resumo das suas entregas na ${storeName ?? 'loja'} (${periodo}):\n`
    + `• ${feitas.length} entrega(s)\n• Valor a receber: ${currency(total)}`

  function planilha() {
    const head = ['Pedido', 'Data', 'Cliente', 'Bairro', 'Endereço', 'Taxa de entrega (R$)', 'A pagar (R$)']
    const lines = feitas.map((r) => [`#${r.orderNumber}`, new Date(r.createdAt).toLocaleString('pt-BR'), r.customer ?? '', r.district ?? '', r.address ?? '',
      r.deliveryFee.toFixed(2).replace('.', ','), r.toPay.toFixed(2).replace('.', ',')])
    const csv = '﻿' + [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: `entregas-${d.name.split(' ')[0].toLowerCase()}-${from}-a-${to}.csv` }).click()
    URL.revokeObjectURL(url)
  }

  const wa = whatsappUrl(d.phone, resumo)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Entregas de ${d.name}`}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-card shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2 border-b p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-bold">Entregas de {d.name}</h2>
            <p className="text-xs text-muted-foreground">{periodo} · {comissaoLabel(d)}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:p-5">
          <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Entregas concluídas</p><p className="text-xl font-bold">{feitas.length}</p></div>
          <div className="rounded-xl bg-primary/10 p-3"><p className="text-xs text-muted-foreground">Valor a pagar</p><p className="text-xl font-bold text-primary">{currency(total)}</p></div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-5">
          {isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
            : rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma entrega neste período.</p>
            : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">#{r.orderNumber} {r.customer ? `· ${r.customer}` : ''}
                        {r.status !== 'DELIVERED' && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">em rota</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {r.district ? ` · ${r.district}` : ''}{r.address ? ` · ${r.address}` : ''}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold">{currency(r.toPay)}</p>
                      <p className="text-muted-foreground">taxa {currency(r.deliveryFee)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
        <div className="flex flex-wrap gap-2 border-t p-4 sm:p-5">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 text-sm font-medium text-green-700 hover:bg-green-100">
              <MessageCircle className="h-4 w-4" /> Enviar resumo no WhatsApp
            </a>
          )}
          <button onClick={planilha} disabled={feitas.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium hover:bg-muted disabled:opacity-40">
            <Download className="h-4 w-4" /> Planilha
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function EntregadoresPage() {
  const { data: deliverymen = [], isLoading } = useDeliverymen()
  const update = useUpdateDeliveryman()
  const remove = useDeleteDeliveryman()

  const [preset, setPreset] = useState<Preset>('today')
  const [custom, setCustom] = useState(rangeOf('7d'))
  const { from, to } = preset === 'custom' ? custom : rangeOf(preset)
  const { data: report } = useDeliverymenReport(from, to)

  const [filtro, setFiltro] = useState<'all' | 'active' | 'inactive'>('active')
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState<{ open: boolean; editing: Deliveryman | null }>({ open: false, editing: null })
  const [entregasDe, setEntregasDe] = useState<Deliveryman | null>(null)
  const [aviso, setAviso] = useState('')

  const stats = useMemo(() => new Map((report?.data ?? []).map((s) => [s.deliverymanId, s])), [report])
  const vazio: DeliverymanStats = { deliverymanId: '', deliveries: 0, fees: 0, ordersTotal: 0, toPay: 0, inRoute: 0 }
  const ativos = deliverymen.filter((d) => d.isActive).length
  const totals = report?.meta.totals

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return deliverymen
      .filter((d) => filtro === 'all' || (filtro === 'active' ? d.isActive : !d.isActive))
      .filter((d) => !q || d.name.toLowerCase().includes(q) || onlyDigits(d.phone ?? '').includes(onlyDigits(q) || '\u0000') || (d.plate ?? '').toLowerCase().includes(q))
      .sort((a, b) => (stats.get(b.id)?.inRoute ?? 0) - (stats.get(a.id)?.inRoute ?? 0) || (stats.get(b.id)?.deliveries ?? 0) - (stats.get(a.id)?.deliveries ?? 0) || a.name.localeCompare(b.name, 'pt-BR'))
  }, [deliverymen, filtro, busca, stats])

  async function excluir(d: Deliveryman) {
    if (!confirm(`Excluir ${d.name}?`)) return
    setAviso('')
    try { await remove.mutateAsync(d.id) } catch (err: any) { setAviso(err?.response?.data?.message ?? 'Não foi possível excluir.') }
  }

  const periodo = from === to ? (preset === 'today' ? 'hoje' : diaBR(from)) : `${diaBR(from)} a ${diaBR(to)}`
  const cards = [
    { label: 'Entregadores ativos', valor: `${ativos}`, sub: `de ${deliverymen.length} cadastrados`, icon: Users, cor: 'bg-primary/10 text-primary' },
    { label: 'Em rota agora', valor: `${totals?.inRoute ?? 0}`, sub: 'pedidos saindo para entrega', icon: Navigation, cor: 'bg-blue-100 text-blue-700' },
    { label: `Entregas ${periodo}`, valor: `${totals?.deliveries ?? 0}`, sub: `${currency(totals?.fees ?? 0)} em taxas`, icon: PackageCheck, cor: 'bg-green-100 text-green-700' },
    { label: `A pagar ${periodo}`, valor: currency(totals?.toPay ?? 0), sub: 'pela forma de pagamento de cada um', icon: Wallet, cor: 'bg-amber-100 text-amber-700' },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Entregadores</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sua equipe de entrega, quem está em rota e quanto pagar a cada um.</p>
          </div>
          <button onClick={() => setForm({ open: true, editing: null })}
            className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Novo entregador
          </button>
        </div>

        {/* Período */}
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PRESETS.map(({ key, label }) => (
              <button key={key} onClick={() => setPreset(key)}
                className={cn('inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-xs font-medium transition',
                  preset === key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
                {label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">De</span>
              <input type="date" value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} className="h-10 rounded-xl border bg-card px-3 text-sm" />
              <span className="text-muted-foreground">até</span>
              <input type="date" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} className="h-10 rounded-xl border bg-card px-3 text-sm" />
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map(({ label, valor, sub, icon: Icon, cor }) => (
            <div key={label} className="min-w-0 rounded-2xl border bg-card p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', cor)}><Icon className="h-4 w-4" /></span>
                <span className="leading-tight">{label}</span>
              </div>
              <p className="mt-2 break-words text-xl font-bold sm:text-2xl">{valor}</p>
              <p className="text-[11px] text-muted-foreground sm:text-xs">{sub}</p>
            </div>
          ))}
        </div>

        {(report?.meta.unassigned ?? 0) > 0 && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {report!.meta.unassigned} entrega(s) {periodo} sem entregador marcado. Escolha o entregador no pedido para elas entrarem no pagamento.
          </p>
        )}
        {aviso && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{aviso}</p>}

        {/* Filtros */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, telefone ou placa..."
              className="h-10 w-full rounded-xl border bg-card pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-2">
            {[{ k: 'active' as const, l: 'Ativos', n: ativos }, { k: 'inactive' as const, l: 'Desativados', n: deliverymen.length - ativos }, { k: 'all' as const, l: 'Todos', n: deliverymen.length }].map((f) => (
              <button key={f.k} onClick={() => setFiltro(f.k)}
                className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium',
                  filtro === f.k ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
                {f.l} <span className="opacity-70">{f.n}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : deliverymen.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-dashed p-10 text-center">
            <Bike className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">Nenhum entregador cadastrado</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Cadastre sua equipe para escolher quem leva cada pedido, ver quem está em rota e saber quanto pagar no fim do dia.
            </p>
            <button onClick={() => setForm({ open: true, editing: null })}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Cadastrar entregador
            </button>
          </div>
        ) : lista.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum entregador com esse filtro.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((d) => {
              const s = stats.get(d.id) ?? vazio
              const wa = whatsappUrl(d.phone, `Olá, ${d.name.split(' ')[0]}!`)
              return (
                <div key={d.id} className={cn('flex flex-col rounded-2xl border bg-card p-4', !d.isActive && 'opacity-60')}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl">{emojiDe(d.vehicle)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{d.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.vehicle ?? 'Veículo não informado'}{d.plate ? ` · ${d.plate}` : ''}{d.phone ? ` · ${formatPhone(d.phone)}` : ''}
                      </p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      !d.isActive ? 'bg-muted text-muted-foreground' : s.inRoute > 0 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
                      {!d.isActive ? 'Desativado' : s.inRoute > 0 ? `Em rota (${s.inRoute})` : 'Disponível'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-muted/50 p-2"><p className="text-[11px] text-muted-foreground">Entregas</p><p className="font-bold">{s.deliveries}</p></div>
                    <div className="rounded-xl bg-muted/50 p-2"><p className="text-[11px] text-muted-foreground">Taxas</p><p className="truncate font-bold">{currency(s.fees)}</p></div>
                    <div className="rounded-xl bg-primary/10 p-2"><p className="text-[11px] text-muted-foreground">A pagar</p><p className="truncate font-bold text-primary">{currency(s.toPay)}</p></div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{comissaoLabel(d)} · {d._count.orders} entrega(s) no total</p>

                  <div className="mt-auto flex items-center gap-1.5 pt-3">
                    <button onClick={() => setEntregasDe(d)}
                      className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-medium hover:bg-muted">
                      <ListChecks className="h-4 w-4" /> Entregas
                    </button>
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${d.name}`} title="WhatsApp"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100">
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    {d.phone && (
                      <a href={`tel:${onlyDigits(d.phone)}`} aria-label={`Ligar para ${d.name}`} title="Ligar"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border hover:bg-muted"><Phone className="h-4 w-4" /></a>
                    )}
                    <button onClick={() => setForm({ open: true, editing: d })} aria-label="Editar" title="Editar"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => update.mutate({ id: d.id, isActive: !d.isActive })} aria-label={d.isActive ? 'Desativar' : 'Ativar'} title={d.isActive ? 'Desativar' : 'Ativar'}
                      className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', d.isActive ? 'hover:bg-muted' : 'border-green-200 text-green-700 hover:bg-green-50')}>
                      <Power className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {form.open && (
        <FormModal editing={form.editing} onClose={() => setForm({ open: false, editing: null })}
          onDelete={form.editing ? async () => { const d = form.editing!; setForm({ open: false, editing: null }); await excluir(d) } : undefined} />
      )}
      {entregasDe && <EntregasModal d={entregasDe} from={from} to={to} onClose={() => setEntregasDe(null)} />}
    </div>
  )
}
