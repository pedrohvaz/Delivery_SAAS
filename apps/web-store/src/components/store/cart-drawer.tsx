'use client'

import { useRouter } from 'next/navigation'
import { X, Trash2, Plus, Minus, ShoppingBag, ChevronRight, Tag } from 'lucide-react'
import { useCartStore, itemTotal } from '@/store/cart'
import { currency } from '@/lib/utils'

interface Props { slug: string; checkoutHref?: string }

export function CartDrawer({ slug, checkoutHref }: Props) {
  const router = useRouter()
  const { isOpen, closeCart, items, removeItem, updateQty, subtotal } = useCartStore()
  const total = subtotal()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeCart} />

      <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <ShoppingBag className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Sua sacola</h2>
              {items.length > 0 && (
                <p className="text-xs text-muted-foreground">{items.reduce((s, i) => s + i.quantity, 0)} {items.length === 1 ? 'item' : 'itens'}</p>
              )}
            </div>
          </div>
          <button onClick={closeCart}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-3xl">🛒</div>
              <div>
                <p className="font-semibold text-foreground">Sacola vazia</p>
                <p className="text-sm text-muted-foreground mt-1">Adicione itens do cardápio</p>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.cartItemId}
                className="flex gap-3 rounded-2xl border bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                {/* Foto */}
                {item.imageUrl && (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground leading-tight">{item.name}</p>
                  {item.addons.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {item.addons.map((a) => a.optionName).join(' · ')}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-1">"{item.notes}"</p>
                  )}
                  <p className="text-sm font-bold text-primary mt-1">{currency(itemTotal(item))}</p>
                </div>

                <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                  <button onClick={() => removeItem(item.cartItemId)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-0.5 rounded-xl border bg-muted/30 p-0.5">
                    <button onClick={() => updateQty(item.cartItemId, item.quantity - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white transition">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.cartItemId, item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white transition">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-4 py-4 space-y-3 bg-white">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold text-foreground text-base">{currency(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">Taxas de entrega calculadas no checkout</p>
            <button
              onClick={() => { closeCart(); router.push(checkoutHref ?? `/${slug}/checkout`) }}
              className="w-full flex items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition active:scale-[0.98]"
            >
              <span>Ir para o checkout</span>
              <div className="flex items-center gap-1">
                <span>{currency(total)}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
