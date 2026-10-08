'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'
import { cn } from '@delivery/ui'
import { Plus, Minus, ShoppingCart, Send, Check, Trash2 } from 'lucide-react'

interface Product { id: string; name: string; price: number; imageUrl: string | null; description: string | null }
interface Category { id: string; name: string; products: Product[] }
interface TableData { tableId: string; tableNumber: number; tableLabel: string | null; store: { name: string } }

interface CartItem { productId: string; name: string; price: number; qty: number; notes: string }

function cartId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 5)}` }

export default function GarcomPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>()
  const [cart, setCart] = useState<(CartItem & { id: string })[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'menu' | 'cart'>('menu')

  const { data: tableData } = useQuery<{ data: TableData }>({
    queryKey: ['table', token],
    queryFn: () => api.get(`/store/table/${token}`).then(r => r.data),
  })

  const { data: menu = [] } = useQuery<Category[]>({
    queryKey: ['menu-garcom', slug],
    queryFn: () => api.get<{ data: Category[] }>(`/store/${slug}/menu`).then(r => r.data.data),
  })

  const table = tableData?.data
  const categories = menu.filter(c => c.products.length > 0)
  const activeCatId = activeCategory ?? categories[0]?.id ?? ''
  const products = categories.find(c => c.id === activeCatId)?.products ?? []
  const totalItems = cart.reduce((s, i) => s + i.qty, 0)
  const subtotal = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0)

  function addItem(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id && !i.notes)
      if (existing) return prev.map(i => i.id === existing.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: cartId(), productId: product.id, name: product.name, price: Number(product.price), qty: 1, notes: '' }]
    })
  }

  function removeItem(id: string) { setCart(prev => prev.filter(i => i.id !== id)) }
  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0))
  }

  async function handleSend() {
    if (!cart.length || !table) return
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/orders', {
        storeSlug: slug,
        type: 'TABLE',
        tableId: table.tableId,
        items: cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.qty, notes: i.notes || undefined, addons: [] })),
        paymentMethod: 'CASH',
        notes: notes || undefined,
      })
      setSuccess(data.data.orderNumber)
      setCart([])
      setNotes('')
      setView('menu')
      setTimeout(() => setSuccess(null), 4000)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao enviar pedido')
    } finally {
      setLoading(false)
    }
  }

  if (!table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2 p-8">
          <div className="text-5xl">🪑</div>
          <p className="font-bold text-xl">Mesa não encontrada</p>
          <p className="text-muted-foreground text-sm">Token inválido ou expirado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-4 sticky top-0 z-30 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70">🍽️ {table.store.name}</p>
            <h1 className="text-lg font-black">Mesa {table.tableNumber}{table.tableLabel ? ` · ${table.tableLabel}` : ''}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('menu')}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition', view === 'menu' ? 'bg-white text-primary' : 'bg-white/20 text-white')}>
              Cardápio
            </button>
            <button onClick={() => setView('cart')}
              className={cn('relative px-3 py-1.5 rounded-xl text-xs font-bold transition', view === 'cart' ? 'bg-white text-primary' : 'bg-white/20 text-white')}>
              Pedido
              {totalItems > 0 && <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-black flex items-center justify-center">{totalItems}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Success */}
      {success && (
        <div className="bg-green-500 text-white px-4 py-3 flex items-center gap-2 text-sm font-semibold">
          <Check className="h-4 w-4" /> Pedido #{success} enviado para a cozinha!
        </div>
      )}

      {view === 'menu' ? (
        <div className="flex flex-col flex-1">
          {/* Categorias */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none bg-white border-b">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap',
                  activeCatId === cat.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Produtos */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-20">
            {products.map(product => {
              const inCart = cart.find(i => i.productId === product.id)
              return (
                <div key={product.id} className="bg-white rounded-2xl border flex items-center gap-3 p-3">
                  {product.imageUrl && (
                    <img loading="lazy" decoding="async" src={product.imageUrl} alt={product.name} className="h-14 w-14 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{product.name}</p>
                    {product.description && <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>}
                    <p className="text-sm font-bold text-primary mt-0.5">{currency(Number(product.price))}</p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(inCart.id, -1)} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                      <span className="w-5 text-center text-sm font-bold">{inCart.qty}</span>
                      <button onClick={() => updateQty(inCart.id, 1)} className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <button onClick={() => addItem(product)} className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Botão flutuante de carrinho */}
          {totalItems > 0 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-sm w-full px-4">
              <button onClick={() => setView('cart')}
                className="w-full bg-primary text-white rounded-2xl py-3.5 flex items-center justify-between px-5 shadow-lg shadow-primary/30 font-bold">
                <div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />{totalItems} ite{totalItems > 1 ? 'ns' : 'm'}</div>
                <span>{currency(subtotal)}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Carrinho / Enviar pedido */
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">Nenhum item adicionado</p>
                <button onClick={() => setView('menu')} className="text-primary text-sm font-medium hover:underline">Ir ao cardápio →</button>
              </div>
            ) : (
              <>
                <h2 className="font-bold text-lg">Itens do pedido</h2>
                {cart.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-xs text-primary font-bold">{currency(Number(item.price) * item.qty)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateQty(item.id, -1)} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                      <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                      <button onClick={() => removeItem(item.id)} className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 flex items-center justify-center ml-1"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}

                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Observação para a cozinha (opcional)..."
                  className="w-full rounded-2xl border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white" />

                <div className="bg-white rounded-2xl border p-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>{currency(subtotal)}</span></div>
                  <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">{currency(subtotal)}</span></div>
                </div>

                {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                <button onClick={handleSend} disabled={loading || !cart.length}
                  className="w-full bg-primary text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/30 disabled:opacity-50 text-sm">
                  <Send className="h-4 w-4" />
                  {loading ? 'Enviando...' : `Enviar Pedido · ${currency(subtotal)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
