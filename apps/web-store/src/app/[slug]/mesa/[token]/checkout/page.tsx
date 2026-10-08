'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, CreditCard, CheckCircle2, Tag, X } from 'lucide-react'
import { api } from '@/lib/api'
import { saveLocalOrder } from '@/lib/local-orders'
import { currency } from '@/lib/utils'
import { useCartStore, itemTotal } from '@/store/cart'

interface StoreData {
  id: string; name: string; slug: string; estimatedTime: number
  paymentMethods: { id: string; type: string; label: string }[]
}

interface TableData {
  tableId: string
  tableNumber: number
  tableLabel: string | null
  store: { id: string; name: string; slug: string }
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <input
        {...props}
        className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

export default function MesaCheckoutPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>()
  const router = useRouter()
  const { items, subtotal, clearCart } = useCartStore()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponResult, setCouponResult] = useState<{ discount: number; label: string; type: string } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [returningCustomer, setReturningCustomer] = useState<string | null>(null)
  const phoneSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Valida o token da mesa
  const { data: tableData, isLoading: tableLoading, error: tableError } = useQuery({
    queryKey: ['table', token],
    queryFn: () => api.get<{ data: TableData }>(`/store/table/${token}`).then((r) => r.data.data),
  })

  const { data: store } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => api.get<{ data: StoreData }>(`/store/${slug}`).then((r) => r.data.data),
    enabled: !!tableData,
  })

  // Redireciona se carrinho vazio
  useEffect(() => {
    if (items.length === 0) router.replace(`/${slug}/mesa/${token}`)
  }, [items.length, slug, token, router])

  function handlePhoneChange(v: string) {
    setPhone(v)
    setReturningCustomer(null)
    // (A busca do nome pelo telefone foi removida: expunha dados de terceiros.)
  }

  async function handleValidateCoupon() {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError('')
    setCouponResult(null)
    try {
      const r = await api.post<{ data: { discount: number; label: string; type: string } }>(
        `/store/${slug}/coupon/validate`,
        { code: couponInput.trim(), subtotal: subtotal() },
      )
      setCouponResult(r.data.data)
      setCouponCode(couponInput.trim())
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Cupom inválido'
      setCouponError(msg)
      setCouponCode('')
    } finally {
      setCouponLoading(false)
    }
  }

  function handleRemoveCoupon() {
    setCouponInput('')
    setCouponCode('')
    setCouponResult(null)
    setCouponError('')
  }

  if (items.length === 0 || tableLoading) return null

  if (tableError || !tableData) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center px-4">
        <div className="space-y-3">
          <div className="text-6xl">❌</div>
          <h1 className="text-xl font-bold">Mesa não encontrada</h1>
          <p className="text-muted-foreground text-sm">QR Code inválido ou mesa desativada.</p>
        </div>
      </div>
    )
  }

  const cartSubtotal = subtotal()
  const discount = couponResult?.discount ?? 0
  const total = Math.max(0, cartSubtotal - discount)
  const tableLabel = tableData.tableLabel ?? `Mesa ${tableData.tableNumber}`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!paymentMethod) { setError('Selecione uma forma de pagamento'); return }

    setLoading(true)
    try {
      const { data } = await api.post('/orders', {
        storeSlug: slug,
        type: 'TABLE',
        tableId: tableData?.tableId,
        customerName: name,
        customerPhone: phone,
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes,
          addons: item.addons,
        })),
        paymentMethod,
        notes,
        couponCode: couponCode.trim() || undefined,
      })

      // Guarda no aparelho para aparecer em "Meus pedidos" sem login

      saveLocalOrder({ id: data.data.id, slug, orderNumber: data.data.orderNumber, total: data.data.total, createdAt: new Date().toISOString() })

      clearCart()
      if (data.data.requiresPayment) {
        router.push(`/${slug}/pedido/${data.data.id}/pagar`)
      } else {
        router.push(`/${slug}/pedido/${data.data.id}`)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao realizar pedido'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-xl px-4 flex items-center gap-3 py-3">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight">Finalizar pedido</h1>
            <p className="text-xs text-muted-foreground">🪑 {tableLabel}</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-xl px-4 py-5 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Banner de mesa */}
        <div className="rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🪑</span>
          <div>
            <p className="font-semibold text-sm text-primary">{tableLabel}</p>
            <p className="text-xs text-muted-foreground">Pedido direto na mesa · sem taxa de entrega</p>
          </div>
        </div>

        {/* Identificação */}
        <div className="rounded-2xl bg-white border p-4 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-2"><User className="h-4 w-4 text-primary" />Seus dados</p>
          {returningCustomer && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700">Olá de volta, <span className="font-semibold">{returningCustomer}</span>! 👋</p>
            </div>
          )}
          <Input label="WhatsApp" placeholder="(11) 99999-9999" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} type="tel" />
          <Input label="Nome" placeholder="Seu nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Pagamento */}
        <div className="rounded-2xl bg-white border p-4 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Pagamento</p>
          {store?.paymentMethods && store.paymentMethods.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {store.paymentMethods.map((pm) => (
                <button key={pm.id} type="button" onClick={() => setPaymentMethod(pm.type)}
                  className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${paymentMethod === pm.type ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  {pm.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[{ type: 'PIX', label: '💲 Pix' }, { type: 'CASH', label: '💵 Dinheiro' }, { type: 'CREDIT_CARD', label: '💳 Cartão Crédito' }, { type: 'DEBIT_CARD', label: '💳 Cartão Débito' }].map((pm) => (
                <button key={pm.type} type="button" onClick={() => setPaymentMethod(pm.type)}
                  className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${paymentMethod === pm.type ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  {pm.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cupom */}
        <div className="rounded-2xl bg-white border p-4 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-2"><Tag className="h-4 w-4 text-primary" />Cupom de desconto</p>
          {couponResult ? (
            <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">{couponResult.label}</p>
                  <p className="text-xs text-green-600 font-mono">{couponCode}</p>
                </div>
              </div>
              <button type="button" onClick={handleRemoveCoupon}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-green-100 text-green-600 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="h-10 flex-1 rounded-xl border border-input bg-white px-3 text-sm font-mono uppercase placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Digite o código"
                value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleValidateCoupon())}
              />
              <button type="button" onClick={handleValidateCoupon} disabled={couponLoading || !couponInput.trim()}
                className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition whitespace-nowrap">
                {couponLoading ? '...' : 'Aplicar'}
              </button>
            </div>
          )}
          {couponError && <p className="text-xs text-red-600 px-1">{couponError}</p>}
        </div>

        {/* Resumo do pedido */}
        <div className="rounded-2xl bg-white border p-4 space-y-2">
          <p className="font-semibold text-sm mb-3">Resumo do pedido</p>
          {items.map((item) => (
            <div key={item.cartItemId} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
              <span className="font-medium">{currency(itemTotal(item))}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span><span>{currency(cartSubtotal)}</span>
            </div>
            {couponResult && couponResult.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{couponCode}</span>
                <span>- {currency(couponResult.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Entrega</span>
              <span className="text-green-600 font-medium">Grátis</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span><span className="text-primary">{currency(total)}</span>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="rounded-2xl bg-white border p-4 space-y-2">
          <label className="text-sm font-semibold">Observações do pedido</label>
          <textarea
            className="w-full rounded-xl border border-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={2}
            placeholder="Alguma instrução especial?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Botão */}
        <button type="submit" disabled={loading}
          className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-95 disabled:opacity-60">
          {loading ? 'Enviando pedido...' : `Fazer pedido · ${currency(total)}`}
        </button>
      </form>
    </div>
  )
}
