'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, MapPin, User, CreditCard, CheckCircle2, Tag, X, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'
import { useCartStore, itemTotal } from '@/store/cart'
import { useCustomerAuth } from '@/store/customer-auth'
import { useMounted } from '@/hooks/use-mounted'

interface DeliveryArea {
  id: string; type: string; fee: number; freeFrom: number | null
  minOrder: number; district: string | null; radiusKm: number | null; name: string | null
}

interface StoreData {
  id: string; name: string; slug: string; estimatedTime: number
  minOrderValue: number
  paymentMethods: { id: string; type: string; label: string }[]
  deliveryAreas: DeliveryArea[]
}

interface SavedAddress {
  id: string; label: string | null; street: string; number: string; complement: string | null
  district: string; city: string; state: string; zipCode: string; reference: string | null; isDefault: boolean
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

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { items, subtotal, clearCart } = useCartStore()

  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [state, setState] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [needsChange, setNeedsChange] = useState(false)
  const [changeForValue, setChangeForValue] = useState('')
  const [notes, setNotes] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponResult, setCouponResult] = useState<{
    discount: number; label: string; type: string
  } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [returningCustomer, setReturningCustomer] = useState<string | null>(null)
  const phoneSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Conta global do cliente (opcional)
  const account = useCustomerAuth((s) => s.account)
  const isAuthenticated = useCustomerAuth((s) => s.isAuthenticated)
  const [saveAddress, setSaveAddress] = useState(true)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(false)

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => api.get<{ data: StoreData }>(`/store/${slug}`).then((r) => r.data.data),
  })

  // Endereços salvos da conta (somente se logado)
  const { data: savedAddresses } = useQuery({
    queryKey: ['customer-addresses', isAuthenticated],
    queryFn: () => api.get<{ data: SavedAddress[] }>('/customer/addresses').then((r) => r.data.data),
    enabled: isAuthenticated,
  })

  function applyAddress(a: SavedAddress) {
    setSelectedAddressId(a.id)
    setStreet(a.street); setNumber(a.number); setComplement(a.complement ?? '')
    setDistrict(a.district); setCity(a.city); setState(a.state); setZipCode(a.zipCode)
    setShowAddressForm(false)
  }

  // Pré-preenche nome/telefone com os dados da conta (sem sobrescrever o que o usuário digitou)
  useEffect(() => {
    if (!account) return
    setName((p) => p || account.name)
    setPhone((p) => p || maskPhone(account.phone))
  }, [account])

  // Seleciona o endereço padrão automaticamente
  useEffect(() => {
    if (orderType !== 'DELIVERY') return
    if (!savedAddresses || savedAddresses.length === 0) return
    if (selectedAddressId || showAddressForm) return
    const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0]
    if (def) applyAddress(def)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAddresses, orderType])

  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')

  // Máscara de telefone
  function maskPhone(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }

  // Busca endereço pelo CEP com feedback de erro
  async function fetchCep(cep: string) {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    setCepError('')
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await r.json()
      if (data.erro) {
        setCepError('CEP não encontrado. Preencha o endereço manualmente.')
      } else {
        setStreet(data.logradouro ?? '')
        setDistrict(data.bairro ?? '')
        setCity(data.localidade ?? '')
        setState(data.uf ?? '')
      }
    } catch {
      setCepError('Não foi possível buscar o CEP. Preencha o endereço manualmente.')
    } finally {
      setCepLoading(false)
    }
  }

  // Identifica cliente recorrente pelo telefone
  function handlePhoneChange(v: string) {
    const masked = maskPhone(v)
    setPhone(masked)
    setReturningCustomer(null)
    const clean = masked.replace(/\D/g, '')
    if (clean.length < 10) return
    if (phoneSearchTimeout.current) clearTimeout(phoneSearchTimeout.current)
    phoneSearchTimeout.current = setTimeout(async () => {
      try {
        const r = await api.get<{ data: { name: string } }>(`/store/${slug}/customer?phone=${clean}`)
        const foundName = r.data.data.name
        setName(foundName)
        setReturningCustomer(foundName)
      } catch { /* cliente novo — silencioso */ }
    }, 500)
  }

  // Valida cupom contra a API
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

  // Flag para evitar que o guardião de carrinho vazio dispare durante a submissão
  const submittingRef = useRef(false)
  const mounted = useMounted()

  // Redireciona se carrinho vazio (mas não enquanto estamos enviando o pedido)
  useEffect(() => {
    if (!mounted || submittingRef.current) return
    if (items.length === 0) router.replace(`/${slug}`)
  }, [mounted, items.length, slug, router])

  // Evita mismatch de hidratação: o carrinho vem do localStorage (só existe no cliente)
  if (!mounted) return null
  if (items.length === 0 && !submittingRef.current) return null

  // Skeleton enquanto carrega dados da loja
  if (storeLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
          <div className="mx-auto max-w-xl px-4 flex items-center gap-3 py-3">
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            <div className="h-5 w-40 rounded bg-muted animate-pulse" />
          </div>
        </header>
        <div className="mx-auto max-w-xl px-4 py-5 space-y-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      </div>
    )
  }

  const cartSubtotal = subtotal()
  const districtAreas = store?.deliveryAreas.filter((a) => a.type === 'DISTRICT') ?? []
  const hasDistrictConfig = districtAreas.length > 0

  // Calcula taxa de entrega com base nas áreas configuradas
  function calcDeliveryFee(): { fee: number; matched: boolean; areaError: string } {
    if (orderType === 'PICKUP') return { fee: 0, matched: true, areaError: '' }
    const areas = store?.deliveryAreas ?? []
    if (areas.length === 0) return { fee: 5.00, matched: true, areaError: '' }

    if (hasDistrictConfig && district.trim()) {
      const match = districtAreas.find(
        (a) => a.district?.toLowerCase().trim() === district.toLowerCase().trim(),
      )
      if (match) {
        const isFree = match.freeFrom != null && cartSubtotal >= match.freeFrom
        return { fee: isFree ? 0 : Number(match.fee), matched: true, areaError: '' }
      }
      return { fee: 0, matched: false, areaError: 'Não entregamos neste bairro' }
    }

    // Sem área do tipo DISTRICT — usa raio ou fallback
    const radiusArea = areas.find((a) => a.type === 'RADIUS')
    if (radiusArea) {
      const isFree = radiusArea.freeFrom != null && cartSubtotal >= radiusArea.freeFrom
      return { fee: isFree ? 0 : Number(radiusArea.fee), matched: true, areaError: '' }
    }
    return { fee: 5.00, matched: true, areaError: '' }
  }

  const { fee: deliveryFee, matched: districtMatched, areaError } = calcDeliveryFee()
  const effectiveDeliveryFee = couponResult?.type === 'FREE_DELIVERY' ? 0 : deliveryFee
  const total = Math.max(0, cartSubtotal - (couponResult?.discount ?? 0) + effectiveDeliveryFee)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!paymentMethod) { setError('Selecione uma forma de pagamento'); return }
    if (paymentMethod === 'CASH' && needsChange) {
      const v = parseFloat(changeForValue.replace(',', '.'))
      if (isNaN(v) || v < total) { setError(`Informe o valor do troco (maior ou igual ao total ${currency(total)})`); return }
    }
    const minOrder = Number(store?.minOrderValue ?? 0)
    if (minOrder > 0 && cartSubtotal < minOrder) {
      setError(`Pedido mínimo de ${currency(minOrder)}`)
      return
    }
    if (orderType === 'DELIVERY' && (!street || !number || !district || !city)) {
      setError('Preencha o endereço de entrega')
      return
    }
    if (orderType === 'DELIVERY' && !districtMatched) {
      setError(areaError || 'Não entregamos neste bairro')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/orders', {
        storeSlug: slug,
        type: orderType,
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
        address: orderType === 'DELIVERY' ? { street, number, complement, district, city, state, zipCode } : undefined,
        paymentMethod,
        changeFor: paymentMethod === 'CASH' && needsChange && changeForValue
          ? parseFloat(changeForValue.replace(',', '.'))
          : undefined,
        notes,
        couponCode: couponCode.trim() || undefined,
        scheduledTo: isScheduled && scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
          : undefined,
        // Salva o endereço na conta só se for novo (não veio da agenda) e o usuário marcou a opção
        saveAddress: isAuthenticated && orderType === 'DELIVERY' && saveAddress && !selectedAddressId,
      })

      // Guarda nome/telefone para o convite de cadastro na tela de acompanhamento (visitante)
      try {
        sessionStorage.setItem('customer_prefill', JSON.stringify({ name, phone: phone.replace(/\D/g, '') }))
      } catch { /* sessionStorage indisponível — ignora */ }

      submittingRef.current = true
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
          <h1 className="font-bold text-base">Finalizar pedido</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-xl px-4 py-5 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Conta global do cliente */}
        {!isAuthenticated ? (
          <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm flex items-center justify-between gap-2">
            <span className="text-foreground">Já tem conta? Entre para usar seus dados salvos.</span>
            <Link href={`/${slug}/entrar?redirect=${encodeURIComponent(`/${slug}/checkout`)}`} className="text-primary font-semibold hover:underline whitespace-nowrap">Entrar</Link>
          </div>
        ) : (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700">
            Conectado como <span className="font-semibold">{account?.name}</span>
          </div>
        )}

        {/* Tipo do pedido */}
        <div className="rounded-2xl bg-white border p-4 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Como quer receber?</p>
          <div className="grid grid-cols-2 gap-2">
            {(['DELIVERY', 'PICKUP'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setOrderType(t)}
                className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${orderType === t ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                {t === 'DELIVERY' ? '🛵 Entrega' : '🏠 Retirada'}
              </button>
            ))}
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
          <Input label="WhatsApp *" placeholder="(11) 99999-9999" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} required type="tel" inputMode="numeric" />
          <Input label="Nome *" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        {/* Endereço */}
        {orderType === 'DELIVERY' && (
          <div className="rounded-2xl bg-white border p-4 space-y-3">
            <p className="font-semibold text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Endereço de entrega</p>

            {/* Endereços salvos da conta global */}
            {isAuthenticated && savedAddresses && savedAddresses.length > 0 && !showAddressForm && (
              <div className="space-y-2">
                {savedAddresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => applyAddress(a)}
                    className={`w-full text-left rounded-xl border p-3 transition ${selectedAddressId === a.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                  >
                    <p className="text-sm font-medium text-foreground">
                      {a.label ? `${a.label} · ` : ''}{a.street}, {a.number}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.district} — {a.city}/{a.state}</p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setSelectedAddressId(null); setShowAddressForm(true); setStreet(''); setNumber(''); setComplement(''); setDistrict(''); setCity(''); setState(''); setZipCode('') }}
                  className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline pt-1"
                >
                  <Plus className="h-4 w-4" /> Usar outro endereço
                </button>
              </div>
            )}

            {(!isAuthenticated || !savedAddresses || savedAddresses.length === 0 || showAddressForm) && (
            <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">CEP</label>
              <div className="relative">
                <input
                  placeholder="00000-000"
                  value={zipCode}
                  onChange={(e) => { setZipCode(e.target.value); fetchCep(e.target.value) }}
                  inputMode="numeric"
                  className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {cepLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Buscando...</span>}
              </div>
              {cepError && <p className="text-xs text-amber-600">{cepError}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input label="Rua *" placeholder="Nome da rua" value={street} onChange={(e) => setStreet(e.target.value)} required />
              </div>
              <Input label="Número *" placeholder="123" value={number} onChange={(e) => setNumber(e.target.value)} required />
            </div>
            <Input label="Complemento" placeholder="Apto, bloco..." value={complement} onChange={(e) => setComplement(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              {/* Bairro — dropdown se houver áreas por bairro, senão texto livre */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">Bairro *</label>
                {hasDistrictConfig ? (
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione o bairro</option>
                    {districtAreas.map((a) => (
                      <option key={a.id} value={a.district ?? ''}>
                        {a.district}{a.name ? ` (${a.name})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Bairro"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                  />
                )}
                {/* Feedback da taxa */}
                {orderType === 'DELIVERY' && district && (
                  <p className={`text-xs mt-0.5 ${districtMatched ? 'text-green-600' : 'text-red-600'}`}>
                    {areaError || (deliveryFee === 0 ? 'Entrega grátis para este bairro!' : `Taxa: ${currency(deliveryFee)}`)}
                  </p>
                )}
              </div>
              <Input label="Cidade *" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            </>
            )}

            {/* Salvar endereço na conta (logado, digitando um endereço novo) */}
            {isAuthenticated && (showAddressForm || !savedAddresses || savedAddresses.length === 0) && (
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-primary/40" />
                <span className="text-sm text-foreground">Salvar este endereço na minha conta</span>
              </label>
            )}
          </div>
        )}

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
            // Fallback quando loja não configurou formas de pagamento ainda
            <div className="grid grid-cols-2 gap-2">
              {[{ type: 'PIX', label: '💲 Pix' }, { type: 'CASH', label: '💵 Dinheiro' }, { type: 'CREDIT_CARD', label: '💳 Cartão Crédito' }, { type: 'DEBIT_CARD', label: '💳 Cartão Débito' }].map((pm) => (
                <button key={pm.type} type="button" onClick={() => setPaymentMethod(pm.type)}
                  className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${paymentMethod === pm.type ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  {pm.label}
                </button>
              ))}
            </div>
          )}

          {/* Troco — só para Dinheiro */}
          {paymentMethod === 'CASH' && (
            <div className="rounded-xl bg-muted/40 border p-3 space-y-2.5">
              <p className="text-xs font-medium text-foreground">Precisa de troco?</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNeedsChange(false)}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors ${!needsChange ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  Não preciso
                </button>
                <button type="button" onClick={() => setNeedsChange(true)}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors ${needsChange ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  Sim, troco
                </button>
              </div>
              {needsChange && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Troco para quanto?</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <input
                      value={changeForValue}
                      onChange={(e) => setChangeForValue(e.target.value.replace(/[^\d.,]/g, ''))}
                      placeholder="50,00"
                      inputMode="decimal"
                      className="h-10 w-full rounded-xl border border-input bg-white pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {changeForValue && (() => {
                    const v = parseFloat(changeForValue.replace(',', '.'))
                    if (isNaN(v) || v < total) return <p className="text-xs text-red-600">Informe um valor maior ou igual ao total ({currency(total)}).</p>
                    return <p className="text-xs text-green-600 font-medium">Seu troco: {currency(v - total)}</p>
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cupom de desconto */}
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
          {couponError && (
            <p className="text-xs text-red-600 px-1">{couponError}</p>
          )}
        </div>

        {/* Agendamento */}
        <div className="rounded-2xl bg-white border p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} className="h-4 w-4 rounded" />
            <div>
              <p className="font-semibold text-sm">Agendar para depois</p>
              <p className="text-xs text-muted-foreground">Escolha data e horário para receber</p>
            </div>
          </label>
          {isScheduled && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">Data</label>
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-10 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">Horário</label>
                <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                  className="h-10 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          )}
        </div>

        {/* Itens do carrinho */}
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
              <span>
                {couponResult?.type === 'FREE_DELIVERY' ? (
                  <>
                    <span className="line-through mr-1">{deliveryFee === 0 ? 'Grátis' : currency(deliveryFee)}</span>
                    <span className="text-green-600 font-semibold">Grátis</span>
                  </>
                ) : (
                  effectiveDeliveryFee === 0 ? 'Grátis' : currency(effectiveDeliveryFee)
                )}
              </span>
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
