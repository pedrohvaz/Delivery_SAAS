'use client'

import { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'
import { cn } from '@delivery/ui'
import { StoreHeader } from '@/components/store/store-header'
import { ProductModal } from '@/components/store/product-modal'
import { CartDrawer } from '@/components/store/cart-drawer'
import { useCartStore, itemTotal } from '@/store/cart'
import { useMounted } from '@/hooks/use-mounted'
import { Plus, Search, X, ShoppingBag, Minus, Trash2 } from 'lucide-react'

interface AddonOption { id: string; name: string; price: number; isActive: boolean; position: number }
interface AddonGroup { id: string; name: string; min: number; max: number; required: boolean; options: AddonOption[] }
interface Product {
  id: string; name: string; description: string | null; price: number
  imageUrl: string | null; tags: string[]; availableFor: string
  stockControl: boolean; stockQty: number | null
  addonGroups: AddonGroup[]
}
interface Category { id: string; name: string; products: Product[] }
interface StoreData {
  id: string; name: string; slug: string; logoUrl: string | null
  description: string | null; isOpen: boolean; estimatedTime: number
  minOrderValue: number; timezone: string
  primaryColor: string; layoutStyle: string; bannerUrl: string | null
  address: string | null; number: string | null; district: string | null
  city: string | null; state: string | null
  facebookPixelId: string | null; googleTagManagerId: string | null
  storeNotice: string | null; storeNoticeType: string | null
  schedules: { dayOfWeek: number; openTime: string; closeTime: string }[]
}

const TAG_STYLES: Record<string, string> = {
  destaque:     'bg-amber-100 text-amber-700 border-amber-200',
  novo:         'bg-sky-100 text-sky-700 border-sky-200',
  vegano:       'bg-emerald-100 text-emerald-700 border-emerald-200',
  picante:      'bg-red-100 text-red-700 border-red-200',
  'sem glúten': 'bg-violet-100 text-violet-700 border-violet-200',
}

const ALL_TAGS = ['destaque', 'novo', 'vegano', 'picante', 'sem glúten']

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)

  const { data: store, isLoading: storeLoading, error: storeError } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => api.get<{ data: StoreData }>(`/store/${slug}`).then((r) => r.data.data),
  })

  const { data: menu = [], isLoading: menuLoading } = useQuery({
    queryKey: ['menu', slug],
    queryFn: () => api.get<{ data: Category[] }>(`/store/${slug}/menu`).then((r) => r.data.data),
    enabled: !!store,
  })

  // Destaca categoria ativa no scroll
  useEffect(() => {
    if (!menu.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('cat-', '')
            setActiveCategory(id)
            const btn = navRef.current?.querySelector(`[data-cat="${id}"]`) as HTMLElement
            btn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    )
    menu.forEach((cat) => {
      const el = document.getElementById(`cat-${cat.id}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [menu])

  // Aplica cor primária da loja via CSS variable
  useEffect(() => {
    if (store?.primaryColor) {
      const hex = store.primaryColor
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      let h = 0, s = 0
      const l = (max + min) / 2
      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
          case g: h = ((b - r) / d + 2) / 6; break
          case b: h = ((r - g) / d + 4) / 6; break
        }
      }
      const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
      document.documentElement.style.setProperty('--primary', hsl)
      document.documentElement.style.setProperty('--ring', hsl)
    }
    return () => {
      document.documentElement.style.removeProperty('--primary')
      document.documentElement.style.removeProperty('--ring')
    }
  }, [store?.primaryColor])

  if (storeLoading) return <PageSkeleton />

  if (storeError || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center px-4 bg-gray-50">
        <div className="space-y-4">
          <div className="text-7xl">😕</div>
          <h1 className="text-2xl font-bold">Loja não encontrada</h1>
          <p className="text-gray-500">Verifique o endereço e tente novamente.</p>
        </div>
      </div>
    )
  }

  const filteredMenu = menu.map((cat) => ({
    ...cat,
    products: cat.products.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
      const matchTag = !activeTag || p.tags.map(t => t.toLowerCase()).includes(activeTag)
      return matchSearch && matchTag
    }),
  })).filter((c) => c.products.length > 0)

  const categoriesWithProducts = search || activeTag ? filteredMenu : menu.filter((c) => c.products.length > 0)

  function scrollToCategory(id: string) {
    setActiveCategory(id)
    const el = document.getElementById(`cat-${id}`)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 160
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader store={store} />

      {/* Nav de categorias — tema claro com pills laranja */}
      {categoriesWithProducts.length > 1 && (
        <nav className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="mx-auto max-w-5xl px-4" ref={navRef}>
            <div className="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
              {categoriesWithProducts.map((cat) => (
                <button
                  key={cat.id}
                  data-cat={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    'shrink-0 rounded-xl px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap border',
                    activeCategory === cat.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800',
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* FB Pixel */}
      {store.facebookPixelId && (
        <Script id="fb-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${store.facebookPixelId}');fbq('track','PageView');
        `}</Script>
      )}

      {/* Google Tag Manager */}
      {store.googleTagManagerId && (
        <Script id="gtm" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${store.googleTagManagerId}');
        `}</Script>
      )}

      {/* Aviso da loja */}
      {store.storeNotice && (
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <div className={cn('rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2',
            store.storeNoticeType === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
            store.storeNoticeType === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          )}>
            <span>{store.storeNoticeType === 'warning' ? '⚠️' : store.storeNoticeType === 'success' ? '✅' : 'ℹ️'}</span>
            {store.storeNotice}
          </div>
        </div>
      )}

      {/* Layout principal: 2 colunas no desktop */}
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Coluna de produtos (col-span-2) */}
          <div className="lg:col-span-2 space-y-6 pb-32 lg:pb-8">

            {/* Barra de busca */}
            <div className="relative bg-white p-2.5 rounded-2xl border border-gray-200 flex items-center shadow-sm">
              <Search className="w-5 h-5 text-gray-400 ml-3 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar no cardápio..."
                className="w-full py-2.5 px-3 bg-transparent text-sm focus:outline-none placeholder-gray-400 text-gray-800 font-medium"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="mr-3 text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-100 py-1 px-2.5 rounded-lg transition-colors">
                  Limpar
                </button>
              )}
            </div>

            {/* Tags */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-all capitalize',
                    activeTag === tag
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : cn(TAG_STYLES[tag] ?? 'bg-white text-gray-500 border-gray-200', 'hover:opacity-80'),
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>

            {(search || activeTag) && (
              <p className="text-xs text-gray-400 px-1">
                {categoriesWithProducts.reduce((s, c) => s + c.products.length, 0)} resultado(s)
                {search ? ` para "${search}"` : ''}
                {activeTag ? ` com tag "${activeTag}"` : ''}
                <button onClick={() => { setSearch(''); setActiveTag(null) }} className="ml-2 text-primary hover:underline">Limpar</button>
              </p>
            )}

            {/* Cardápio */}
            {menuLoading ? (
              <MenuSkeleton />
            ) : categoriesWithProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                {search || activeTag ? (
                  <>
                    <div className="text-5xl">🔍</div>
                    <p className="text-lg font-bold text-gray-900">Nada encontrado</p>
                    <p className="text-sm text-gray-500">Tente outro termo ou remova os filtros</p>
                    <button onClick={() => { setSearch(''); setActiveTag(null) }}
                      className="text-sm text-primary hover:underline font-medium">Limpar filtros</button>
                  </>
                ) : (
                  <>
                    <div className="text-6xl">🍽️</div>
                    <p className="text-xl font-bold text-gray-900">Cardápio em preparação</p>
                    <p className="text-sm text-gray-500">Em breve novidades por aqui!</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-10">
                {categoriesWithProducts.map((cat) => (
                  <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-24">
                    <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="h-4 w-1 rounded-full bg-primary inline-block" />
                      {cat.name}
                    </h2>
                    <div className={store?.layoutStyle === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'space-y-3'}>
                      {cat.products.map((product) => (
                        store?.layoutStyle === 'grid' ? (
                          <ProductCardGrid key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
                        ) : (
                          <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
                        )
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar do carrinho — só no desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <DesktopCartSidebar slug={slug} />
          </div>

        </div>
      </div>

      {/* Botão flutuante do carrinho — mobile/tablet */}
      <MobileCartButton slug={slug} />

      <ProductModal product={selectedProduct} slug={slug} onClose={() => setSelectedProduct(null)} />

      {/* CartDrawer só no mobile */}
      <div className="lg:hidden">
        <CartDrawer slug={slug} />
      </div>
    </div>
  )
}

// ─── Card de produto (horizontal) ────────────────────────────────────────────
function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-xl p-4 flex gap-4 border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 ease-out hover:scale-[1.01] active:scale-[0.99] text-left w-full"
    >
      {/* Imagem */}
      <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-gray-100 border border-gray-100 shadow-inner">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🍽️</div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-gray-900 text-base">{product.name}</span>
            {product.tags.slice(0, 2).map((tag) => (
              <span key={tag} className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold border', TAG_STYLES[tag.toLowerCase()] ?? 'bg-gray-100 text-gray-500 border-gray-200')}>
                {tag}
              </span>
            ))}
          </div>
          {product.description && (
            <p className="text-gray-500 text-xs mt-1 leading-relaxed line-clamp-2">{product.description}</p>
          )}
          {product.addonGroups.length > 0 && (
            <span className="text-[10px] font-extrabold text-primary tracking-wider uppercase mt-1.5 block opacity-80">
              ✦ Opções de Adicionais
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
          <span className="font-extrabold text-gray-900 text-base">
            {currency(Number(product.price))}
          </span>
          <div className="flex items-center gap-1.5 bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm group-hover:shadow-md">
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Card de produto (grade vertical) ────────────────────────────────────────
function ProductCardGrid({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-xl flex flex-col border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 ease-out hover:scale-[1.01] active:scale-[0.99] text-left w-full overflow-hidden"
    >
      <div className="w-full aspect-[4/3] bg-gray-100 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-bold text-gray-900 text-sm">{product.name}</span>
          {product.tags.slice(0, 2).map((tag) => (
            <span key={tag} className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold border', TAG_STYLES[tag.toLowerCase()] ?? 'bg-gray-100 text-gray-500 border-gray-200')}>
              {tag}
            </span>
          ))}
        </div>
        {product.description && (
          <p className="text-gray-500 text-xs leading-snug line-clamp-2">{product.description}</p>
        )}
        {product.addonGroups.length > 0 && (
          <span className="text-[10px] font-extrabold text-primary tracking-wider uppercase opacity-80">
            ✦ Opções de Adicionais
          </span>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="font-extrabold text-gray-900 text-sm">
            {currency(Number(product.price))}
          </span>
          <div className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Sidebar do carrinho (desktop) ───────────────────────────────────────────
function DesktopCartSidebar({ slug }: { slug: string }) {
  const router = useRouter()
  const { items, removeItem, updateQty, subtotal, totalItems } = useCartStore()
  const total = subtotal()
  const count = totalItems()
  const mounted = useMounted()
  if (!mounted) return null

  return (
    <div className="sticky top-20 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 font-extrabold text-sm text-gray-800 uppercase tracking-wider">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <span>Seu Carrinho</span>
        </div>
        <span className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-0.5 rounded-full">{count}</span>
      </div>

      {/* Itens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5" style={{ maxHeight: '45vh' }}>
        {items.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <ShoppingBag className="w-10 h-10 mx-auto text-gray-300 animate-bounce" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Carrinho Vazio</p>
            <p className="text-[11px] text-gray-400 max-w-[180px] mx-auto leading-relaxed">
              Adicione os melhores itens do cardápio ao lado!
            </p>
          </div>
        ) : (
          items.map((item) => {
            const total = itemTotal(item)
            return (
              <div key={item.cartItemId} className="text-xs space-y-1.5 pb-3 border-b border-gray-100 flex gap-2 justify-between items-start last:border-0">
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="font-bold text-gray-800 truncate">{item.name}</h4>
                  {item.addons.length > 0 && (
                    <p className="text-[10px] text-primary truncate">+ {item.addons.map(a => a.optionName).join(', ')}</p>
                  )}
                  {item.notes && (
                    <p className="text-[10px] italic text-gray-400 truncate">"{item.notes}"</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      onClick={() => updateQty(item.cartItemId, item.quantity - 1)}
                      className="w-5 h-5 bg-gray-100 hover:bg-gray-200 font-bold flex items-center justify-center rounded-sm text-gray-600 text-[10px] transition-colors"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="font-extrabold text-gray-700 w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.cartItemId, item.quantity + 1)}
                      className="w-5 h-5 bg-gray-100 hover:bg-gray-200 font-bold flex items-center justify-center rounded-sm text-gray-600 text-[10px] transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-between min-h-[45px]">
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-black text-gray-900 block mt-1.5">{currency(total)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <div className="space-y-1 text-xs font-semibold text-gray-500">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{currency(total)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Entrega</span>
              <span>A calcular</span>
            </div>
            <div className="border-t border-dashed border-gray-200 my-1.5" />
            <div className="flex justify-between text-sm text-gray-900 font-black">
              <span>Total</span>
              <span className="text-primary">{currency(total)}</span>
            </div>
          </div>
          <button
            onClick={() => router.push(`/${slug}/checkout`)}
            className="w-full py-2.5 bg-primary hover:opacity-90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-md uppercase tracking-wider transition flex items-center justify-center gap-1"
          >
            Finalizar Pedido
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Botão flutuante (mobile) ─────────────────────────────────────────────────
function MobileCartButton({ slug }: { slug: string }) {
  const { totalItems, subtotal, openCart } = useCartStore()
  const count = totalItems()
  const total = subtotal()
  const mounted = useMounted()

  if (!mounted || count === 0) return null

  return (
    <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
      <button
        onClick={openCart}
        className="w-full bg-primary hover:opacity-90 text-primary-foreground font-extrabold rounded-2xl shadow-xl shadow-primary/30 py-4 px-5 flex items-center justify-between active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-2">
          <span className="bg-white/20 rounded-lg px-2 py-0.5 text-xs font-black">{count}</span>
          <span className="text-sm">Ver Carrinho</span>
        </div>
        <span className="text-sm font-black">{currency(total)}</span>
      </button>
    </div>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/40 animate-pulse" />
      <div className="mx-auto max-w-5xl px-4 -mt-6 pb-3">
        <div className="h-16 rounded-2xl bg-white border shadow-md animate-pulse" />
      </div>
      <div className="mx-auto max-w-5xl px-4 py-6"><MenuSkeleton /></div>
    </div>
  )
}

function MenuSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl bg-white border border-gray-200 p-4 flex gap-4 animate-pulse">
          <div className="w-24 h-24 rounded-lg bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-100" />
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-1/2 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
