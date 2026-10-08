'use client'

import Link from 'next/link'
import { Clock, Heart, MapPin, Star } from 'lucide-react'
import { currency } from '@/lib/utils'

export interface MarketStore {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  bannerUrl: string | null
  description: string | null
  city: string | null
  state: string | null
  isOpen: boolean
  estimatedTime: number
  minOrderValue: number
  ratingAvg: number
  ratingCount: number
}

// Capa de fallback quando a loja ainda não enviou banner
const GRADIENTS = [
  'from-orange-400 to-rose-500',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-fuchsia-600',
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-indigo-600',
  'from-violet-400 to-purple-600',
]

function gradientFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

interface StoreCardProps {
  store: MarketStore
  isFavorite: boolean
  onToggleFavorite: (storeId: string) => void
}

export function StoreCard({ store, isFavorite, onToggleFavorite }: StoreCardProps) {
  const minOrder = Number(store.minOrderValue)
  const location = store.city ? `${store.city}${store.state ? ` - ${store.state}` : ''}` : null

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      {/* Capa */}
      <div className={`relative h-32 w-full shrink-0 overflow-hidden bg-gradient-to-br ${gradientFor(store.slug)}`}>
        {store.bannerUrl && (
          <img
            loading="lazy"
            decoding="async"
            src={store.bannerUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {!store.isOpen && <div className="absolute inset-0 bg-slate-950/45" />}

        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
            store.isOpen ? 'bg-emerald-500 text-white' : 'bg-white/90 text-slate-700 dark:bg-slate-900/90 dark:text-slate-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${store.isOpen ? 'bg-white' : 'bg-slate-400'}`} />
          {store.isOpen ? 'Aberto agora' : 'Fechado'}
        </span>
      </div>

      {/* Favorito (fica acima do link que cobre o card) */}
      <button
        type="button"
        onClick={() => onToggleFavorite(store.id)}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? `Remover ${store.name} dos favoritos` : `Adicionar ${store.name} aos favoritos`}
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 active:scale-95 dark:bg-slate-900/95"
      >
        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-400'}`} />
      </button>

      {/* Conteúdo */}
      <div className="relative flex flex-1 flex-col px-4 pb-4 pt-9">
        <div className="absolute -top-8 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100 text-xl font-bold text-slate-500 shadow-md dark:border-slate-900 dark:bg-slate-800 dark:text-slate-300">
          {store.logoUrl
            ? <img loading="lazy" decoding="async" src={store.logoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            : (store.name?.[0]?.toUpperCase() ?? '?')}
        </div>

        <h3 className="line-clamp-1 text-base font-bold text-slate-900 dark:text-white">
          {/* Link "esticado": o card inteiro é clicável, mesmo com a loja fechada (o cliente vê o cardápio) */}
          <Link href={`/${store.slug}`} className="after:absolute after:inset-0 after:z-10 focus:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-orange-500">
            {store.name}
          </Link>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
          {store.description || (location ?? 'Cardápio online')}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-600 dark:text-slate-300">
          {store.ratingCount > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              <Star className="h-3.5 w-3.5 fill-current" />
              {store.ratingAvg.toFixed(1)}
              <span className="font-normal text-slate-400">({store.ratingCount})</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {store.estimatedTime}–{store.estimatedTime + 20} min
          </span>
          <span>{minOrder > 0 ? `Mín. ${currency(minOrder)}` : 'Sem pedido mínimo'}</span>
        </div>

        {location && store.description && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5" /> {location}
          </p>
        )}

        <div className="mt-auto pt-4">
          <span
            className={`flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              store.isOpen
                ? 'bg-orange-500 text-white group-hover:bg-orange-600'
                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700'
            }`}
          >
            {store.isOpen ? 'Fazer pedido' : 'Ver cardápio'}
          </span>
        </div>
      </div>
    </article>
  )
}
