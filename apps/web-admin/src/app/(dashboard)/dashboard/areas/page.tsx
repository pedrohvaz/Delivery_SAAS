'use client'

import { useMemo, useState } from 'react'
import {
  Plus, Trash2, Pencil, MapPin, Check, X, Search, Copy, Navigation, Calculator, Home, Ruler, CircleDollarSign,
  ListPlus, ExternalLink, AlertTriangle,
} from 'lucide-react'
import {
  useDeliveryAreas, useCreateDeliveryArea, useUpdateDeliveryArea, useDeleteDeliveryArea, useBulkDistricts,
  useStoreLocation, useSaveStoreLocation, useDeliveryQuote,
  type DeliveryArea, type DeliveryAreaInput, type DeliveryQuote,
} from '@/hooks/use-delivery-areas'
import { currency } from '@/lib/utils'
import { cn, MoneyInput } from '@delivery/ui'

type FormType = 'DISTRICT' | 'RADIUS' | 'DISTANCE'
type Filtro = 'all' | FormType | 'inactive'

interface FormState {
  type: FormType
  name: string
  district: string
  fee: string
  minOrder: string
  freeFrom: string
  baseKm: string
  perKmFee: string
  radiusKm: string
}

const EMPTY_FORM: FormState = {
  type: 'DISTRICT', name: '', district: '', fee: '', minOrder: '', freeFrom: '', baseKm: '3', perKmFee: '', radiusKm: '10',
}

const TIPOS: { key: FormType; titulo: string; texto: string; icon: typeof Home }[] = [
  { key: 'DISTRICT', titulo: 'Por bairro', texto: 'Cada bairro com a sua taxa', icon: Home },
  { key: 'RADIUS', titulo: 'Taxa fixa', texto: 'Mesmo valor para qualquer endereço', icon: CircleDollarSign },
  { key: 'DISTANCE', titulo: 'Por distância', texto: 'Taxa base + valor por km', icon: Ruler },
]

const INPUT = 'h-10 w-full rounded-xl border px-3 text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const kmFmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const num = (s: string) => (s.trim() === '' ? NaN : parseFloat(s.replace(',', '.')))

/** Mesma conta da API: base cobre até baseKm; cada km (ou fração) acima soma o valor por km. */
function feeAt(km: number, fee: number, baseKm: number, perKm: number) {
  return fee + Math.max(0, Math.ceil(km - baseKm - 1e-9)) * perKm
}

function areaTitulo(a: DeliveryArea) {
  if (a.type === 'DISTRICT') return a.district ?? 'Bairro'
  if (a.type === 'RADIUS') return 'Qualquer endereço'
  if (a.type === 'DISTANCE') return `Até ${kmFmt(a.radiusKm)} km da loja`
  return a.name ?? 'Área'
}

function areaPreco(a: DeliveryArea) {
  if (a.type === 'DISTANCE') {
    return `${currency(Number(a.fee))} até ${kmFmt(a.baseKm)} km + ${currency(Number(a.perKmFee ?? 0))}/km`
  }
  return Number(a.fee) === 0 ? 'Grátis' : currency(Number(a.fee))
}

export default function AreasPage() {
  const { data: areas = [], isLoading } = useDeliveryAreas()
  const { data: loc } = useStoreLocation()
  const createArea = useCreateDeliveryArea()
  const updateArea = useUpdateDeliveryArea()
  const deleteArea = useDeleteDeliveryArea()
  const bulk = useBulkDistricts()
  const saveLoc = useSaveStoreLocation()
  const quote = useDeliveryQuote()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const [showBulk, setShowBulk] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkFee, setBulkFee] = useState('')
  const [bulkMin, setBulkMin] = useState('')
  const [bulkFree, setBulkFree] = useState('')
  const [bulkMsg, setBulkMsg] = useState('')

  const [filtro, setFiltro] = useState<Filtro>('all')
  const [busca, setBusca] = useState('')
  const [locMsg, setLocMsg] = useState('')

  const [sim, setSim] = useState({ district: '', street: '', number: '', subtotal: '50.00' })
  const [simResult, setSimResult] = useState<DeliveryQuote | null>(null)

  const temLocal = loc?.lat != null && loc?.lng != null
  const distritos = areas.filter((a) => a.type === 'DISTRICT')
  const fixa = areas.find((a) => a.type === 'RADIUS')
  const distancia = areas.filter((a) => a.type === 'DISTANCE')

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const ordem: Record<string, number> = { DISTANCE: 0, RADIUS: 1, DISTRICT: 2, POLYGON: 3 }
    return areas
      .filter((a) => filtro === 'all' || (filtro === 'inactive' ? !a.isActive : a.type === filtro))
      .filter((a) => !q || areaTitulo(a).toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q))
      .sort((a, b) => ordem[a.type]! - ordem[b.type]! || areaTitulo(a).localeCompare(areaTitulo(b), 'pt-BR'))
  }, [areas, filtro, busca])

  function openCreate(type: FormType = 'DISTRICT', base?: Partial<FormState>) {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, type, ...base })
    setFormError('')
    setShowForm(true)
    setShowBulk(false)
    requestAnimationFrame(() => document.getElementById('area-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function openEdit(area: DeliveryArea) {
    setEditingId(area.id)
    setForm({
      type: (area.type === 'POLYGON' ? 'DISTRICT' : area.type) as FormType,
      name: area.name ?? '',
      district: area.district ?? '',
      fee: String(area.fee),
      minOrder: Number(area.minOrder) > 0 ? String(area.minOrder) : '',
      freeFrom: area.freeFrom != null ? String(area.freeFrom) : '',
      baseKm: area.baseKm != null ? String(area.baseKm) : '0',
      perKmFee: area.perKmFee != null ? String(area.perKmFee) : '',
      radiusKm: area.radiusKm != null ? String(area.radiusKm) : '',
    })
    setFormError('')
    setShowForm(true)
    setShowBulk(false)
    requestAnimationFrame(() => document.getElementById('area-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function duplicar(area: DeliveryArea) {
    openCreate('DISTRICT', {
      fee: String(area.fee),
      minOrder: Number(area.minOrder) > 0 ? String(area.minOrder) : '',
      freeFrom: area.freeFrom != null ? String(area.freeFrom) : '',
    })
  }

  const set = (field: keyof FormState, value: string) => setForm((f) => ({ ...f, [field]: value }))
  const errMsg = (e: any, fallback: string) => e?.response?.data?.message ?? fallback

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const fee = num(form.fee)
    if (isNaN(fee) || fee < 0) { setFormError(form.type === 'DISTANCE' ? 'Informe a taxa base' : 'Informe a taxa de entrega'); return }
    if (form.type === 'DISTRICT' && !form.district.trim()) { setFormError('Informe o bairro'); return }
    const data: DeliveryAreaInput = {
      type: form.type,
      name: form.name.trim() || null,
      district: form.type === 'DISTRICT' ? form.district.trim() : null,
      fee,
      minOrder: num(form.minOrder) || 0,
      freeFrom: isNaN(num(form.freeFrom)) ? null : num(form.freeFrom),
      isActive: true,
    }
    if (form.type === 'DISTANCE') {
      data.baseKm = num(form.baseKm) || 0
      data.perKmFee = num(form.perKmFee) || 0
      data.radiusKm = num(form.radiusKm)
      if (!data.radiusKm || data.radiusKm <= 0) { setFormError('Informe até quantos km você entrega'); return }
    }
    try {
      if (editingId) {
        const { isActive: _ignore, ...rest } = data
        await updateArea.mutateAsync({ id: editingId, ...rest })
      } else {
        await createArea.mutateAsync(data)
      }
      setShowForm(false)
      setEditingId(null)
    } catch (err) {
      setFormError(errMsg(err, 'Erro ao salvar a área. Tente novamente.'))
    }
  }

  async function handleBulk(e: React.FormEvent) {
    e.preventDefault()
    setBulkMsg('')
    const districts = bulkText.split(/[\n;,]+/).map((s) => s.trim()).filter(Boolean)
    const fee = num(bulkFee)
    if (districts.length === 0) { setBulkMsg('Escreva os bairros, um por linha'); return }
    if (isNaN(fee)) { setBulkMsg('Informe a taxa desses bairros'); return }
    try {
      const r = await bulk.mutateAsync({ districts, fee, minOrder: num(bulkMin) || 0, freeFrom: isNaN(num(bulkFree)) ? null : num(bulkFree) })
      setBulkMsg(`${r.created} bairro(s) cadastrado(s).${r.skipped.length ? ` Já existiam: ${r.skipped.join(', ')}.` : ''}`)
      if (r.created) setBulkText('')
    } catch (err) {
      setBulkMsg(errMsg(err, 'Não foi possível cadastrar os bairros.'))
    }
  }

  function usarGps() {
    setLocMsg('')
    if (!navigator.geolocation) { setLocMsg('Este aparelho não permite localização.'); return }
    setLocMsg('Pegando a localização...')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await saveLoc.mutateAsync({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setLocMsg('Localização da loja salva.')
        } catch (err) { setLocMsg(errMsg(err, 'Não foi possível salvar.')) }
      },
      () => setLocMsg('Não foi possível pegar a localização. Permita o acesso no navegador.'),
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  async function usarEndereco() {
    setLocMsg('Procurando o endereço da loja no mapa...')
    try {
      await saveLoc.mutateAsync({ fromAddress: true })
      setLocMsg('Localização encontrada pelo endereço. Confira no mapa se está certa.')
    } catch (err) { setLocMsg(errMsg(err, 'Não foi possível achar o endereço.')) }
  }

  async function simular(e: React.FormEvent) {
    e.preventDefault()
    setSimResult(null)
    try {
      setSimResult(await quote.mutateAsync({
        district: sim.district || undefined, street: sim.street || undefined, number: sim.number || undefined,
        subtotal: num(sim.subtotal) || 0,
      }))
    } catch (err) {
      setSimResult({ available: false, message: errMsg(err, 'Não foi possível simular.') } as DeliveryQuote)
    }
  }

  const isPending = createArea.isPending || updateArea.isPending
  const exemplo = form.type === 'DISTANCE' && !isNaN(num(form.fee)) && !isNaN(num(form.perKmFee))
    ? [2, 5, 8].filter((k) => !num(form.radiusKm) || k <= num(form.radiusKm))
        .map((k) => `${k} km = ${currency(feeAt(k, num(form.fee), num(form.baseKm) || 0, num(form.perKmFee)))}`)
    : []

  const filtros: { key: Filtro; label: string; n: number }[] = [
    { key: 'all', label: 'Todas', n: areas.length },
    { key: 'DISTRICT', label: 'Bairros', n: distritos.length },
    { key: 'RADIUS', label: 'Taxa fixa', n: fixa ? 1 : 0 },
    { key: 'DISTANCE', label: 'Por distância', n: distancia.length },
    { key: 'inactive', label: 'Desativadas', n: areas.filter((a) => !a.isActive).length },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Áreas de Entrega</h1>
            <p className="text-sm text-muted-foreground mt-1">Defina onde você entrega e quanto cobra de taxa.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button onClick={() => { setShowBulk((v) => !v); setShowForm(false); setBulkMsg('') }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium hover:bg-muted transition">
              <ListPlus className="h-4 w-4" /> Vários bairros
            </button>
            <button onClick={() => openCreate()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition">
              <Plus className="h-4 w-4" /> Nova área
            </button>
          </div>
        </div>

        {/* Como a taxa é calculada */}
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { n: 1, icon: Home, titulo: 'Bairro cadastrado', texto: distritos.length ? `${distritos.length} bairro(s) com taxa própria` : 'Nenhum bairro cadastrado', on: distritos.length > 0, acao: () => openCreate('DISTRICT') },
            { n: 2, icon: Ruler, titulo: 'Por distância', texto: distancia.length ? distancia.map(areaPreco).join(' · ') : 'Não usa', on: distancia.length > 0, acao: () => openCreate('DISTANCE') },
            { n: 3, icon: CircleDollarSign, titulo: 'Taxa fixa', texto: fixa ? `${areaPreco(fixa)} para qualquer outro endereço` : 'Não usa', on: !!fixa, acao: () => (fixa ? openEdit(fixa) : openCreate('RADIUS')) },
          ].map(({ n, icon: Icon, titulo, texto, on, acao }) => (
            <button key={n} onClick={acao}
              className={cn('flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40', !on && 'opacity-70')}>
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', on ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{n}º · {titulo}</span>
                <span className="block text-sm font-medium">{texto}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          A taxa segue essa ordem: se o bairro do cliente estiver cadastrado, vale a taxa dele; senão, a distância; senão, a taxa fixa.
          Sem nenhuma área, a entrega sai sem taxa.
        </p>

        {/* Localização da loja */}
        <section className={cn('rounded-2xl border p-4 space-y-3', distancia.length && !temLocal ? 'border-amber-300 bg-amber-50' : 'bg-card')}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <MapPin className={cn('mt-0.5 h-5 w-5 shrink-0', temLocal ? 'text-green-600' : 'text-amber-600')} />
              <div>
                <p className="font-semibold">Localização da loja {temLocal ? 'marcada' : 'não marcada'}</p>
                <p className="text-xs text-muted-foreground">
                  {temLocal
                    ? 'É daqui que a distância até o cliente é medida (em linha reta).'
                    : 'Necessária para cobrar por distância. Marque estando na loja ou pelo endereço cadastrado.'}
                </p>
                {locMsg && <p className="mt-1 text-xs font-medium">{locMsg}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={usarGps} disabled={saveLoc.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-medium hover:bg-muted disabled:opacity-60">
                <Navigation className="h-4 w-4" /> Usar minha localização
              </button>
              <button onClick={usarEndereco} disabled={saveLoc.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-medium hover:bg-muted disabled:opacity-60">
                <Home className="h-4 w-4" /> Pelo endereço da loja
              </button>
              {temLocal && (
                <a href={`https://www.google.com/maps?q=${loc!.lat},${loc!.lng}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-medium hover:bg-muted">
                  <ExternalLink className="h-4 w-4" /> Ver no mapa
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Vários bairros de uma vez */}
        {showBulk && (
          <form onSubmit={handleBulk} className="rounded-2xl border bg-card p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">Cadastrar vários bairros com a mesma taxa</h2>
                <p className="text-xs text-muted-foreground">Um bairro por linha (ou separados por vírgula). Os que já existem são pulados.</p>
              </div>
              <button type="button" onClick={() => setShowBulk(false)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={5}
              placeholder={'Centro\nVila Nova\nJardim América'}
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs font-medium">Taxa de entrega *
                <MoneyInput value={bulkFee} onValueChange={setBulkFee} className={INPUT} placeholder="R$ 0,00 (grátis)" />
              </label>
              <label className="space-y-1 text-xs font-medium">Pedido mínimo
                <MoneyInput value={bulkMin} onValueChange={setBulkMin} className={INPUT} placeholder="Sem mínimo" />
              </label>
              <label className="space-y-1 text-xs font-medium">Grátis a partir de
                <MoneyInput value={bulkFree} onValueChange={setBulkFree} className={INPUT} placeholder="Não aplicar" />
              </label>
            </div>
            {bulkMsg && <p className="text-sm">{bulkMsg}</p>}
            <button type="submit" disabled={bulk.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              <Check className="h-4 w-4" /> {bulk.isPending ? 'Cadastrando...' : 'Cadastrar bairros'}
            </button>
          </form>
        )}

        {/* Formulário */}
        {showForm && (
          <form id="area-form" onSubmit={handleSubmit} className="rounded-2xl border bg-card p-4 sm:p-5 space-y-4 scroll-mt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{editingId ? 'Editar área' : 'Nova área de entrega'}</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            {!editingId && (
              <div className="grid gap-2 sm:grid-cols-3">
                {TIPOS.map(({ key, titulo, texto, icon: Icon }) => {
                  const bloqueada = key === 'RADIUS' && !!fixa
                  return (
                    <button key={key} type="button" disabled={bloqueada} onClick={() => set('type', key)}
                      className={cn('flex items-start gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                        form.type === key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted')}>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-semibold">{titulo}</span>
                        <span className="block text-xs text-muted-foreground">{bloqueada ? 'Já cadastrada' : texto}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {form.type === 'DISTANCE' && !temLocal && (
              <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Marque a localização da loja (acima) antes de salvar.
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {form.type === 'DISTRICT' && (
                <label className="space-y-1 text-xs font-medium">Bairro *
                  <input value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="Ex: Centro" className={INPUT} />
                </label>
              )}
              {form.type === 'DISTANCE' ? (
                <>
                  <label className="space-y-1 text-xs font-medium">Taxa base *
                    <MoneyInput value={form.fee} onValueChange={(v) => set('fee', v)} className={INPUT} placeholder="R$ 5,00" />
                  </label>
                  <label className="space-y-1 text-xs font-medium">Km incluídos na taxa base
                    <input type="number" min="0" step="0.5" inputMode="decimal" value={form.baseKm} onChange={(e) => set('baseKm', e.target.value)} className={INPUT} placeholder="3" />
                  </label>
                  <label className="space-y-1 text-xs font-medium">Valor por km a mais *
                    <MoneyInput value={form.perKmFee} onValueChange={(v) => set('perKmFee', v)} className={INPUT} placeholder="R$ 1,50" />
                  </label>
                  <label className="space-y-1 text-xs font-medium">Entrega até (km) *
                    <input type="number" min="0.5" step="0.5" inputMode="decimal" value={form.radiusKm} onChange={(e) => set('radiusKm', e.target.value)} className={INPUT} placeholder="10" />
                  </label>
                </>
              ) : (
                <label className="space-y-1 text-xs font-medium">Taxa de entrega *
                  <MoneyInput value={form.fee} onValueChange={(v) => set('fee', v)} className={INPUT} placeholder="R$ 0,00 (grátis)" />
                </label>
              )}
              <label className="space-y-1 text-xs font-medium">Pedido mínimo
                <MoneyInput value={form.minOrder} onValueChange={(v) => set('minOrder', v)} className={INPUT} placeholder="Sem mínimo" />
              </label>
              <label className="space-y-1 text-xs font-medium">Entrega grátis a partir de
                <MoneyInput value={form.freeFrom} onValueChange={(v) => set('freeFrom', v)} className={INPUT} placeholder="Não aplicar" />
              </label>
              <label className="space-y-1 text-xs font-medium">Apelido (opcional)
                <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={60} placeholder="Ex: Zona norte" className={INPUT} />
              </label>
            </div>

            {exemplo.length > 0 && (
              <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Exemplo:</strong> {exemplo.join(' · ')}. Cada km começado acima de {kmFmt(num(form.baseKm) || 0)} km soma {currency(num(form.perKmFee))}.
              </p>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
                <Check className="h-4 w-4" /> {isPending ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar área'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="h-10 rounded-xl border px-4 text-sm font-medium hover:bg-muted transition">
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Lista */}
          <section className="space-y-3 min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar bairro..."
                  className="h-10 w-full rounded-xl border bg-card pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filtros.map(({ key, label, n }) => (
                <button key={key} onClick={() => setFiltro(key)}
                  className={cn('inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition',
                    filtro === key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
                  {label} <span className="opacity-70">{n}</span>
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}</div>
            ) : areas.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center space-y-3">
                <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="font-medium">Nenhuma área configurada</p>
                <p className="text-xs text-muted-foreground">Sem nenhuma área, a entrega sai sem taxa. Comece por uma taxa fixa, pelos bairros ou pela distância.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {TIPOS.map(({ key, titulo }) => (
                    <button key={key} onClick={() => openCreate(key)} className="min-h-9 rounded-lg border px-3 text-sm hover:bg-muted">{titulo}</button>
                  ))}
                </div>
              </div>
            ) : lista.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma área com esse filtro.</p>
            ) : (
              <ul className="space-y-2">
                {lista.map((area) => (
                  <li key={area.id} className={cn('flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3', !area.isActive && 'opacity-60')}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{areaTitulo(area)}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {area.type === 'DISTRICT' ? 'Bairro' : area.type === 'RADIUS' ? 'Taxa fixa' : area.type === 'DISTANCE' ? 'Distância' : area.type}
                        </span>
                        {area.name && <span className="text-xs text-muted-foreground">· {area.name}</span>}
                        {!area.isActive && <span className="text-xs font-medium text-muted-foreground">Desativada</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">{areaPreco(area)}</span>
                        {Number(area.minOrder) > 0 && <span>Pedido mínimo {currency(Number(area.minOrder))}</span>}
                        {area.freeFrom != null && Number(area.freeFrom) > 0 && <span className="text-green-600">Grátis a partir de {currency(Number(area.freeFrom))}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button role="switch" aria-checked={area.isActive} aria-label={area.isActive ? 'Desativar área' : 'Ativar área'}
                        onClick={() => updateArea.mutate({ id: area.id, isActive: !area.isActive })}
                        className={cn('relative mr-1 h-6 w-11 rounded-full transition-colors', area.isActive ? 'bg-primary' : 'bg-muted-foreground/30')}>
                        <span className={cn('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', area.isActive ? 'translate-x-5' : 'translate-x-0')} />
                      </button>
                      <button onClick={() => openEdit(area)} aria-label="Editar" title="Editar"
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                      {area.type === 'DISTRICT' && (
                        <button onClick={() => duplicar(area)} aria-label="Novo bairro com a mesma taxa" title="Novo bairro com a mesma taxa"
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><Copy className="h-4 w-4" /></button>
                      )}
                      <button aria-label="Excluir" title="Excluir"
                        onClick={() => { if (confirm(`Excluir "${areaTitulo(area)}"? Esta ação não pode ser desfeita.`)) deleteArea.mutate(area.id) }}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Simulador */}
          <section className="h-fit rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Simular taxa</h2>
            </div>
            <p className="text-xs text-muted-foreground">Veja quanto o cliente vai pagar num endereço, com as regras salvas.</p>
            <form onSubmit={simular} className="space-y-2">
              <input value={sim.district} onChange={(e) => setSim((s) => ({ ...s, district: e.target.value }))} placeholder="Bairro" className={INPUT} />
              {distancia.length > 0 && (
                <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                  <input value={sim.street} onChange={(e) => setSim((s) => ({ ...s, street: e.target.value }))} placeholder="Rua" className={INPUT} />
                  <input value={sim.number} onChange={(e) => setSim((s) => ({ ...s, number: e.target.value }))} placeholder="Nº" className={INPUT} />
                </div>
              )}
              <label className="block space-y-1 text-xs font-medium">Valor do pedido
                <MoneyInput value={sim.subtotal} onValueChange={(v) => setSim((s) => ({ ...s, subtotal: v }))} className={INPUT} />
              </label>
              <button type="submit" disabled={quote.isPending}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold hover:bg-muted disabled:opacity-60">
                {quote.isPending ? 'Calculando...' : 'Calcular'}
              </button>
            </form>
            {simResult && (
              <div className={cn('rounded-xl p-3 text-sm', simResult.available ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700')}>
                {simResult.available ? (
                  <>
                    <p className="text-lg font-bold">{simResult.fee === 0 ? 'Entrega grátis' : currency(simResult.fee)}</p>
                    <p className="text-xs">
                      {simResult.areaType === 'DISTRICT' ? `Taxa do bairro ${simResult.areaLabel}` : simResult.areaType === 'DISTANCE' ? `Por distância: ${kmFmt(simResult.distanceKm)} km` : simResult.areaType === 'RADIUS' ? 'Taxa fixa' : 'Sem taxa configurada'}
                      {simResult.fee === 0 && simResult.baseFee > 0 && ` (seria ${currency(simResult.baseFee)}; ficou grátis pelo valor do pedido)`}
                    </p>
                    {simResult.belowMinOrder && <p className="mt-1 text-xs font-medium text-amber-700">Abaixo do pedido mínimo de {currency(simResult.minOrder)} — o cliente não consegue fechar.</p>}
                    {simResult.distanceUnknown && simResult.areaType !== 'DISTRICT' && <p className="mt-1 text-xs">Endereço não achado no mapa; foi usada a taxa fixa.</p>}
                  </>
                ) : (
                  <p>{simResult.message ?? 'Não entrega neste endereço.'}</p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
