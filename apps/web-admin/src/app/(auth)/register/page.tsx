'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planSlug = searchParams.get('plan')
  const register = useAuthStore((s) => s.register)

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

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
      await register({ storeName, storeSlug, name, email, password, phone })
      router.push(planSlug && planSlug !== 'gratis' ? `/dashboard/assinatura?checkout=${planSlug}` : '/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao criar conta'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-4xl">🛵</div>
          <h1 className="text-2xl font-bold text-foreground">Criar minha loja</h1>
          <p className="text-sm text-muted-foreground">
            Passo {step} de 2 — {step === 1 ? 'Dados da loja' : 'Seus dados'}
          </p>
        </div>

        {/* Barra de progresso */}
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
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
                    <p className="text-xs text-muted-foreground">
                      Sua loja ficará em:{' '}
                      <span className="font-medium text-primary">/{storeSlug}</span>
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
                    Criar loja
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
