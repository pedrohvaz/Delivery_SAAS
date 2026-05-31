'use client'

import { usePathname, useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, ShoppingBag, ReceiptText, User } from 'lucide-react'
import { useCartStore } from '@/store/cart'

// Rotas onde o menu inferior NÃO deve aparecer (fluxos de tela cheia / CTA próprio embaixo)
const HIDE_ON = ['/checkout', '/pagar', '/mesa', '/garcom', '/entrar', '/criar-conta']

export function StoreBottomNav() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const pathname = usePathname() || ''
  const router = useRouter()
  const count = useCartStore((s) => s.totalItems())
  const openCart = useCartStore((s) => s.openCart)

  if (!slug) return null
  if (HIDE_ON.some((p) => pathname.includes(p))) return null

  const base = `/${slug}`
  const isMenu = pathname === base
  const isPedidos = pathname.includes('/pedido/')
  const isPerfil = pathname.includes('/minha-conta')

  const openSacola = () => { openCart(); router.push(base) }

  const tab = 'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 select-none'
  const lbl = (active: boolean) => `text-[11px] font-semibold ${active ? 'opacity-100' : 'opacity-70'}`
  const icn = (active: boolean) => `h-5 w-5 ${active ? 'opacity-100' : 'opacity-70'}`

  return (
    <>
      {/* Espaçador para o conteúdo não ficar atrás da barra fixa */}
      <div className="h-16 lg:hidden" aria-hidden />
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-primary text-primary-foreground border-t border-black/10 shadow-[0_-2px_10px_rgba(0,0,0,0.12)]">
        <div className="mx-auto max-w-xl flex items-stretch">
          <Link href={base} className={tab}>
            <Home className={icn(isMenu)} />
            <span className={lbl(isMenu)}>Cardápio</span>
          </Link>

          <button type="button" onClick={openSacola} className={`relative ${tab}`}>
            {count > 0 && (
              <span className="absolute top-1.5 left-1/2 translate-x-2 h-4 min-w-[16px] px-1 rounded-full bg-white text-primary text-[9px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
            <ShoppingBag className={icn(false)} />
            <span className={lbl(false)}>Sacola</span>
          </button>

          <Link href={`${base}/minha-conta`} className={tab}>
            <ReceiptText className={icn(isPedidos)} />
            <span className={lbl(isPedidos)}>Pedidos</span>
          </Link>

          <Link href={`${base}/minha-conta`} className={tab}>
            <User className={icn(isPerfil)} />
            <span className={lbl(isPerfil)}>Perfil</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
