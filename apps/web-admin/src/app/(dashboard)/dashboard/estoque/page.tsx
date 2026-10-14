'use client'

import { useMemo, useState } from 'react'
import { Package, AlertTriangle, Check, Minus, Plus, Search, X, PackageX, PackageCheck, Pencil, Power } from 'lucide-react'
import { useStockProducts, useUpdateStock, type StockProduct } from '@/hooks/use-stock'
import { cn } from '@delivery/ui'
import { currency } from '@/lib/utils'

type Filtro = 'todos' | 'ok' | 'baixo' | 'esgotado' | 'sem'

function situacao(p: StockProduct): Filtro {
  if (!p.stockControl) return 'sem'
  const qty = p.stockQty ?? 0
  if (qty <= 0) return 'esgotado'
  if (p.minStock != null && qty <= p.minStock) return 'baixo'
  return 'ok'
}

const SELO: Record<Filtro, { texto: string; cls: string }> = {
  ok: { texto: 'Em dia', cls: 'bg-green-100 text-green-700' },
  baixo: { texto: 'Baixo', cls: 'bg-orange-100 text-orange-700' },
  esgotado: { texto: 'Esgotado', cls: 'bg-red-100 text-red-700' },
  sem: { texto: 'Sem controle', cls: 'bg-muted text-muted-foreground' },
  todos: { texto: '', cls: '' },
}

export default function EstoquePage() {
  const { data: products = [], isLoading } = useStockProducts()
  const updateStock = useUpdateStock()

  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')

  // Produto em edição (quantidade + mínimo) ou sendo ativado (quantidade inicial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editMin, setEditMin] = useState('')
  const [erro, setErro] = useState('')

  const categorias = useMemo(() => {
    const m = new Map<string, string>()
    products.forEach((p) => m.set(p.category.id, p.category.name))
    return [...m].map(([id, name]) => ({ id, name }))
  }, [products])

  const contagem = useMemo(() => {
    const c = { ok: 0, baixo: 0, esgotado: 0, sem: 0 }
    products.forEach((p) => { c[situacao(p) as keyof typeof c]++ })
    return c
  }, [products])
  const controlados = contagem.ok + contagem.baixo + contagem.esgotado
  const precisaRepor = contagem.baixo + contagem.esgotado

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const ordem: Record<Filtro, number> = { esgotado: 0, baixo: 1, ok: 2, sem: 3, todos: 4 }
    return products
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .filter((p) => !categoria || p.category.id === categoria)
      .filter((p) => filtro === 'todos' || situacao(p) === filtro)
      .sort((a, b) => ordem[situacao(a)] - ordem[situacao(b)] || a.name.localeCompare(b.name))
  }, [products, busca, categoria, filtro])

  function abrirEdicao(p: StockProduct) {
    setErro('')
    setEditingId(p.id)
    setEditQty(p.stockControl ? String(p.stockQty ?? 0) : '')
    setEditMin(p.minStock != null ? String(p.minStock) : '')
  }

  async function salvar(p: StockProduct) {
    const qty = parseInt(editQty)
    if (isNaN(qty) || qty < 0) { setErro('Informe a quantidade (0 ou mais)'); return }
    const min = editMin.trim() === '' ? null : parseInt(editMin)
    if (min !== null && (isNaN(min) || min < 0)) { setErro('Mínimo inválido'); return }
    try {
      await updateStock.mutateAsync({ id: p.id, stockQty: qty, minStock: min, ...(p.stockControl ? {} : { stockControl: true }) })
      setEditingId(null)
    } catch {
      setErro('Não foi possível salvar. Tente de novo.')
    }
  }

  const cards: { key: Filtro; label: string; valor: number; icon: typeof Package; cor: string }[] = [
    { key: 'todos', label: 'Com controle', valor: controlados, icon: Package, cor: 'text-primary bg-primary/10' },
    { key: 'ok', label: 'Em dia', valor: contagem.ok, icon: PackageCheck, cor: 'text-green-700 bg-green-100' },
    { key: 'baixo', label: 'Estoque baixo', valor: contagem.baixo, icon: AlertTriangle, cor: 'text-orange-700 bg-orange-100' },
    { key: 'esgotado', label: 'Esgotados', valor: contagem.esgotado, icon: PackageX, cor: 'text-red-700 bg-red-100' },
  ]

  const pills: { key: Filtro; label: string; n: number }[] = [
    { key: 'todos', label: 'Todos', n: products.length },
    { key: 'esgotado', label: 'Esgotados', n: contagem.esgotado },
    { key: 'baixo', label: 'Baixo', n: contagem.baixo },
    { key: 'ok', label: 'Em dia', n: contagem.ok },
    { key: 'sem', label: 'Sem controle', n: contagem.sem },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle quantas unidades você tem de cada produto. Quando acaba, ele sai do cardápio sozinho e volta quando você repõe.
          </p>
        </div>

        {/* Resumo — cada cartão também filtra a lista */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map(({ key, label, valor, icon: Icon, cor }) => (
            <button
              key={label}
              onClick={() => setFiltro(key)}
              className={cn('flex items-center gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40',
                filtro === key && 'border-primary ring-1 ring-primary')}
            >
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', cor)}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-2xl font-bold leading-tight">{isLoading ? '–' : valor}</span>
                <span className="block text-xs text-muted-foreground">{label}</span>
              </span>
            </button>
          ))}
        </div>

        {precisaRepor > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1 min-w-[12rem]">
              <strong>{precisaRepor} produto{precisaRepor !== 1 ? 's precisam' : ' precisa'} de reposição</strong>
              {contagem.esgotado > 0 && ` — ${contagem.esgotado} esgotado${contagem.esgotado !== 1 ? 's' : ''} e fora do cardápio`}
            </span>
            <button onClick={() => setFiltro(contagem.esgotado > 0 ? 'esgotado' : 'baixo')}
              className="min-h-9 rounded-lg bg-white border border-orange-200 px-3 text-xs font-semibold hover:bg-orange-100 transition">
              Ver produtos
            </button>
          </div>
        )}

        {/* Busca e filtros */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto..."
                className="h-10 w-full rounded-xl border bg-card pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="h-10 rounded-xl border bg-card px-3 text-sm sm:w-56 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todas as categorias</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pills.map(({ key, label, n }) => (
              <button key={key} onClick={() => setFiltro(key)}
                className={cn('inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition',
                  filtro === key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
                {label} <span className="opacity-70">{n}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : lista.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            {products.length === 0 ? 'Você ainda não tem produtos no cardápio.' : 'Nenhum produto encontrado com esses filtros.'}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card divide-y">
            <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_7rem_11rem_5rem_11rem] gap-3 bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground rounded-t-2xl">
              <span>Produto</span><span>Categoria</span><span className="text-center">Situação</span>
              <span className="text-center">Quantidade</span><span className="text-center">Mínimo</span><span className="text-right">Ações</span>
            </div>

            {lista.map((p) => {
              const s = situacao(p)
              const editando = editingId === p.id
              return (
                <div key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_7rem_11rem_5rem_11rem] md:items-center">
                  {/* Produto */}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {currency(Number(p.price))}<span className="md:hidden"> · {p.category.name}</span>
                    </p>
                  </div>
                  <span className="hidden md:block truncate text-xs text-muted-foreground">{p.category.name}</span>
                  <span className="justify-self-end md:justify-self-center">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', SELO[s].cls)}>{SELO[s].texto}</span>
                  </span>

                  {editando ? (
                    <div className="col-span-2 md:col-span-3 flex flex-wrap items-end gap-2 md:justify-end">
                      <label className="text-xs text-muted-foreground">
                        {p.stockControl ? 'Quantidade' : 'Quantas unidades você tem?'}
                        <input type="number" min="0" inputMode="numeric" autoFocus value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') salvar(p); if (e.key === 'Escape') setEditingId(null) }}
                          className="mt-1 block h-10 w-24 rounded-lg border px-2 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Avisar abaixo de
                        <input type="number" min="0" inputMode="numeric" placeholder="—" value={editMin}
                          onChange={(e) => setEditMin(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') salvar(p); if (e.key === 'Escape') setEditingId(null) }}
                          className="mt-1 block h-10 w-24 rounded-lg border px-2 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      </label>
                      <button onClick={() => salvar(p)} disabled={updateStock.isPending}
                        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition">
                        <Check className="h-4 w-4" /> Salvar
                      </button>
                      <button onClick={() => setEditingId(null)} aria-label="Cancelar"
                        className="flex h-10 w-10 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted transition">
                        <X className="h-4 w-4" />
                      </button>
                      {erro && <p className="w-full text-xs text-destructive md:text-right">{erro}</p>}
                    </div>
                  ) : p.stockControl ? (
                    <>
                      {/* Quantidade com entrada/saída rápida */}
                      <div className="flex items-center gap-1.5 md:justify-center">
                        <button onClick={() => updateStock.mutate({ id: p.id, delta: -1 })}
                          disabled={(p.stockQty ?? 0) <= 0} aria-label={`Tirar 1 de ${p.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted disabled:opacity-40 transition">
                          <Minus className="h-4 w-4" />
                        </button>
                        <button onClick={() => abrirEdicao(p)} title="Clique para digitar a quantidade"
                          className={cn('min-w-[3rem] rounded-lg px-2 py-1 text-center text-lg font-bold tabular-nums hover:bg-muted transition',
                            s === 'esgotado' ? 'text-red-600' : s === 'baixo' ? 'text-orange-600' : 'text-foreground')}>
                          {p.stockQty ?? 0}
                        </button>
                        <button onClick={() => updateStock.mutate({ id: p.id, delta: 1 })} aria-label={`Somar 1 em ${p.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted transition">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="self-center text-right text-sm text-muted-foreground md:text-center">
                        <span className="md:hidden text-xs">mín. </span>{p.minStock ?? '—'}
                      </span>
                      <div className="col-span-2 flex justify-end gap-1.5 md:col-span-1">
                        <button onClick={() => abrirEdicao(p)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition">
                          <Pencil className="h-3.5 w-3.5" /> Ajustar
                        </button>
                        <button
                          onClick={() => { if (confirm(`Parar de controlar o estoque de "${p.name}"? Ele volta a aparecer no cardápio sem limite.`)) updateStock.mutate({ id: p.id, stockControl: false }) }}
                          title="Parar de controlar o estoque" aria-label={`Desligar controle de ${p.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition">
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="hidden md:block text-center text-sm text-muted-foreground">—</span>
                      <span className="hidden md:block text-center text-sm text-muted-foreground">—</span>
                      <div className="col-span-2 flex justify-end md:col-span-1">
                        <button onClick={() => abrirEdicao(p)}
                          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/30 px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition">
                          <Package className="h-3.5 w-3.5" /> Controlar estoque
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Dica: use <strong>−</strong> e <strong>+</strong> para dar baixa ou entrada rápida, ou clique no número para digitar.
          Os pedidos confirmados descontam do estoque sozinhos, e pedidos cancelados devolvem.
        </p>
      </div>
    </div>
  )
}
