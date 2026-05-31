'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, LogIn } from 'lucide-react'
import { useCustomerAuth } from '@/store/customer-auth'

interface LoginFormProps {
  defaultRedirect: string
  registerHref: string // base (o redirect é anexado)
  guestHref: string
}

export function LoginForm({ defaultRedirect, registerHref, guestHref }: LoginFormProps) {
  const router = useRouter()
  const login = useCustomerAuth((s) => s.login)

  const [redirect, setRedirect] = useState(defaultRedirect)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('redirect')
    if (r) setRedirect(r)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(identifier.trim(), password)
      router.push(redirect)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Não foi possível entrar'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-xl px-4 flex items-center gap-3 py-3">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-base">Entrar</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="bg-white rounded-2xl border p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <LogIn className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">Sua conta vale para todas as lojas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Telefone ou e-mail"
              autoComplete="username"
              required
              className="w-full h-11 rounded-xl border px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              autoComplete="current-password"
              required
              className="w-full h-11 rounded-xl border px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !identifier.trim() || !password}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link href={`${registerHref}?redirect=${encodeURIComponent(redirect)}`} className="text-primary font-medium hover:underline">
              Criar conta
            </Link>
          </div>
          <Link href={guestHref} className="block text-center text-xs text-muted-foreground hover:underline">
            Continuar como visitante
          </Link>
        </div>
      </div>
    </div>
  )
}
