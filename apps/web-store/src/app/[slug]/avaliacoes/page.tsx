'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Star, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api'

interface Summary { avg: number; count: number }
interface ReviewItem {
  id: string; rating: number; comment: string | null; createdAt: string
  customerName: string; orderNumber: number | null
}

function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${size} ${s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  )
}

export default function AvaliacoesPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  const { data: summary } = useQuery({
    queryKey: ['reviews-summary', slug],
    queryFn: () => api.get<{ data: Summary }>(`/reviews/store/${slug}/summary`).then((r) => r.data.data),
  })
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews-list', slug],
    queryFn: () => api.get<{ data: ReviewItem[] }>(`/reviews/store/${slug}/list`).then((r) => r.data.data),
  })

  const avg = summary?.avg ?? 0
  const count = summary?.count ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-xl px-4 flex items-center gap-3 py-3">
          <button onClick={() => router.push(`/${slug}`)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-base">Avaliações</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6 space-y-5">
        {/* Resumo */}
        <div className="bg-white rounded-2xl border p-6 flex items-center gap-5">
          <div className="text-center shrink-0">
            <div className="text-4xl font-black text-foreground">{avg.toFixed(1)}</div>
            <Stars value={avg} />
            <p className="text-xs text-muted-foreground mt-1">{count} {count === 1 ? 'avaliação' : 'avaliações'}</p>
          </div>
          <div className="flex-1 text-sm text-muted-foreground">
            {count > 0
              ? 'Avaliações de clientes que receberam seus pedidos.'
              : 'Esta loja ainda não recebeu avaliações. Seja o primeiro a avaliar após receber seu pedido!'}
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {isLoading && [1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}

          {reviews?.length === 0 && !isLoading && (
            <div className="bg-white rounded-2xl border p-8 text-center space-y-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
            </div>
          )}

          {reviews?.map((rv) => (
            <div key={rv.id} className="bg-white rounded-2xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {rv.customerName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{rv.customerName}</span>
                </div>
                <Stars value={rv.rating} size="h-3.5 w-3.5" />
              </div>
              {rv.comment && <p className="text-sm text-muted-foreground italic">“{rv.comment}”</p>}
              <p className="text-[11px] text-muted-foreground">
                {new Date(rv.createdAt).toLocaleDateString('pt-BR')}
                {rv.orderNumber ? ` · Pedido #${rv.orderNumber}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
