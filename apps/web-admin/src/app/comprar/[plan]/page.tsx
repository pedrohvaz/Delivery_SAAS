'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePlans } from '@/hooks/use-plans'
import { api } from '@/lib/api'
import { ArrowLeft, Check, Loader2, ShieldCheck } from 'lucide-react'

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export default function ComprarPlanoPage() {
  const params = useParams<{ plan: string }>()
  const planSlug = params.plan

  const { data: plans = [], isLoading: plansLoading } = usePlans()
  const plan = plans.find((p: any) => p.slug === planSlug)

  const [step, setStep] = useState<1 | 2>(1)
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleStoreNameChange(value: string) {
    setStoreName(value)
    setStoreSlug(toSlug(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    setError('')
    setLoading(true)
    try {
      const successUrl = `${window.location.origin}/welcome?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${window.location.origin}/comprar/${planSlug}?canceled=1`

      const { data } = await api.post('/auth/start-paid-signup', {
        storeName, storeSlug, name, email, password, phone,
        planSlug, successUrl, cancelUrl,
      })

      const url = data.data?.checkoutUrl
      if (!url) throw new Error('URL de pagamento não retornada')
      window.location.href = url
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erro ao iniciar pagamento'
      setError(msg)
      setLoading(false)
    }
  }

  if (plansLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold">Plano não encontrado</p>
          <Link href="/" className="text-sm text-orange-500 hover:underline">
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-orange-500 transition mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Resumo do plano */}
          <div className="bg-gradient-to-br from-orange-500 to-pink-500 text-white rounded-3xl p-8 shadow-xl shadow-orange-200">
            <div className="space-y-2 mb-6">
              <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold">
                ⚡ Plano selecionado
              </span>
              <h2 className="text-3xl font-black">{plan.name}</h2>
              <p className="text-sm text-white/80">{plan.tagline}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-white/80">R$</span>
                <span className="text-6xl font-black">{Number(plan.monthlyPrice).toFixed(0)}</span>
                <span className="text-sm text-white/80">/mês</span>
              </div>
              <p className="text-xs text-white/70 mt-1">Cobrado mensalmente. Cancele quando quiser.</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 mb-6">
              <p className="text-sm font-bold mb-1">🎁 7 dias grátis</p>
              <p className="text-xs text-white/80">Você só será cobrado após o período de teste. Cancele antes e não paga nada.</p>
            </div>

            <ul className="space-y-2">
              {plan.features?.map((f: string) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-white" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-white/20 flex items-center gap-2 text-xs text-white/80">
              <ShieldCheck className="h-4 w-4" />
              Pagamento processado pelo Stripe · Cartão protegido
            </div>
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-3xl p-8 shadow-xl">
            <div className="space-y-1 mb-6">
              <h1 className="text-2xl font-black text-gray-900">Crie sua conta</h1>
              <p className="text-sm text-gray-500">
                Passo {step} de 2 — {step === 1 ? 'Dados da loja' : 'Seus dados'}
              </p>
            </div>

            <div className="h-1.5 w-full rounded-full bg-gray-100 mb-6">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 ? (
                <>
                  <Input
                    id="storeName"
                    label="Nome da loja"
                    placeholder="Ex: Açaí do João"
                    value={storeName}
                    onChange={(e) => handleStoreNameChange(e.target.value)}
                    required
                  />
                  <div className="flex flex-col gap-1.5">
                    <Input
                      id="storeSlug"
                      label="Endereço da loja"
                      placeholder="acai-do-joao"
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(toSlug(e.target.value))}
                      required
                    />
                    {storeSlug && (
                      <p className="text-xs text-gray-500">
                        Sua loja ficará em:{' '}
                        <span className="font-medium text-orange-500">/{storeSlug}</span>
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={!storeName || !storeSlug}>
                    Continuar →
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    id="name"
                    label="Seu nome"
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    id="email"
                    type="email"
                    label="E-mail"
                    placeholder="joao@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    id="password"
                    type="password"
                    label="Senha"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Input
                    id="phone"
                    type="tel"
                    label="WhatsApp (opcional)"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setStep(1)}
                      disabled={loading}
                    >
                      ← Voltar
                    </Button>
                    <Button type="submit" className="flex-1" loading={loading}>
                      {loading ? 'Indo para pagamento...' : 'Ir para o pagamento →'}
                    </Button>
                  </div>
                </>
              )}
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              Ao continuar, você será redirecionado para o Stripe para inserir os dados do cartão.
              Sua conta só é criada após o pagamento.
            </p>

            <p className="text-center text-sm text-gray-500 mt-4">
              Já tem conta?{' '}
              <Link href="/login" className="font-medium text-orange-500 hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
