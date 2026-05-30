'use client'

'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { CheckCircle2, Clock, ChefHat, Bike, PackageCheck, XCircle, ArrowLeft, Star, Bell, BellOff } from 'lucide-react'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'
import { cn } from '@delivery/ui'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useCustomerAuth } from '@/store/customer-auth'

interface OrderData {
  id: string
  orderNumber: number
  status: string
  type: string
  total: number
  subtotal: number
  deliveryFee: number
  discount: number
  paymentMethod: string | null
  createdAt: string
  store: { name: string; slug: string; logoUrl: string | null; estimatedTime: number }
  customer: { name: string } | null
  items: { id: string; name: string; price: number; quantity: number; notes: string | null; addons: unknown[] }[]
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; step: number }> = {
  PENDING:           { label: 'Aguardando confirmação', icon: <Clock className="h-6 w-6" />,        color: 'text-yellow-600', bg: 'bg-yellow-50', step: 1 },
  CONFIRMED:         { label: 'Pedido confirmado',      icon: <CheckCircle2 className="h-6 w-6" />, color: 'text-blue-600',   bg: 'bg-blue-50',   step: 2 },
  IN_PRODUCTION:     { label: 'Em produção',            icon: <ChefHat className="h-6 w-6" />,      color: 'text-orange-600', bg: 'bg-orange-50', step: 3 },
  OUT_FOR_DELIVERY:  { label: 'Saiu para entrega',      icon: <Bike className="h-6 w-6" />,         color: 'text-purple-600', bg: 'bg-purple-50', step: 4 },
  READY_FOR_PICKUP:  { label: 'Pronto para retirar',    icon: <PackageCheck className="h-6 w-6" />, color: 'text-primary',   bg: 'bg-primary/10', step: 4 },
  DELIVERED:         { label: 'Entregue!',              icon: <CheckCircle2 className="h-6 w-6" />, color: 'text-green-600', bg: 'bg-green-50',  step: 5 },
  CANCELLED:         { label: 'Cancelado',              icon: <XCircle className="h-6 w-6" />,      color: 'text-red-600',   bg: 'bg-red-50',    step: 0 },
}

const STEPS_DELIVERY = ['Confirmado', 'Em produção', 'Saiu para entrega', 'Entregue']
const STEPS_PICKUP   = ['Confirmado', 'Em produção', 'Pronto para retirar', 'Retirado']

function ReviewWidget({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const { data: existing } = useQuery({
    queryKey: ['review', orderId],
    queryFn: () => api.get(`/reviews/${orderId}`).then(r => r.data.data).catch(() => null),
  })

  if (existing || submitted) {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center space-y-1">
        <p className="font-semibold text-green-700">Obrigado pela avaliação! ⭐</p>
        <div className="flex justify-center gap-1">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={cn('h-5 w-5', s <= (existing?.rating ?? rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
          ))}
        </div>
        {(existing?.comment || comment) && <p className="text-sm text-muted-foreground italic">"{existing?.comment || comment}"</p>}
      </div>
    )
  }

  async function handleSubmit() {
    if (!rating) return
    setLoading(true)
    try {
      await api.post(`/reviews/${orderId}`, { rating, comment: comment || undefined })
      setSubmitted(true)
    } catch { /* silencioso */ } finally { setLoading(false) }
  }

  return (
    <div className="rounded-2xl bg-white border p-5 space-y-3">
      <p className="font-semibold text-sm text-center">Como foi seu pedido?</p>
      <div className="flex justify-center gap-2">
        {[1,2,3,4,5].map(s => (
          <button key={s} type="button" onClick={() => setRating(s)} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}>
            <Star className={cn('h-8 w-8 transition-colors', s <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
            placeholder="Deixe um comentário (opcional)..."
            className="w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <button onClick={handleSubmit} disabled={loading}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">
            {loading ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </>
      )}
    </div>
  )
}

function CreateAccountPrompt({ slug }: { slug: string }) {
  const isAuthenticated = useCustomerAuth((s) => s.isAuthenticated)
  const register = useCustomerAuth((s) => s.register)
  const [prefill, setPrefill] = useState<{ name: string; phone: string } | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [exists, setExists] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('customer_prefill')
      if (raw) setPrefill(JSON.parse(raw))
    } catch { /* ignora */ }
  }, [])

  if (isAuthenticated || dismissed || !prefill || prefill.phone.length < 10) return null

  if (done) {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center space-y-1">
        <p className="font-semibold text-green-700">Conta criada! 🎉</p>
        <p className="text-sm text-green-700">Seus próximos pedidos vão ser mais rápidos, em qualquer loja.</p>
      </div>
    )
  }

  async function handleCreate() {
    setError('')
    if (password.length < 6) { setError('A senha deve ter ao menos 6 caracteres'); return }
    if (password !== confirm) { setError('As senhas não conferem'); return }
    setLoading(true)
    try {
      await register({ name: prefill!.name || 'Cliente', phone: prefill!.phone, password })
      try { sessionStorage.removeItem('customer_prefill') } catch { /* ignora */ }
      setDone(true)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        setExists(true)
        setError('Você já tem uma conta com este telefone.')
      } else {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Não foi possível criar a conta'
        setError(msg)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="rounded-2xl bg-white border p-5 space-y-3">
      <div className="space-y-1">
        <p className="font-bold text-sm">Crie sua conta e peça mais rápido 🚀</p>
        <p className="text-xs text-muted-foreground">Salvamos seu endereço e seus dados para usar em qualquer loja. Defina uma senha:</p>
      </div>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha (mín. 6 caracteres)" autoComplete="new-password"
        className="w-full h-11 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirme a senha" autoComplete="new-password"
        className="w-full h-11 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {exists ? (
        <Link href={`/${slug}/entrar?redirect=${encodeURIComponent(`/${slug}/minha-conta`)}`}
          className="block w-full rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground hover:bg-primary/90 transition">
          Entrar na minha conta
        </Link>
      ) : (
        <button onClick={handleCreate} disabled={loading || password.length < 6}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
      )}
      <button onClick={() => setDismissed(true)} className="w-full text-center text-xs text-muted-foreground hover:underline">Agora não</button>
    </div>
  )
}

export default function OrderTrackPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>()
  const router = useRouter()
  const prevStatusRef = useRef<string | null>(null)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.get<{ data: OrderData }>(`/orders/${orderId}/track`).then((r) => r.data.data),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || status === 'DELIVERED' || status === 'CANCELLED') return false
      return 10_000 // refetch a cada 10s enquanto em andamento
    },
  })

  const { subscribed, subscribe, notifyLocally } = usePushNotifications(`/${slug}/pedido/${orderId}`)

  // Auto-scroll para o topo ao carregar
  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Notifica push quando status muda
  useEffect(() => {
    if (!order) return
    if (prevStatusRef.current && prevStatusRef.current !== order.status) {
      const info = STATUS_CONFIG[order.status]
      if (info) notifyLocally('Pedido atualizado', info.label)
    }
    prevStatusRef.current = order.status
  }, [order?.status])

  if (isLoading || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const statusInfo = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PENDING']
  const isCancelled = order.status === 'CANCELLED'
  const isDone = order.status === 'DELIVERED'
  const steps = order.type === 'PICKUP' ? STEPS_PICKUP : STEPS_DELIVERY
  const currentStep = statusInfo.step

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-xl px-4 flex items-center gap-3 py-3">
          <button onClick={() => router.push(`/${slug}`)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-base">Pedido #{order.orderNumber}</h1>
          {!subscribed && !isDone && !isCancelled && (
            <button onClick={subscribe}
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition">
              <Bell className="h-3.5 w-3.5" /> Notificar
            </button>
          )}
          {subscribed && <BellOff className="ml-auto h-4 w-4 text-muted-foreground" />}
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5 space-y-4">
        {/* Status principal */}
        <div className={`rounded-2xl ${statusInfo.bg} border p-5 flex items-center gap-4`}>
          <div className={`shrink-0 ${statusInfo.color}`}>{statusInfo.icon}</div>
          <div>
            <p className={`font-bold text-base ${statusInfo.color}`}>{statusInfo.label}</p>
            {!isCancelled && !isDone && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Tempo estimado: {order.store.estimatedTime} minutos
              </p>
            )}
            {isDone && (
              <p className="text-xs text-muted-foreground mt-0.5">Bom apetite! 🍽️</p>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        {!isCancelled && (
          <div className="rounded-2xl bg-white border p-4">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => {
                const stepNum = idx + 2  // steps começam no step 2 (após PENDING)
                const done = currentStep > stepNum
                const active = currentStep === stepNum
                return (
                  <div key={step} className="flex flex-1 flex-col items-center gap-1">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors
                      ${done ? 'bg-green-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {done ? '✓' : idx + 1}
                    </div>
                    <span className={`text-[10px] text-center font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step}
                    </span>
                    {/* Linha conectora */}
                    {idx < steps.length - 1 && (
                      <div className={`absolute mt-4 h-0.5 w-full max-w-[60px] ${done ? 'bg-green-500' : 'bg-muted'}`} style={{ left: '50%' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Itens do pedido */}
        <div className="rounded-2xl bg-white border p-4 space-y-3">
          <p className="font-semibold text-sm">Itens do pedido</p>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
              <span className="font-medium">{currency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span><span>{currency(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Entrega</span><span>{currency(order.deliveryFee)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto</span><span>-{currency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span><span className="text-primary">{currency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Pagamento */}
        {order.paymentMethod && (
          <div className="rounded-2xl bg-white border p-4">
            <p className="text-sm font-semibold mb-1">Pagamento</p>
            <p className="text-sm text-muted-foreground capitalize">{order.paymentMethod.replace('_', ' ').toLowerCase()}</p>
          </div>
        )}

        {/* Convite para criar conta (apenas visitantes) */}
        {!isCancelled && <CreateAccountPrompt slug={slug} />}

        {/* Avaliação — só quando entregue */}
        {isDone && <ReviewWidget orderId={orderId} />}

        {/* Voltar ao cardápio */}
        <button
          onClick={() => router.push(`/${slug}`)}
          className="w-full rounded-2xl border border-primary py-3 text-sm font-semibold text-primary transition hover:bg-primary/5"
        >
          Voltar ao cardápio
        </button>
      </div>
    </div>
  )
}
