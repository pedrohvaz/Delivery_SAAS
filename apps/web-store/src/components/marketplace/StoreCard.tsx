'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { Clock, ShoppingBag, MapPin, ChevronRight, Lock, Heart, Bike } from 'lucide-react'
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
}

// Paleta de gradientes para a capa (substitui as imagens de banner que o backend não tem)
const GRADIENTS = [
  'from-orange-500 to-rose-500',
  'from-rose-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-fuchsia-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-lime-500 to-emerald-600',
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
  const router = useRouter()
  const minOrder = Number(store.minOrderValue)
  const go = () => { if (store.isOpen) router.push(`/${store.slug}`) }

  return (
    <motion.div
      initial={{ y: 0, scale: 1 }}
      whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25, ease: 'easeOut' } }}
      onClick={go}
      className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-100 dark:hover:border-orange-950/40 transition-colors duration-300 flex flex-col justify-between text-slate-800 dark:text-slate-100 shadow-3xs hover:shadow-xl hover:shadow-slate-950/10"
    >
      {/* Capa: banner real da loja (se houver), com gradiente de fallback */}
      <div className={`relative h-28 w-full bg-gradient-to-r ${gradientFor(store.slug)} overflow-hidden shrink-0`}>
        {store.bannerUrl && (
          <img
            src={store.bannerUrl}
            alt={store.name}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-all duration-300 pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:14px_24px] opacity-25" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

        {/* Status */}
        <div className="absolute top-3 right-12 z-10">
          {store.isOpen ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/90 backdrop-blur-xs px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              Aberto Agora
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900/75 backdrop-blur-xs px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs">
              <Lock className="h-2.5 w-2.5" />
              Fechado
            </span>
          )}
        </div>

        {/* Favorito */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(store.id) }}
          className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer border border-slate-100 dark:border-slate-800 hover:scale-110 active:scale-95"
          title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart className={`h-4.5 w-4.5 transition-all duration-300 ${isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-600 dark:text-slate-400'}`} />
        </button>

        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
      </div>

      {/* Conteúdo */}
      <div className="p-5 pt-8 relative flex-1 flex flex-col justify-between">
        {/* Logo */}
        <div className="absolute -top-7 left-5 z-20">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md transform group-hover:scale-105 transition-transform duration-300 border-2 border-white dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800 text-slate-500">
            {store.logoUrl
              ? <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              : (store.name?.[0]?.toUpperCase() ?? '🍽️')}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] font-semibold tracking-wide uppercase text-orange-600 line-clamp-1">
              {store.city ? `${store.city}${store.state ? ` • ${store.state}` : ''}` : 'Loja parceira'}
            </span>
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 shadow-3xs shrink-0">
              <Clock className="h-3 w-3 text-orange-500" />
              <span>{store.estimatedTime} min</span>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-orange-600 transition-colors">
            {store.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 font-sans">
            {store.description || 'Cardápio completo disponível para pedido'}
          </p>

          {/* Infos reais */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-center font-mono">
            <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-slate-50 dark:bg-slate-950">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Tempo</span>
              <div className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                <Clock className="h-3 w-3 text-slate-500" /><span>{store.estimatedTime} min</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-slate-50 dark:bg-slate-950">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Mínimo</span>
              <div className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                {minOrder > 0
                  ? <span>{currency(minOrder)}</span>
                  : <span className="text-emerald-600 uppercase text-[10px] tracking-wide">Livre</span>}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-slate-50 dark:bg-slate-950">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Local</span>
              <div className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                <MapPin className="h-3 w-3 text-slate-500" /><span className="truncate max-w-[60px]">{store.city ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mt-3.5">
            {store.isOpen ? (
              <button className="w-full py-3 bg-slate-900 dark:bg-slate-800 text-white font-bold rounded-2xl group-hover:bg-orange-600 transition-all duration-300 flex items-center justify-center gap-1 text-sm cursor-pointer">
                <span>Fazer Pedido</span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button disabled className="w-full py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-505 font-bold rounded-2xl cursor-not-allowed text-sm">
                Loja Fechada
              </button>
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 py-2 px-3 rounded-xl border border-slate-100/60 dark:border-slate-850/40">
            <Bike className="h-3.5 w-3.5 text-orange-500" />
            <span>Entrega est.: <strong className="text-slate-850 dark:text-slate-200">{store.estimatedTime} min</strong></span>
            <ShoppingBag className="h-3 w-3 text-slate-300 dark:text-slate-600 ml-1" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
