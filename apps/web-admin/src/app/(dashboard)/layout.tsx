'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { StoreLogo } from '@/components/layout/store-logo'
import { StoreTheme } from '@/hooks/use-store-theme'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const store = useAuthStore((s) => s.store)
  const [hydrated, setHydrated] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    // Se já hidratou antes deste efeito rodar
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
    } else {
      useAuthStore.getState().fetchMe()
    }
  }, [hydrated, isAuthenticated, router])

  if (!hydrated || !isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Cores do painel = cores escolhidas para a vitrine da loja */}
      <StoreTheme />
      {/* Sidebar fixa no desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Sidebar como drawer no mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          {/* Qualquer clique dentro (ex.: link do menu) fecha o drawer após navegar */}
          <div className="relative z-10 h-full w-64 max-w-[80vw]" onClick={() => setSidebarOpen(false)}>
            <Sidebar />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Barra superior mobile com hambúrguer */}
        <header className="md:hidden flex items-center gap-3 border-b bg-card px-4 py-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-white"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <StoreLogo size="sm" />
            <span className="truncate text-sm font-semibold">{store?.name ?? 'Minha Loja'}</span>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}
