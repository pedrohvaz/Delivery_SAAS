'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Search, MapPin, X, ChevronDown, Sun, Moon, User, Check, ArrowRight, LocateFixed, Loader2,
  Smartphone, MessageCircle, ChefHat, QrCode, Bike, BarChart3,
} from 'lucide-react'
import { api } from '@/lib/api'
import { BackgroundFoodCarousel } from '@/components/marketplace/BackgroundFoodCarousel'
import { StoreCard, type MarketStore } from '@/components/marketplace/StoreCard'
import { useCustomerAuth } from '@/store/customer-auth'
import { useMounted } from '@/hooks/use-mounted'

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3010'

// Filtros rápidos — todos baseados em dados reais da loja
type QuickFilter = 'all' | 'open' | 'fast' | 'noMin' | 'favorites'
const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'open', label: 'Abertas agora' },
  { id: 'fast', label: 'Até 30 min' },
  { id: 'noMin', label: 'Sem pedido mínimo' },
  { id: 'favorites', label: 'Favoritas' },
]

type SortBy = 'recommended' | 'name' | 'time'
const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: 'recommended', label: 'Recomendadas' },
  { id: 'time', label: 'Mais rápidas' },
  { id: 'name', label: 'Nome (A–Z)' },
]

// Compara nomes de cidade ignorando acentos e maiúsculas ("São Paulo" == "sao paulo")
const normalizeCity = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

// Coordenadas do navegador -> nome da cidade (OpenStreetMap/Nominatim, sem chave)
async function reverseGeocodeCity(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=pt-BR&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json()
  const a = data?.address ?? {}
  return a.city ?? a.town ?? a.municipality ?? a.village ?? null
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }),
  )
}

const MERCHANT_FEATURES = [
  { icon: Smartphone, title: 'Cardápio digital com seu link', text: 'Seus clientes pedem direto pelo celular, sem baixar app.' },
  { icon: MessageCircle, title: 'Pedidos pelo WhatsApp', text: 'Atendente automático que tira dúvidas e fecha o pedido.' },
  { icon: ChefHat, title: 'Painel de pedidos e cozinha', text: 'Acompanhe cada pedido em tempo real, da cozinha à entrega.' },
  { icon: QrCode, title: 'Mesas com QR Code', text: 'Pedido na mesa e chamada do garçom pelo celular.' },
  { icon: Bike, title: 'Entregadores e áreas', text: 'Taxas por bairro e controle dos seus entregadores.' },
  { icon: BarChart3, title: 'Cupons, fidelidade e relatórios', text: 'Traga o cliente de volta e acompanhe suas vendas.' },
]

export default function HomePage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [searchTerm, setSearchTerm] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('recommended')
  const [selectedCity, setSelectedCity] = useState('all')
  const [isCitySelectOpen, setIsCitySelectOpen] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLocating, setIsLocating] = useState(false)
  const [locationMsg, setLocationMsg] = useState<string | null>(null)
  const cityRef = useRef<HTMLDivElement>(null)

  // Conta global do cliente (gate de mounted evita mismatch de hidratação)
  const account = useCustomerAuth((s) => s.account)
  const isAuthenticated = useCustomerAuth((s) => s.isAuthenticated)
  const mounted = useMounted()

  // Tema persistido (escopado a esta página via classe `dark` no root)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mkt_theme')
      if (saved === 'light' || saved === 'dark') setTheme(saved)
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark')
    } catch { /* ignora */ }
  }, [])
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    try { localStorage.setItem('mkt_theme', next) } catch { /* ignora */ }
  }

  // Favoritos persistidos
  useEffect(() => {
    try { const s = localStorage.getItem('saved_stores'); if (s) setFavorites(JSON.parse(s)) } catch { /* ignora */ }
  }, [])
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try { localStorage.setItem('saved_stores', JSON.stringify(next)) } catch { /* ignora */ }
      return next
    })
  }

  // Fecha o seletor de cidade ao clicar fora
  useEffect(() => {
    if (!isCitySelectOpen) return
    const onClick = (e: MouseEvent) => { if (!cityRef.current?.contains(e.target as Node)) setIsCitySelectOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [isCitySelectOpen])

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['public-stores'],
    queryFn: () => api.get<{ data: MarketStore[] }>('/store').then((r) => r.data.data),
  })

  // Cidades reais das lojas, com a quantidade de lojas em cada uma
  const cityCounts = useMemo(() => {
    const map = new Map<string, number>()
    stores.forEach((s) => { if (s.city) map.set(s.city, (map.get(s.city) ?? 0) + 1) })
    return map
  }, [stores])
  const cities = useMemo(() => Array.from(cityCounts.keys()).sort((a, b) => a.localeCompare(b)), [cityCounts])

  // Cidade escolhida persistida (só vale se ainda existir loja nela)
  const chooseCity = (city: string) => {
    setSelectedCity(city)
    try { localStorage.setItem('mkt_city', city) } catch { /* ignora */ }
  }
  useEffect(() => {
    if (!stores.length) return
    try {
      const saved = localStorage.getItem('mkt_city')
      if (saved && cityCounts.has(saved)) setSelectedCity(saved)
    } catch { /* ignora */ }
  }, [stores.length, cityCounts])

  const locateMe = async () => {
    setLocationMsg(null)
    if (!('geolocation' in navigator)) { setLocationMsg('Seu navegador não permite localização. Escolha a cidade na lista.'); return }
    setIsLocating(true)
    try {
      const pos = await getPosition()
      const city = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude)
      if (!city) { setLocationMsg('Não conseguimos identificar sua cidade. Escolha na lista.'); return }
      const match = cities.find((c) => normalizeCity(c) === normalizeCity(city))
      if (match) {
        chooseCity(match)
        setIsCitySelectOpen(false)
      } else {
        setLocationMsg(`Ainda não temos lojas em ${city}. Veja as lojas de outras cidades.`)
        chooseCity('all')
      }
    } catch (err) {
      const denied = (err as GeolocationPositionError)?.code === 1
      setLocationMsg(denied
        ? 'Permissão de localização negada. Escolha a cidade na lista.'
        : 'Não foi possível obter sua localização. Escolha a cidade na lista.')
    } finally {
      setIsLocating(false)
    }
  }

  const filtered = useMemo(() => {
    let result = [...stores]
    const q = searchTerm.trim().toLowerCase()
    if (q) {
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q) ||
        (s.city ?? '').toLowerCase().includes(q),
      )
    }
    if (selectedCity !== 'all') result = result.filter((s) => s.city === selectedCity)
    if (quickFilter === 'open') result = result.filter((s) => s.isOpen)
    if (quickFilter === 'fast') result = result.filter((s) => s.estimatedTime <= 30)
    if (quickFilter === 'noMin') result = result.filter((s) => Number(s.minOrderValue) <= 0)
    if (quickFilter === 'favorites') result = result.filter((s) => favorites.includes(s.id))

    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === 'time') result.sort((a, b) => a.estimatedTime - b.estimatedTime)
    else result.sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || b.ratingAvg - a.ratingAvg)

    return result
  }, [stores, searchTerm, selectedCity, quickFilter, sortBy, favorites])

  const openCount = stores.filter((s) => s.isOpen).length
  const hasFilters = !!searchTerm || selectedCity !== 'all' || quickFilter !== 'all'
  const clearFilters = () => { setSearchTerm(''); chooseCity('all'); setQuickFilter('all') }

  return (
    <div className={`mkt-scope ${theme === 'dark' ? 'dark' : ''}`}>
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">

      {/* Cabeçalho */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Bylink — início">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg font-black text-white shadow-sm shadow-orange-500/30">b</span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">bylink</span>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            <a href="#lojistas" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white sm:block">
              Para lojistas
            </a>
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
              aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <Link
              href="/conta"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {mounted && isAuthenticated && account ? (
                <>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">{account.name?.[0]?.toUpperCase() ?? '?'}</span>
                  <span className="max-w-[90px] truncate">{account.name?.split(' ')[0]}</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  <span>Entrar</span>
                </>
              )}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-30 bg-slate-950 px-4 py-14 text-white sm:py-20">
        <BackgroundFoodCarousel />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl space-y-4">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Peça das melhores lojas <span className="text-orange-400">da sua cidade</span>
            </h1>
            <p className="max-w-lg text-base text-slate-300 sm:text-lg">
              Cardápio online, pedido direto com a loja e acompanhamento em tempo real.
            </p>
          </div>

          {/* Busca + cidade */}
          <div className="mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/30 sm:flex-row dark:bg-slate-900">
            <label className="relative flex flex-1 items-center">
              <span className="sr-only">Buscar loja</span>
              <Search className="pointer-events-none absolute left-3.5 h-5 w-5 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar loja ou especialidade"
                className="w-full rounded-xl bg-transparent py-3 pl-11 pr-10 text-base text-slate-900 placeholder-slate-400 outline-none dark:text-slate-100"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" aria-label="Limpar busca">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <div ref={cityRef} className="relative sm:border-l sm:border-slate-200 sm:pl-2 dark:sm:border-slate-800">
              <button
                onClick={() => setIsCitySelectOpen((v) => !v)}
                aria-expanded={isCitySelectOpen}
                aria-haspopup="listbox"
                className="flex h-full w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-52 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <MapPin className="h-4 w-4 shrink-0 text-orange-500" />
                <span className="flex-1 truncate">{selectedCity === 'all' ? 'Todas as cidades' : selectedCity}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isCitySelectOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCitySelectOpen && (
                <div className="absolute right-0 z-50 mt-2 w-full min-w-[15rem] rounded-xl border border-slate-200 bg-white p-1 text-sm text-slate-700 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <button
                    onClick={locateMe}
                    disabled={isLocating}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-semibold text-orange-600 hover:bg-orange-50 disabled:opacity-70 dark:text-orange-400 dark:hover:bg-orange-500/10"
                  >
                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                    {isLocating ? 'Localizando…' : 'Usar minha localização'}
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <ul role="listbox" aria-label="Cidades" className="max-h-64 overflow-y-auto">
                    {['all', ...cities].map((city) => (
                      <li key={city} role="option" aria-selected={selectedCity === city}>
                        <button
                          onClick={() => { chooseCity(city); setLocationMsg(null); setIsCitySelectOpen(false) }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <span className="truncate">{city === 'all' ? 'Todas as cidades' : city}</span>
                          <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                            {city === 'all' ? stores.length : cityCounts.get(city)}
                            {selectedCity === city && <Check className="h-4 w-4 text-orange-500" />}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {cities.length === 0 && !isLoading && (
                    <p className="px-3 pb-2 pt-1 text-xs text-slate-400">As lojas ainda não informaram a cidade.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {locationMsg && (
            <p role="status" className="mt-3 inline-flex max-w-2xl items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-slate-200">
              <MapPin className="h-4 w-4 shrink-0 text-orange-400" /> {locationMsg}
            </p>
          )}

          {stores.length > 0 && (
            <p className="mt-4 text-sm text-slate-400">
              {stores.length} {stores.length === 1 ? 'loja' : 'lojas'} na Bylink
              {openCount > 0 && <> · <span className="font-semibold text-emerald-400">{openCount} {openCount === 1 ? 'aberta' : 'abertas'} agora</span></>}
            </p>
          )}
        </div>
      </section>

      {/* Lojas */}
      <main className="mx-auto max-w-6xl px-4 py-10">
        {/* Cabeçalho da lista e filtros só aparecem quando há lojas */}
        {(isLoading || stores.length > 0) && (<>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Lojas e restaurantes</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isLoading ? 'Carregando…' : `${filtered.length} de ${stores.length} ${stores.length === 1 ? 'loja' : 'lojas'}`}
              {selectedCity !== 'all' && <> em <strong className="text-slate-700 dark:text-slate-200">{selectedCity}</strong></>}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            Ordenar por
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
          {QUICK_FILTERS.map((f) => {
            const active = quickFilter === f.id
            const count = f.id === 'favorites' ? favorites.length : null
            return (
              <button
                key={f.id}
                onClick={() => setQuickFilter(f.id)}
                aria-pressed={active}
                className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-orange-500 dark:bg-orange-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {f.label}{count ? ` (${count})` : ''}
              </button>
            )
          })}
        </div>
        </>)}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />)}
          </div>
        ) : stores.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-500/10"><ChefHat className="h-6 w-6" /></div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Novas lojas chegando em breve</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Estamos preparando os cardápios das primeiras lojas da Bylink. Volte em breve para fazer seu pedido.
            </p>
            <a
              href="#lojistas"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 dark:bg-slate-800"
            >
              Tenho uma loja e quero participar <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800"><Search className="h-6 w-6" /></div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              {quickFilter === 'favorites' && favorites.length === 0 ? 'Você ainda não tem favoritas' : 'Nenhuma loja encontrada'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {quickFilter === 'favorites' && favorites.length === 0
                ? 'Toque no coração de uma loja para guardá-la aqui.'
                : 'Tente outro termo ou limpe os filtros.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 dark:bg-slate-800">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((store) => (
              <StoreCard key={store.id} store={store} isFavorite={favorites.includes(store.id)} onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        )}
      </main>

      {/* Para lojistas */}
      <section id="lojistas" className="scroll-mt-20 px-4 pb-16">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-900 px-6 py-12 text-white sm:px-12 sm:py-16 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div className="space-y-5">
              <span className="inline-block rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-300">Para lojistas</span>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Tem um restaurante, lanchonete ou açaiteria?
              </h2>
              <p className="text-base text-slate-300">
                Venda pelo seu próprio link com a Bylink: cardápio digital, pedidos pelo WhatsApp e gestão completa da sua loja em um só lugar.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <a
                  href={`${ADMIN_URL}/register`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600"
                >
                  Cadastrar minha loja <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={`${ADMIN_URL}/login`}
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Já sou lojista
                </a>
              </div>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {MERCHANT_FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Icon className="h-5 w-5 text-orange-400" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500 text-xs font-black text-white">b</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">bylink</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/conta" className="hover:text-slate-900 dark:hover:text-white">Minha conta</Link>
            <a href="#lojistas" className="hover:text-slate-900 dark:hover:text-white">Para lojistas</a>
            <a href={`${ADMIN_URL}/login`} className="hover:text-slate-900 dark:hover:text-white">Painel do lojista</a>
          </nav>
        </div>
      </footer>
    </div>
    </div>
  )
}
