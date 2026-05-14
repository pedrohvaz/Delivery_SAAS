'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@delivery/ui'
import { useAuthStore } from '@/store/auth'
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  MapPin,
  Clock,
  Users,
  Bike,
  Tag,
  Package,
  BarChart2,
  Settings,
  LogOut,
  Store,
  ChefHat,
  ExternalLink,
  Grid3X3,
  Receipt,
  DollarSign,
  Zap,
  Percent,
  Star,
  Gift,
  CreditCard,
} from 'lucide-react'
import { useStockAlerts } from '@/hooks/use-stock'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pedidos', href: '/dashboard/pedidos', icon: ShoppingBag },
  { label: 'Caixa / PDV', href: '/dashboard/caixa', icon: Receipt },
  { label: 'Financeiro', href: '/dashboard/financeiro', icon: DollarSign },
  { label: 'Cardápio', href: '/dashboard/cardapio', icon: UtensilsCrossed },
  { label: 'Estoque', href: '/dashboard/estoque', icon: Package },
  { label: 'Áreas de Entrega', href: '/dashboard/areas', icon: MapPin },
  { label: 'Horários', href: '/dashboard/horarios', icon: Clock },
  { label: 'Clientes', href: '/dashboard/clientes', icon: Users },
  { label: 'Entregadores', href: '/dashboard/entregadores', icon: Bike },
  { label: 'Promoções', href: '/dashboard/promocoes', icon: Percent },
  { label: 'Cupons', href: '/dashboard/cupons', icon: Tag },
  { label: 'Fidelidade', href: '/dashboard/fidelidade', icon: Star },
  { label: 'Sorteios', href: '/dashboard/sorteios', icon: Gift },
  { label: 'Mesas', href: '/dashboard/mesas', icon: Grid3X3 },
  { label: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart2 },
  { label: 'Automação', href: '/dashboard/automacao', icon: Zap },
  { label: 'Assinatura', href: '/dashboard/assinatura', icon: CreditCard },
  { label: 'Configurações', href: '/dashboard/configuracoes', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { store, logout } = useAuthStore()
  const { data: stockAlerts = [] } = useStockAlerts()

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card">
      {/* Logo / Nome da loja */}
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{store?.name ?? 'Minha Loja'}</p>
          <p className="truncate text-xs text-muted-foreground">/{store?.slug ?? ''}</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const badge = href === '/dashboard/estoque' && stockAlerts.length > 0
            ? stockAlerts.length
            : null
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* KDS + Logout */}
      <div className="border-t p-2 space-y-0.5">
        <Link href="/kds" target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <ChefHat className="h-4 w-4 shrink-0" />
          <span className="flex-1">Tela da Cozinha</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground/50" />
        </Link>
        {store?.slug && (
          <Link href={`${process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3001'}/${store.slug}`} target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Store className="h-4 w-4 shrink-0" />
            <span className="flex-1">Vitrine da Loja</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground/50" />
          </Link>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
