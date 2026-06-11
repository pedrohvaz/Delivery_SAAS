'use client'

import Image from 'next/image'
import { ShoppingCart, Clock, MapPin, Star, User, ChevronDown } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useCustomerAuth } from '@/store/customer-auth'
import { currency } from '@/lib/utils'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { useMounted } from '@/hooks/use-mounted'
import Link from 'next/link'
import { useState } from 'react'

interface Schedule { dayOfWeek: number; openTime: string; closeTime: string }
interface StoreData {
  name: string; slug: string; logoUrl: string | null; bannerUrl: string | null
  description: string | null; isOpen: boolean; estimatedTime: number
  minOrderValue: number
  address: string | null; number: string | null; district: string | null
  city: string | null; state: string | null
  schedules: Schedule[]
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function getNextOpenLabel(schedules: Schedule[]): string | null {
  if (schedules.length === 0) return null
  const today = new Date().getDay()
  for (let i = 1; i <= 7; i++) {
    const day = (today + i) % 7
    const s = schedules.find((x) => x.dayOfWeek === day)
    if (s) return `Abre ${i === 1 ? 'amanhã' : DAY_NAMES[day]} às ${s.openTime}`
  }
  return null
}

export function StoreHeader({ store }: { store: StoreData }) {
  const { totalItems, subtotal, toggleCart } = useCartStore()
  const account = useCustomerAuth((s) => s.account)
  const isAuthenticated = useCustomerAuth((s) => s.isAuthenticated)
  const mounted = useMounted()
  const [showHours, setShowHours] = useState(false)

  const { data: ratingSummary } = useQuery({
    queryKey: ['reviews-summary', store.slug],
    queryFn: () => api.get<{ data: { avg: number; count: number } }>(`/reviews/store/${store.slug}/summary`).then((r) => r.data.data),
  })
  const itemCount = totalItems()
  const cartTotal = subtotal()
  const nextOpen = !store.isOpen ? getNextOpenLabel(store.schedules) : null

  const addressLine = [store.address, store.number].filter(Boolean).join(', ')
  const timeRange = `${store.estimatedTime} - ${store.estimatedTime + 20}min`

  return (
    <header className="relative w-full bg-white shadow-sm">
      {/* Banner */}
      <div className="relative w-full h-48 sm:h-56 overflow-hidden">
        {store.bannerUrl ? (
          <img src={store.bannerUrl} alt={store.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary" />
        )}
        <div className="absolute inset-0 bg-black/40" />

        {/* Topo: user + status */}
        <div className="absolute top-3 left-0 right-0 px-4 flex items-center justify-between">
          <Link
            href={`/${store.slug}/minha-conta`}
            className="flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 transition px-3 py-1.5 text-xs font-bold"
            title="Minha conta"
          >
            {mounted && isAuthenticated && account ? (
              <>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shrink-0">{account.name?.[0]?.toUpperCase() ?? '?'}</span>
                <span className="max-w-[90px] truncate">{account.name?.split(' ')[0]}</span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5" />
                <span>Entrar</span>
              </>
            )}
          </Link>

          <div className={`flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm ${store.isOpen ? 'bg-emerald-500/90' : 'bg-red-500/90'}`}>
            <span className={`w-2 h-2 rounded-full bg-white shrink-0 ${store.isOpen ? 'animate-ping' : ''}`} />
            {store.isOpen ? 'Aberto Agora' : (nextOpen ?? 'Fechado')}
          </div>
        </div>
      </div>

      {/* Info da loja */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-4 relative">
        {/* Logo sobreposto ao banner */}
        <div className="absolute -top-12 left-6 w-24 h-24 rounded-full bg-white shadow-md overflow-hidden flex items-center justify-center border-4 border-white">
          {store.logoUrl ? (
            <Image src={store.logoUrl} alt={store.name} width={96} height={96} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-3xl">🍽️</div>
          )}
        </div>

        <div className="pt-16 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {store.name}
            </h1>
            {store.description && (
              <p className="text-sm text-gray-500 mt-1 max-w-xl font-medium">{store.description}</p>
            )}
          </div>

          {/* Botão carrinho mobile/tablet (no desktop fica o sidebar) */}
          {mounted && itemCount > 0 && (
            <button
              onClick={toggleCart}
              className="lg:hidden flex items-center gap-2 rounded-full bg-primary hover:opacity-90 px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg active:scale-95 transition self-start"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
              <span>·</span>
              <span>{currency(cartTotal)}</span>
            </button>
          )}
        </div>

        {/* Rating e detalhes */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-gray-100 text-xs sm:text-sm font-semibold text-gray-600">
          <Link href={`/${store.slug}/avaliacoes`} className="flex items-center text-amber-500 hover:underline">
            <Star className="w-4 h-4 fill-amber-500 mr-1" />
            {ratingSummary && ratingSummary.count > 0 ? (
              <span className="text-gray-700 font-semibold">{ratingSummary.avg.toFixed(1)} <span className="text-gray-400 font-normal">({ratingSummary.count})</span></span>
            ) : (
              <span className="text-gray-500 font-normal">Avaliações</span>
            )}
          </Link>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1 text-gray-700">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{timeRange}</span>
          </div>
          {addressLine && (
            <>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1 text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{addressLine}</span>
              </div>
            </>
          )}
          {Number(store.minOrderValue) > 0 && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-gray-700">
                Pedido mínimo <span className="font-bold text-gray-900">{currency(Number(store.minOrderValue))}</span>
              </span>
            </>
          )}
          <div className={`flex items-center gap-1 font-bold ${store.isOpen ? 'text-emerald-600' : 'text-red-500'}`}>
            <span className={`h-2 w-2 rounded-full shrink-0 ${store.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {store.isOpen ? 'Entrega Disponível' : 'Loja Fechada'}
          </div>
        </div>

        {/* Horários expansíveis */}
        {store.schedules.length > 0 && (
          <>
            <button
              onClick={() => setShowHours((v) => !v)}
              className="flex items-center gap-1 mt-2 text-[11px] text-gray-400 hover:text-gray-600 transition"
            >
              Ver horários de funcionamento
              <ChevronDown className={`h-3 w-3 transition-transform ${showHours ? 'rotate-180' : ''}`} />
            </button>
            {showHours && (
              <div className="mt-2 rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5">
                {store.schedules.map((s) => (
                  <div key={s.dayOfWeek} className="flex justify-between text-[12px]">
                    <span className="font-medium text-gray-700 w-24">{DAY_NAMES[s.dayOfWeek]}</span>
                    <span className="text-gray-500">{s.openTime} – {s.closeTime}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  )
}
