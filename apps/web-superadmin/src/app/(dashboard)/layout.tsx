'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { LayoutDashboard, Store, ShoppingBag, UserCircle, LogOut, CreditCard, Users, ShieldCheck, BarChart2, Activity, Settings2, Receipt, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, admin, logout, fetchMe } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
    } else {
      fetchMe()
    }
  }, [hydrated, isAuthenticated, router, fetchMe])

  if (!hydrated || !isAuthenticated) return null

  const navItems = [
    { href: '/dashboard',                label: 'Visão Geral',      icon: LayoutDashboard },
    { href: '/dashboard/lojas',          label: 'Lojas',            icon: Store },
    { href: '/dashboard/pedidos',        label: 'Pedidos',          icon: ShoppingBag },
    { href: '/dashboard/usuarios',       label: 'Usuários',         icon: Users },
    { href: '/dashboard/admins',         label: 'Super Admins',     icon: ShieldCheck },
    { href: '/dashboard/relatorios',     label: 'Relatórios',       icon: BarChart2 },
    { href: '/dashboard/saude',          label: 'Saúde',            icon: Activity },
    { href: '/dashboard/planos',         label: 'Planos',           icon: CreditCard },
    { href: '/dashboard/assinaturas',    label: 'Assinaturas',      icon: Receipt },
    { href: '/dashboard/configuracoes',  label: 'Configurações',    icon: Settings2 },
    { href: '/dashboard/conta',          label: 'Minha Conta',      icon: UserCircle },
  ]

  const sidebar = (
      <aside className="w-60 h-full flex-shrink-0 border-r bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <span className="font-bold text-lg">⚙️ Super Admin</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{admin?.email}</div>
          <button
            onClick={() => { logout(); router.push('/login') }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar fixa no desktop */}
      <div className="hidden md:block h-full">{sidebar}</div>

      {/* Sidebar como drawer no mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full w-64 max-w-[80vw]" onClick={() => setSidebarOpen(false)}>{sidebar}</div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="md:hidden flex items-center gap-3 border-b bg-card px-4 py-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-white"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-sm">⚙️ Super Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
