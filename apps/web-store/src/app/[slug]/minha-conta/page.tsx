'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'
import { ArrowLeft, ShoppingBag, ChevronRight, LogIn, UserPlus, Star } from 'lucide-react'
import { cn } from '@delivery/ui'
import Link from 'next/link'
import { useCustomerAuth } from '@/store/customer-auth'
import { AccountDashboard } from '@/components/account/AccountDashboard'
import { useMounted } from '@/hooks/use-mounted'
import { getLocalOrders, type LocalOrder } from '@/lib/local-orders'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:          { label: 'Pendente',       color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED:        { label: 'Confirmado',      color: 'bg-blue-100 text-blue-700' },
  IN_PRODUCTION:    { label: 'Em produção',     color: 'bg-orange-100 text-orange-700' },
  OUT_FOR_DELIVERY: { label: 'Saindo',          color: 'bg-purple-100 text-purple-700' },
  READY_FOR_PICKUP: { label: 'Pronto',          color: 'bg-indigo-100 text-indigo-700' },
  DELIVERED:        { label: 'Entregue',        color: 'bg-green-100 text-green-700' },
  CANCELLED:        { label: 'Cancelado',       color: 'bg-red-100 text-red-700' },
}


export default function MinhaContaPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const isAuthenticated = useCustomerAuth((s) => s.isAuthenticated)
  const mounted = useMounted()

  // Pedidos feitos neste aparelho (sem login). O status vem da API pelo id do pedido.
  // Substitui a antiga consulta "por telefone", que expunha o histórico de qualquer pessoa.
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([])
  useEffect(() => { setLocalOrders(getLocalOrders(slug)) }, [slug])
  const { data: statuses } = useQuery({
    queryKey: ['local-orders-status', slug, localOrders.map((o) => o.id).join(',')],
    queryFn: async () => {
      const entries = await Promise.all(localOrders.map(async (o) => {
        try {
          const r = await api.get<{ data: { status: string } }>(`/orders/${o.id}/track`)
          return [o.id, r.data.data.status] as const
        } catch { return [o.id, null] as const }
      }))
      return Object.fromEntries(entries) as Record<string, string | null>
    },
    enabled: localOrders.length > 0 && !isAuthenticated,
    refetchInterval: 30000,
  })

  const redirect = `/${slug}/minha-conta`

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-xl px-4 flex items-center gap-3 py-3">
          <button onClick={() => router.push(`/${slug}`)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-base">Minha Conta</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6 space-y-5">
        {!mounted ? null : isAuthenticated ? (
          <AccountDashboard />
        ) : (
          <>
            {/* CTA de conta global */}
            <div className="bg-white rounded-2xl border p-6 space-y-4 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Star className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold">Sua conta em todas as lojas</h2>
                <p className="text-sm text-muted-foreground">Entre para salvar endereços e acompanhar seus pedidos em qualquer loja.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/${slug}/entrar?redirect=${encodeURIComponent(redirect)}`}
                  className="flex items-center justify-center gap-1.5 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition">
                  <LogIn className="h-4 w-4" /> Entrar
                </Link>
                <Link href={`/${slug}/criar-conta?redirect=${encodeURIComponent(redirect)}`}
                  className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-primary text-primary text-sm font-bold hover:bg-primary/5 transition">
                  <UserPlus className="h-4 w-4" /> Criar conta
                </Link>
              </div>
            </div>

            {/* Pedidos feitos neste aparelho */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground px-1">Pedidos feitos neste aparelho</h3>
              {localOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border p-8 text-center space-y-2">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">Nenhum pedido feito neste aparelho ainda.</p>
                  <Link href={`/${slug}`} className="text-sm text-primary font-medium hover:underline">Ver cardápio →</Link>
                </div>
              ) : localOrders.map((order) => {
                const status = statuses?.[order.id]
                const st = status ? (STATUS_LABELS[status] ?? { label: status, color: 'bg-muted text-muted-foreground' }) : null
                const isActive = !!status && !['DELIVERED', 'CANCELLED'].includes(status)
                return (
                  <Link key={order.id} href={`/${slug}/pedido/${order.id}`}
                    className="flex items-center gap-3 bg-white rounded-2xl border p-4 hover:shadow-sm transition">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">#{order.orderNumber}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {st ? <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', st.color)}>{st.label}</span>
                          : <span className="h-4 w-16 rounded-full bg-muted animate-pulse" />}
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      <p className="text-sm font-semibold text-primary mt-0.5">{currency(order.total)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
