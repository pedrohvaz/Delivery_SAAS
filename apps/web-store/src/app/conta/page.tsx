'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, LogIn, UserPlus, Star } from 'lucide-react'
import { useCustomerAuth } from '@/store/customer-auth'
import { AccountDashboard } from '@/components/account/AccountDashboard'

export default function ContaPage() {
  const router = useRouter()
  const isAuthenticated = useCustomerAuth((s) => s.isAuthenticated)
  const redirect = '/conta'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-xl px-4 flex items-center gap-3 py-3">
          <button onClick={() => router.push('/')} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-base">Minha Conta</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6 space-y-5">
        {isAuthenticated ? (
          <AccountDashboard />
        ) : (
          <div className="bg-white rounded-2xl border p-6 space-y-4 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Star className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold">Sua conta em todas as lojas</h2>
              <p className="text-sm text-muted-foreground">Entre para acompanhar seus pedidos, ver o histórico e gerenciar seus endereços salvos.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/conta/entrar?redirect=${encodeURIComponent(redirect)}`}
                className="flex items-center justify-center gap-1.5 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition">
                <LogIn className="h-4 w-4" /> Entrar
              </Link>
              <Link href={`/conta/criar-conta?redirect=${encodeURIComponent(redirect)}`}
                className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-primary text-primary text-sm font-bold hover:bg-primary/5 transition">
                <UserPlus className="h-4 w-4" /> Criar conta
              </Link>
            </div>
            <Link href="/" className="block text-center text-xs text-muted-foreground hover:underline">Voltar para as lojas</Link>
          </div>
        )}
      </div>
    </div>
  )
}
