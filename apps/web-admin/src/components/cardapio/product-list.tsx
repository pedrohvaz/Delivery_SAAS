'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Power, Tag, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@delivery/ui'
import { useProducts, useUpdateProduct, useDeleteProduct, type Product } from '@/hooks/use-cardapio'
import { ProductModal } from './product-modal'
import { AddonPanel } from './addon-panel'

interface Props {
  categoryId: string
  categoryName: string
}

const TAG_COLORS: Record<string, string> = {
  destaque: 'bg-yellow-100 text-yellow-700',
  novo: 'bg-blue-100 text-blue-700',
  vegano: 'bg-green-100 text-green-700',
  picante: 'bg-red-100 text-red-700',
  promoção: 'bg-purple-100 text-purple-700',
}

export function ProductList({ categoryId, categoryName }: Props) {
  const { data: products = [], isLoading } = useProducts(categoryId)
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [addonProduct, setAddonProduct] = useState<Product | null>(null)

  function openCreate() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(product: Product) {
    setEditTarget(product)
    setModalOpen(true)
  }

  async function handleToggleActive(p: Product) {
    await updateProduct.mutateAsync({ id: p.id, isActive: !p.isActive })
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este produto?')) return
    await deleteProduct.mutateAsync(id)
  }

  if (isLoading) {
    return <div className="h-8 rounded bg-muted animate-pulse" />
  }

  return (
    <div className="space-y-2">
      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
          <p className="text-xs text-muted-foreground">Nenhum produto nesta categoria.</p>
          <Button size="sm" variant="secondary" onClick={openCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar produto
          </Button>
        </div>
      ) : (
        <>
          {products.map((product) => (
            <div
              key={product.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border bg-card p-3',
                !product.isActive && 'opacity-60',
              )}
            >
              {/* Foto */}
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">🍽️</div>
                )}
              </div>

              {/* Infos */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground truncate">{product.name}</span>
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                        TAG_COLORS[tag.toLowerCase()] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-sm font-semibold text-primary">
                    {Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  {product._count && product._count.addonGroups > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {product._count.addonGroups} grupo{product._count.addonGroups !== 1 ? 's' : ''} de complementos
                    </span>
                  )}
                  {product.stockControl && product.stockQty !== null && (
                    <Badge variant={product.stockQty <= (product.minStock ?? 0) ? 'danger' : 'outline'}>
                      Estoque: {product.stockQty}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  title="Complementos"
                  onClick={() => setAddonProduct(product)}
                  className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
                <button
                  title={product.isActive ? 'Desativar' : 'Ativar'}
                  onClick={() => handleToggleActive(product)}
                  className={cn(
                    'flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-lg transition-colors',
                    product.isActive
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Editar"
                  onClick={() => openEdit(product)}
                  className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Excluir"
                  onClick={() => handleDelete(product.id)}
                  className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          <Button size="sm" variant="ghost" onClick={openCreate} className="w-full">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar produto em {categoryName}
          </Button>
        </>
      )}

      {/* Modal criar/editar produto */}
      <ProductModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        categoryId={categoryId}
        product={editTarget}
      />

      {/* Painel de complementos */}
      {addonProduct && (
        <AddonPanel
          product={addonProduct}
          onClose={() => setAddonProduct(null)}
        />
      )}
    </div>
  )
}
