'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function WelcomePage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const setAuth = useAuthStore.setState

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id')
    if (!sessionId) {
      setStatus('error')
      setErrorMsg('Sessão não encontrada na URL')
      return
    }

    let attempts = 0
    const maxAttempts = 12 // 12 tentativas x 2.5s = 30s no total

    async function claim() {
      attempts++
      try {
        const { data } = await api.post('/auth/claim-session', { sessionId })
        const { accessToken, refreshToken, user, store } = data.data
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        setAuth({ user, store, accessToken, refreshToken, isAuthenticated: true } as any)
        setStatus('ready')
        setTimeout(() => router.push('/dashboard'), 1500)
      } catch (err: any) {
        // 404 = conta ainda sendo criada pelo webhook, tenta de novo
        if (err?.response?.status === 404 && attempts < maxAttempts) {
          setTimeout(claim, 2500)
        } else {
          setStatus('error')
          setErrorMsg(
            err?.response?.data?.message ??
            'Não foi possível ativar sua conta. Tente fazer login.',
          )
        }
      }
    }

    claim()
  }, [router, setAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-pink-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
            <h1 className="text-2xl font-black text-gray-900">Ativando sua conta...</h1>
            <p className="text-sm text-gray-500">
              Pagamento confirmado! Estamos preparando seu painel. Isso leva alguns segundos.
            </p>
          </>
        )}

        {status === 'ready' && (
          <>
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Tudo pronto! 🎉</h1>
            <p className="text-sm text-gray-500">
              Sua conta foi criada e o plano está ativo. Redirecionando para o painel...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10 text-orange-500" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Quase lá</h1>
            <p className="text-sm text-gray-600">{errorMsg}</p>
            <p className="text-xs text-gray-500">
              Seu pagamento foi confirmado pelo Stripe. Se a conta não apareceu, faça login com o e-mail e senha que você cadastrou.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-3 text-sm font-bold text-white hover:shadow-lg transition"
            >
              Ir para o login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
