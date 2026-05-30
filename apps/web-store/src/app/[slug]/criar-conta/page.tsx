'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { useCustomerAuth } from '@/store/customer-auth'

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function CriarContaPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const register = useCustomerAuth((s) => s.register)

  const [redirect, setRedirect] = useState(`/${slug}/minha-conta`)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
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
    if (password.length < 6) { setError('A senha deve ter ao menos 6 caracteres'); return }
    setLoading(true)
    try {
      await register({
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        email: email.trim() || undefined,
        password,
      })
      router.push(redirect)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Não foi possível criar a conta'
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
          <h1 className="font-bold text-base">Criar conta</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="bg-white rounded-2xl border p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <UserPlus className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold">Crie sua conta</h2>
            <p className="text-sm text-muted-foreground">Uma conta para pedir em qualquer loja, com seus endereços salvos</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
              required
              minLength={2}
              className="w-full h-11 rounded-xl border px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              inputMode="numeric"
              autoComplete="tel"
              required
              className="w-full h-11 rounded-xl border px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail (opcional)"
              autoComplete="email"
              className="w-full h-11 rounded-xl border px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha (mín. 6 caracteres)"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full h-11 rounded-xl border px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim() || phone.replace(/\D/g, '').length < 10 || password.length < 6}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href={`/${slug}/entrar?redirect=${encodeURIComponent(redirect)}`} className="text-primary font-medium hover:underline">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
