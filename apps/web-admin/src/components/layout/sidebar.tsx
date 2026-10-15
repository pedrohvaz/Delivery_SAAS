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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useStockAlerts } from '@/hooks/use-stock'
import { StoreLogo } from './store-logo'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pedidos', href: '/dashboard/pedidos', icon: ShoppingBag },
  { label: 'Caixa / PDV', href: '/dashboard/caixa', icon: Receipt },
  { label: 'Financeiro', href: '/dashboard/financeiro', icon: DollarSign },
  { label: 'Cardápio', href: '/dashboard/cardapio', icon: UtensilsCrossed },
  // { label: 'Imagem do Cardápio', href: '/dashboard/gerar-cardapio', icon: ImageIcon }, // TODO: reativar quando o serviço Python (cardápio) estiver em produção
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

/**
 * Menu lateral. No computador pode ser recolhido (só ícones, o nome aparece ao passar o mouse);
 * `onToggle` só é passado no computador — no celular o menu é a gaveta que abre pelo ☰.
 */
export function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  const { store, logout } = useAuthStore()
  const { data: stockAlerts = [] } = useStockAlerts()
  const item = cn('flex items-center rounded-lg py-2 text-sm transition-colors', collapsed ? 'justify-center px-0' : 'gap-3 px-3')

  return (
    <aside className={cn('flex h-screen flex-col border-r bg-card transition-[width] duration-200', collapsed ? 'w-16' : 'w-60')}>
      {/* Logo / Nome da loja */}
      <div className={cn('flex items-center border-b py-4', collapsed ? 'flex-col gap-2 px-2' : 'gap-3 px-4')}>
        <StoreLogo />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{store?.name ?? 'Minha Loja'}</p>
            <p className="truncate text-xs text-muted-foreground">/{store?.slug ?? ''}</p>
          </div>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            aria-label={collapsed ? 'Mostrar menu' : 'Recolher menu'}
            title={collapsed ? 'Mostrar menu (Ctrl+B)' : 'Recolher menu (Ctrl+B)'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
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
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              className={cn(
                item,
                'relative',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
              {badge && (
                <span className={cn('flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground',
                  collapsed && 'absolute right-1.5 top-0.5')}>
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* KDS + Logout */}
      <div className="border-t p-2 space-y-0.5">
        <Link href="/kds" target="_blank" title={collapsed ? 'Tela da Cozinha' : undefined} aria-label={collapsed ? 'Tela da Cozinha' : undefined}
          className={cn(item, 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
          <ChefHat className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="flex-1">Tela da Cozinha</span>}
          {!collapsed && <ExternalLink className="h-3 w-3 text-muted-foreground/50" />}
        </Link>
        {store?.slug && (
          <Link href={`${process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3001'}/${store.slug}`} target="_blank"
            title={collapsed ? 'Vitrine da Loja' : undefined} aria-label={collapsed ? 'Vitrine da Loja' : undefined}
            className={cn(item, 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
            <Store className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1">Vitrine da Loja</span>}
            {!collapsed && <ExternalLink className="h-3 w-3 text-muted-foreground/50" />}
          </Link>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Sair' : undefined}
          aria-label={collapsed ? 'Sair' : undefined}
          className={cn(item, 'w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive')}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  )
}
