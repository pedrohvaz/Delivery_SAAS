'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, CreditCard, ExternalLink, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useOrders } from '@/hooks/use-orders'
import { currency } from '@/lib/utils'

interface HeaderProps {
  title: string
}

type Open = 'bell' | 'user' | null

/** Fecha o menu aberto ao tocar fora ou apertar Esc. */
function useDismiss(open: Open, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onDown = (e: MouseEvent | TouchEvent) => { if (!ref.current?.contains(e.target as Node)) close() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open, close, ref])
}

export function Header({ title }: HeaderProps) {
  const { user, store, logout } = useAuthStore()
  const router = useRouter()
  const [open, setOpen] = useState<Open>(null)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(open, () => setOpen(null), ref)

  // Pedidos aguardando confirmação (mesma consulta da tela de pedidos — fica em cache)
  const { data: orders = [] } = useOrders()
  const pending = orders.filter((o) => o.status === 'PENDING')

  const storeUrl = `${process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3001'}/${store?.slug ?? ''}`
  const toggle = (which: Exclude<Open, null>) => setOpen((v) => (v === which ? null : which))

  function handleLogout() {
    setOpen(null)
    logout()
    router.push('/login')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
      <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>

      <div ref={ref} className="relative flex items-center gap-1 sm:gap-3">
        {/* Notificações: pedidos pendentes */}
        <button
          type="button"
          onClick={() => toggle('bell')}
          aria-label={pending.length ? `${pending.length} pedido(s) pendente(s)` : 'Notificações'}
          aria-expanded={open === 'bell'}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {pending.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {pending.length > 9 ? '9+' : pending.length}
            </span>
          )}
        </button>

        {/* Usuário */}
        <button
          type="button"
          onClick={() => toggle('user')}
          aria-expanded={open === 'user'}
          aria-haspopup="menu"
          className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm transition-colors hover:bg-accent"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="hidden max-w-[120px] truncate text-sm font-medium text-foreground min-[400px]:inline">
            {user?.name ?? 'Usuário'}
          </span>
          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open === 'user' ? 'rotate-180' : ''}`} />
        </button>

        {open === 'bell' && (
          <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-xl border bg-card p-2 shadow-xl">
            <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {pending.length ? `${pending.length} pedido(s) aguardando confirmação` : 'Nenhum pedido pendente'}
            </p>
            {pending.slice(0, 5).map((o) => (
              <Link
                key={o.id}
                href="/dashboard/pedidos"
                onClick={() => setOpen(null)}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-sm hover:bg-muted"
              >
                <span className="truncate"><strong>#{o.orderNumber}</strong> · {o.customer?.name ?? 'Cliente'}</span>
                <span className="shrink-0 font-semibold text-primary">{currency(Number(o.total))}</span>
              </Link>
            ))}
            <Link
              href="/dashboard/pedidos"
              onClick={() => setOpen(null)}
              className="mt-1 block rounded-lg px-2 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/5"
            >
              Ver todos os pedidos
            </Link>
          </div>
        )}

        {open === 'user' && (
          <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-xl border bg-card p-1.5 shadow-xl">
            <div className="border-b px-3 pb-2.5 pt-2">
              <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              {store?.name && <p className="mt-1 truncate text-xs text-muted-foreground">{store.name}</p>}
            </div>
            <a role="menuitem" href={storeUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(null)}
              className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-muted">
              <ExternalLink className="h-4 w-4 text-muted-foreground" /> Ver minha loja
            </a>
            <Link role="menuitem" href="/dashboard/configuracoes" onClick={() => setOpen(null)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-muted">
              <Settings className="h-4 w-4 text-muted-foreground" /> Configurações
            </Link>
            <Link role="menuitem" href="/dashboard/assinatura" onClick={() => setOpen(null)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-muted">
              <CreditCard className="h-4 w-4 text-muted-foreground" /> Assinatura
            </Link>
            <button role="menuitem" type="button" onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/5">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
