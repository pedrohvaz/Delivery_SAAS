'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { api } from '@/lib/api'

interface ReviewData {
  review: { rating: number; comment: string | null } | null
  rating: { avg: number; count: number }
}

export function CustomerReview({ orderId }: { orderId: string }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['customer-review', orderId],
    queryFn: () => api.get<{ data: ReviewData }>(`/reviews/customer/${orderId}`).then((r) => r.data.data),
  })
  const review = data?.review
  const agg = data?.rating

  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (review) { setStars(review.rating); setComment(review.comment ?? '') }
  }, [review])

  async function save() {
    if (!stars) return
    setSaving(true)
    try {
      await api.post(`/reviews/customer/${orderId}`, { rating: stars, comment: comment || undefined })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      qc.invalidateQueries({ queryKey: ['customer-review', orderId] })
    } catch { /* silencioso */ } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avaliar cliente</p>
        {agg && agg.count > 0 && (
          <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            {agg.avg.toFixed(1)} <span className="text-muted-foreground font-normal">({agg.count})</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setStars(s)}>
            <Star className={`h-6 w-6 transition-colors ${s <= (hover || stars) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Comentário (opcional)..."
        className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <button
        onClick={save}
        disabled={!stars || saving}
        className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
      >
        {saving ? 'Salvando...' : saved ? 'Avaliação salva! ✓' : review ? 'Atualizar avaliação' : 'Salvar avaliação'}
      </button>
      <p className="text-[10px] text-muted-foreground">🔒 Privado — visível apenas para lojistas.</p>
    </div>
  )
}
