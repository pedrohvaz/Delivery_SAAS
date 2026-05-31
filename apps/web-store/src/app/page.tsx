'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import {
  Search, MapPin, SlidersHorizontal, Sparkles, TrendingUp, Compass,
  X, ChevronDown, Navigation, Bike, CheckCircle, Info, Heart,
  ChevronLeft, ChevronRight, Sun, Moon, User,
} from 'lucide-react'
import { api } from '@/lib/api'
import { BackgroundFoodCarousel } from '@/components/marketplace/BackgroundFoodCarousel'
import { StoreCard, type MarketStore } from '@/components/marketplace/StoreCard'
import { useCustomerAuth } from '@/store/customer-auth'

const PROMO_BANNERS = [
  { id: 1, title: 'Festival Japa & Fusion', subtitle: 'Sushis frescos de salmão maçaricado, temakis e combinados incríveis com ingredientes premium.', badge: 'COMIDA JAPONESA', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80', color: 'from-rose-600/90 via-neutral-900/40 to-transparent', tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30', actionQuery: 'Sushi', buttonText: 'Pedir Combinados' },
  { id: 2, title: 'Smash Burgers Suculentos', subtitle: 'Hambúrgueres artesanais grelhados no fogo, muito cheddar derretido, bacon crocante e maionese secreta.', badge: 'LANCHONETES & BURGERS', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80', color: 'from-amber-600/90 via-neutral-900/40 to-transparent', tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', actionQuery: 'Burguer', buttonText: 'Explorar Burgers' },
  { id: 3, title: 'Drinks & Bebidas Geladas', subtitle: 'Sucos naturais refrescantes, refrigerantes trincando de gelados e cervejas especiais super rápido.', badge: 'BEBIDAS & REFRESH', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80', color: 'from-blue-600/90 via-neutral-900/40 to-transparent', tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30', actionQuery: 'Bebida', buttonText: 'Gelar Meu Dia' },
  { id: 4, title: 'Restaurantes & Massas Finas', subtitle: 'Pratos executivos nobres, massas ao molho de tomates San Marzano e azeites aromáticos.', badge: 'RESTAURANTES GOURMET', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80', color: 'from-emerald-700/90 via-neutral-900/40 to-transparent', tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', actionQuery: 'Pizza', buttonText: 'Escolher Prato' },
  { id: 5, title: 'Açaí Cremoso Original', subtitle: 'Monte sua tigela com frutas tropicais frescas, granola crocante e calda extra de leite condensado.', badge: 'AÇAI TIME & DOCES', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=1200&q=80', color: 'from-purple-700/90 via-neutral-900/40 to-transparent', tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30', actionQuery: 'Açaí', buttonText: 'Montar Tigela' },
]

const CATEGORIES = [
  { id: 'todos', name: 'Todos', emoji: '🍽️', q: '' },
  { id: 'lanches', name: 'Lanches', emoji: '🍔', q: 'Burguer' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', q: 'Pizza' },
  { id: 'japonesa', name: 'Japonesa', emoji: '🍣', q: 'Sushi' },
  { id: 'brasileira', name: 'Brasileira', emoji: '🍛', q: 'Brasileira' },
  { id: 'acai', name: 'Açaí', emoji: '🥣', q: 'Açaí' },
  { id: 'doces', name: 'Doces', emoji: '🍰', q: 'Doce' },
  { id: 'bebidas', name: 'Bebidas', emoji: '🥤', q: 'Bebida' },
  { id: 'saudavel', name: 'Saudável', emoji: '🥗', q: 'Saudável' },
]

const SUGGESTIONS = ['Pizza', 'Burguer', 'Sushi', 'Açaí']

export default function HomePage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todos')
  const [selectedCity, setSelectedCity] = useState('all')
  const [isCitySelectOpen, setIsCitySelectOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'recommended' | 'name' | 'time'>('recommended')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filterOnlyOpen, setFilterOnlyOpen] = useState(false)
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isBannerHovered, setIsBannerHovered] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])

  // Conta global do cliente
  const account = useCustomerAuth((s) => s.account)
  const isAuthenticated = useCustomerAuth((s) => s.isAuthenticated)

  // Tema persistido (escopado a esta página via classe `dark` no root)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mkt_theme')
      if (saved === 'light' || saved === 'dark') setTheme(saved)
      else if (window.matchMedia('(prefers-color-scheme: light)').matches) setTheme('light')
    } catch { /* ignora */ }
  }, [])
  useEffect(() => { try { localStorage.setItem('mkt_theme', theme) } catch { /* ignora */ } }, [theme])

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

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['public-stores'],
    queryFn: () => api.get<{ data: MarketStore[] }>('/store').then((r) => r.data.data),
  })

  // Banner rotativo
  useEffect(() => {
    if (isBannerHovered) return
    const t = setInterval(() => setCurrentBanner((p) => (p + 1) % PROMO_BANNERS.length), 4500)
    return () => clearInterval(t)
  }, [isBannerHovered])

  // Cidades reais
  const cities = useMemo(() => {
    const set = new Set<string>()
    stores.forEach((s) => { if (s.city) set.add(s.city) })
    return ['all', ...Array.from(set).sort()]
  }, [stores])

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
    if (filterOnlyOpen) result = result.filter((s) => s.isOpen)

    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === 'time') result.sort((a, b) => a.estimatedTime - b.estimatedTime)
    else result.sort((a, b) => Number(b.isOpen) - Number(a.isOpen)) // recomendados: abertos primeiro

    return result
  }, [stores, searchTerm, selectedCity, filterOnlyOpen, sortBy])

  const activeFiltersCount = (filterOnlyOpen ? 1 : 0) + (sortBy !== 'recommended' ? 1 : 0) + (selectedCity !== 'all' ? 1 : 0)

  const pickCategory = (cat: typeof CATEGORIES[number]) => {
    setSelectedCategory(cat.id)
    setSearchTerm(cat.q)
  }

  return (
    <div className={`mkt-scope ${theme === 'dark' ? 'dark' : ''}`}>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-16 text-slate-800 dark:text-slate-100 transition-colors duration-300">

      {/* Barra superior */}
      <div className="bg-slate-950 text-white/90 text-[11.5px] sm:text-xs py-2.5 px-6 border-b border-slate-900 flex items-center justify-between z-40 relative">
        <div className="flex items-center gap-2 max-w-lg truncate">
          <span className="bg-orange-600 rounded-md text-[9px] px-2 py-0.5 font-bold uppercase tracking-wide text-white">PRO</span>
          <span className="truncate opacity-90 font-mono">Sua loja favorita, a um clique. Peça em qualquer estabelecimento da plataforma.</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-white/60 font-mono">
          <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-400" /> Cardápios Integrados</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative text-white overflow-hidden pb-16 pt-12 px-4 shadow-xl sm:px-8 border-b border-slate-900 min-h-[440px] flex items-center bg-slate-950">
        <BackgroundFoodCarousel />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-transparent z-2 pointer-events-none" />
        <div className="absolute inset-0 bg-black/40 z-1 pointer-events-none" />
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl -translate-y-12 translate-x-12 pointer-events-none z-3" />

        <div className="max-w-6xl w-full mx-auto relative z-10 space-y-8 my-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 -rotate-3 hover:rotate-0 transition-transform duration-300 shrink-0">
                <Bike className="h-6 w-6 text-white animate-float" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  Delivery Online <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-white/10 rounded-md font-bold text-orange-400">ÁGIL</span>
                </h1>
                <p className="text-[11px] text-slate-400 font-medium sm:block hidden">Sabor e agilidade em um único clique</p>
              </div>
            </div>

            {/* Conta + Tema + Cidade */}
            <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs flex-wrap">
              {/* Minha conta / Entrar */}
              <Link
                href="/conta"
                className="flex items-center gap-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 px-3 py-3 text-white border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
                title="Minha conta"
              >
                {isAuthenticated && account ? (
                  <>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-white shrink-0">{account.name?.[0]?.toUpperCase() ?? '?'}</span>
                    <span className="font-bold line-clamp-1 max-w-[80px] text-slate-200 hidden sm:block">{account.name?.split(' ')[0]}</span>
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 text-orange-500 shrink-0" />
                    <span className="font-bold text-slate-200">Entrar</span>
                  </>
                )}
              </Link>

              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="flex items-center justify-center h-11 w-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 text-white border border-slate-800 transition-all shadow-sm active:scale-95"
                title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
              >
                {theme === 'light' ? <Moon className="h-4.5 w-4.5 text-sky-400" /> : <Sun className="h-4.5 w-4.5 text-amber-400" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsCitySelectOpen(!isCitySelectOpen)}
                  className="flex items-center gap-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 px-4 py-3 text-white border border-slate-800 transition-all shadow-sm text-left"
                >
                  <MapPin className="h-4 w-4 text-orange-500 shrink-0" />
                  <div className="leading-tight shrink pr-2">
                    <div className="text-[9px] uppercase tracking-wide text-slate-400 font-bold">Cidade:</div>
                    <div className="font-bold line-clamp-1 max-w-[120px] text-slate-200">{selectedCity === 'all' ? 'Todas' : selectedCity}</div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
                </button>
                <AnimatePresence>
                  {isCitySelectOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2.5 z-50 w-56 max-h-72 overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-100 shadow-2xl border border-slate-100 dark:border-slate-800 font-sans"
                    >
                      <div className="flex items-center justify-between pb-2 px-2.5 mb-1.5 mt-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-450 tracking-wider font-mono">Cidades</span>
                        <button onClick={() => setIsCitySelectOpen(false)} className="text-slate-400 hover:text-slate-600 text-[11px]">✕</button>
                      </div>
                      <div className="space-y-0.5">
                        {cities.map((city) => (
                          <button
                            key={city}
                            onClick={() => { setSelectedCity(city); setIsCitySelectOpen(false) }}
                            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-left transition-colors ${selectedCity === city ? 'bg-orange-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            <span className="text-sm">{city === 'all' ? '📍' : '🏙️'}</span>
                            <span className="truncate">{city === 'all' ? 'Todas as Cidades' : city}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="text-center sm:text-left max-w-xl pb-1 space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-none text-white">
              Encontre o melhor cardápio e faça seu pedido
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg">
              Pesquise por loja, cidade ou especialidade. Tudo o que a sua região tem de melhor em um só lugar.
            </p>
          </div>

          {/* Busca */}
          <div className="relative max-w-2xl mx-auto sm:mx-0">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-400" />
              <input
                id="mkt-search"
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedCategory('todos') }}
                placeholder="Buscar loja por nome, cidade ou especialidade..."
                className="w-full text-sm sm:text-base rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 pl-12 pr-12 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-xl shadow-slate-950/20 outline-none focus:ring-4 focus:ring-orange-500/30 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full p-1 transition-colors" title="Limpar">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-3 text-[10px] sm:text-[11px] font-mono font-medium text-slate-400">
              <span className="opacity-75 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Sugeridos:</span>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => { setSearchTerm(s); setSelectedCategory('todos') }} className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 transition-all">{s}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Banners promocionais */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div
          className="relative h-48 sm:h-60 md:h-64 w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-md border border-slate-200/60 dark:border-slate-900 group"
          onMouseEnter={() => setIsBannerHovered(true)}
          onMouseLeave={() => setIsBannerHovered(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner}
              initial={{ opacity: 0, scale: 1.01 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="absolute inset-0 w-full h-full cursor-pointer select-none"
              onClick={() => { setSearchTerm(PROMO_BANNERS[currentBanner].actionQuery); setSelectedCategory('todos'); document.getElementById('mkt-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}
            >
              <img src={PROMO_BANNERS[currentBanner].image} alt={PROMO_BANNERS[currentBanner].title} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-10000 ease-linear group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent z-5" />
              <div className={`absolute inset-0 bg-gradient-to-tr ${PROMO_BANNERS[currentBanner].color} mix-blend-multiply opacity-80 z-6`} />
              <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 z-10 max-w-2xl text-white">
                <div className="space-y-1.5 sm:space-y-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`rounded-md px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase font-mono tracking-widest border ${PROMO_BANNERS[currentBanner].tagColor}`}>{PROMO_BANNERS[currentBanner].badge}</span>
                    <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-orange-400 font-mono tracking-wide bg-orange-500/15 border border-orange-500/20 px-2 py-0.5 rounded-md"><Sparkles className="h-2.5 w-2.5" /> DESTAQUE</span>
                  </div>
                  <h3 className="text-base sm:text-2xl md:text-3xl font-black tracking-tight leading-tight uppercase">{PROMO_BANNERS[currentBanner].title}</h3>
                  <p className="text-slate-300 text-[10px] sm:text-xs md:text-sm font-medium leading-relaxed max-w-lg line-clamp-2">{PROMO_BANNERS[currentBanner].subtitle}</p>
                  <div className="pt-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-[9px] sm:text-xs px-3.5 py-1.5 sm:px-4 sm:py-2.5 tracking-wider uppercase font-mono shadow-md transition-all">{PROMO_BANNERS[currentBanner].buttonText} <span>➜</span></span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <button onClick={(e) => { e.stopPropagation(); setCurrentBanner((p) => (p - 1 + PROMO_BANNERS.length) % PROMO_BANNERS.length) }} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-950/85 hover:bg-orange-600 text-white border border-slate-800 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 hidden sm:flex"><ChevronLeft className="h-4.5 w-4.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); setCurrentBanner((p) => (p + 1) % PROMO_BANNERS.length) }} className="absolute right-3.5 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-950/85 hover:bg-orange-600 text-white border border-slate-800 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 hidden sm:flex"><ChevronRight className="h-4.5 w-4.5" /></button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-slate-950/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
            {PROMO_BANNERS.map((_, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentBanner(idx) }} className={`h-1.5 sm:h-2 rounded-full transition-all ${currentBanner === idx ? 'w-5 sm:w-6 bg-orange-500' : 'w-1.5 sm:w-2 bg-white/45 hover:bg-white/85'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Categorias */}
      <div className="max-w-6xl mx-auto px-4 mt-6 pb-2">
        <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold mb-3.5 flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5 text-orange-500" /> Categorias</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => pickCategory(cat)} className={`rounded-2xl px-5 py-3 flex items-center gap-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${selectedCategory === cat.id ? 'bg-slate-900 dark:bg-orange-600 border-slate-900 dark:border-orange-600 text-white shadow-md scale-[1.02]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 shadow-3xs'}`}>
              <span>{cat.emoji}</span><span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-850 gap-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Compass className="h-5 w-5 text-orange-500 animate-spin-slow" /> Lojas e Restaurantes</h3>
            <p className="text-xs text-slate-400 font-mono">Mostrando <strong className="text-slate-800 dark:text-slate-200">{filtered.length}</strong> de {stores.length} lojas{selectedCity !== 'all' ? <> em <span className="text-orange-600 font-bold">{selectedCity}</span></> : null}</p>
          </div>
          <div className="flex items-center gap-3.5 self-end sm:self-auto">
            {activeFiltersCount > 0 && (
              <button onClick={() => { setFilterOnlyOpen(false); setSortBy('recommended'); setSelectedCity('all'); setSelectedCategory('todos'); setSearchTerm('') }} className="text-xs font-mono font-bold text-orange-600 hover:underline">Limpar filtros</button>
            )}
            <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className={`inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all shadow-3xs ${isFiltersOpen ? 'bg-slate-900 border-slate-900 dark:bg-orange-600 dark:border-orange-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'}`}>
              <SlidersHorizontal className="h-4 w-4" /><span>Filtrar e Ordenar</span>
              {activeFiltersCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">{activeFiltersCount}</span>}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isFiltersOpen && (
            <motion.div initial={{ opacity: 0, height: 0, y: -12 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -12 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="overflow-hidden mb-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="space-y-3 font-mono text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Conveniências</span>
                  <label className="flex items-center gap-2.5 cursor-pointer group p-1 select-none">
                    <input type="checkbox" checked={filterOnlyOpen} onChange={() => setFilterOnlyOpen(!filterOnlyOpen)} className="h-4 w-4 rounded-sm accent-orange-600 cursor-pointer" />
                    <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Abertos Agora</span>
                  </label>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Ordenar</span>
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    {[{ id: 'recommended', label: 'Recomendados (abertos primeiro)' }, { id: 'name', label: 'Nome (A–Z)' }, { id: 'time', label: 'Menor tempo de preparo' }].map((o) => (
                      <button key={o.id} onClick={() => setSortBy(o.id as typeof sortBy)} className={`text-left rounded-lg px-2.5 py-1.5 transition-all ${sortBy === o.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border-l-3 border-orange-500' : 'hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400'}`}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5 self-stretch flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] font-mono mb-1"><Info className="h-3.5 w-3.5 text-orange-500" /> Dica</div>
                    <p>Use a cidade no topo e a busca para achar rapidinho a loja que você quer.</p>
                  </div>
                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between mt-2">
                    <span className="text-[10px] font-mono font-medium text-emerald-600 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Ativo</span>
                    <button onClick={() => setIsFiltersOpen(false)} className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 px-3.5 py-1.5 rounded-xl shadow-3xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Ver Resultados</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-72 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-3xs max-w-lg mx-auto">
            <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400"><Search className="h-7 w-7" /></div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">Nenhuma loja encontrada</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Tente limpar os filtros ou buscar por outro termo, cidade ou loja.</p>
            <button onClick={() => { setSearchTerm(''); setSelectedCategory('todos'); setFilterOnlyOpen(false); setSelectedCity('all') }} className="mt-5 rounded-xl bg-slate-900 hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 transition-all">Resetar Filtros</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((store) => (
              <StoreCard key={store.id} store={store} isFavorite={favorites.includes(store.id)} onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 mt-20 text-center text-xs text-slate-400 font-mono space-y-1">
        <div className="flex items-center justify-center gap-2.5">
          <span className="font-bold text-slate-500 uppercase tracking-wider">Delivery Online</span>
          <span>•</span>
          <span className="flex items-center gap-0.5">Feito com <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> para o seu negócio</span>
        </div>
        <p className="text-[10px] opacity-75">Vitrine de Lojas & Restaurantes • © 2026</p>
      </footer>
    </div>
    </div>
  )
}
