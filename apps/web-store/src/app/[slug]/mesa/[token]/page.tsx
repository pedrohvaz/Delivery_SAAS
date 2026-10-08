'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'
import { cn } from '@delivery/ui'
import { ProductModal } from '@/components/store/product-modal'
import { CartDrawer } from '@/components/store/cart-drawer'
import { StoreHeader } from '@/components/store/store-header'

interface AddonOption { id: string; name: string; price: number; isActive: boolean; position: number }
interface AddonGroup { id: string; name: string; min: number; max: number; required: boolean; options: AddonOption[] }
interface Product {
  id: string; name: string; description: string | null; price: number
  imageUrl: string | null; tags: string[]; availableFor: string
  stockControl: boolean; stockQty: number | null
  addonGroups: AddonGroup[]
}
interface Category { id: string; name: string; products: Product[] }
interface TableData {
  tableId: string
  tableNumber: number
  tableLabel: string | null
  store: {
    id: string; name: string; slug: string; logoUrl: string | null
    isOpen: boolean; estimatedTime: number
  }
}

interface StoreData {
  id: string; name: string; slug: string; logoUrl: string | null; bannerUrl: string | null
  description: string | null; isOpen: boolean; estimatedTime: number
  minOrderValue: number; timezone: string
  address: string | null; number: string | null; district: string | null
  city: string | null; state: string | null
  schedules: { dayOfWeek: number; openTime: string; closeTime: string }[]
}

const TAG_COLORS: Record<string, string> = {
  destaque: 'bg-yellow-100 text-yellow-700',
  novo: 'bg-blue-100 text-blue-700',
  vegano: 'bg-green-100 text-green-700',
  picante: 'bg-red-100 text-red-700',
  'sem glúten': 'bg-purple-100 text-purple-700',
}

export default function MesaPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Valida o token do QR e obtém dados da mesa/loja
  const { data: tableData, isLoading: tableLoading, error: tableError } = useQuery({
    queryKey: ['table', token],
    queryFn: () => api.get<{ data: TableData }>(`/store/table/${token}`).then((r) => r.data.data),
  })

  // Carrega dados completos da loja (para o header e menu)
  const { data: store } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => api.get<{ data: StoreData }>(`/store/${slug}`).then((r) => r.data.data),
    enabled: !!tableData,
  })

  const { data: menu = [], isLoading: menuLoading } = useQuery({
    queryKey: ['menu', slug],
    queryFn: () => api.get<{ data: Category[] }>(`/store/${slug}/menu`).then((r) => r.data.data),
    enabled: !!tableData,
  })

  if (tableLoading) return <PageSkeleton />

  if (tableError || !tableData) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center px-4">
        <div className="space-y-3">
          <div className="text-6xl">❌</div>
          <h1 className="text-xl font-bold">Mesa não encontrada</h1>
          <p className="text-muted-foreground text-sm">
            Este QR Code é inválido ou a mesa foi desativada. Solicite um novo ao atendente.
          </p>
        </div>
      </div>
    )
  }

  const categoriesWithProducts = menu.filter((c) => c.products.length > 0)
  const checkoutHref = `/${slug}/mesa/${token}/checkout`
  const tableLabel = tableData.tableLabel
    ? `${tableData.tableLabel}`
    : `Mesa ${tableData.tableNumber}`

  function scrollToCategory(id: string) {
    setActiveCategory(id)
    const el = document.getElementById(`cat-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {store && <StoreHeader store={store} />}

      {/* Badge de mesa */}
      <div className="bg-primary/5 border-b border-primary/20">
        <div className="mx-auto max-w-3xl px-4 py-2 flex items-center gap-2">
          <span className="text-primary text-sm">🪑</span>
          <span className="text-sm font-semibold text-primary">{tableLabel}</span>
          <span className="text-xs text-muted-foreground">— Pedido direto na mesa</span>
        </div>
      </div>

      {/* Nav de categorias */}
      {categoriesWithProducts.length > 1 && (
        <nav className="sticky top-0 z-30 bg-[#1c1c1e] border-b border-white/5">
          <div className="mx-auto max-w-3xl px-4">
            <div className="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
              {categoriesWithProducts.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap',
                    activeCategory === cat.id
                      ? 'bg-primary text-white shadow-sm shadow-primary/40'
                      : 'text-[#8e8e93] hover:text-white hover:bg-white/10',
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Cardápio */}
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
        {menuLoading ? (
          <MenuSkeleton />
        ) : categoriesWithProducts.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="text-5xl">🍽️</div>
            <p className="text-muted-foreground">Cardápio em preparação</p>
          </div>
        ) : (
          categoriesWithProducts.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`}>
              <h2 className="text-lg font-bold text-foreground mb-3">{cat.name}</h2>
              <div className="space-y-2">
                {cat.products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-sm text-foreground">{product.name}</span>
                        {product.tags.map((tag) => (
                          <span key={tag} className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', TAG_COLORS[tag.toLowerCase()] ?? 'bg-muted text-muted-foreground')}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                      )}
                      <p className="mt-1.5 text-sm font-bold text-primary">
                        {currency(Number(product.price))}
                      </p>
                    </div>
                    {product.imageUrl && (
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                        <img loading="lazy" decoding="async" src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <ProductModal
        product={selectedProduct}
        slug={slug}
        onClose={() => setSelectedProduct(null)}
      />

      <CartDrawer slug={slug} checkoutHref={checkoutHref} />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-[105px] bg-white border-b animate-pulse" />
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <MenuSkeleton />
      </div>
    </div>
  )
}

function MenuSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-6 w-32 rounded bg-muted animate-pulse" />
          {[1, 2, 3].map((j) => (
            <div key={j} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}
