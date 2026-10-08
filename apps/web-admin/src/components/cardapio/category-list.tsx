'use client'

import { useState } from 'react'
import { cn } from '@delivery/ui'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Category,
} from '@/hooks/use-cardapio'
import { ProductList } from './product-list'

export function CategoryList() {
  const { data: categories = [], isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [newName, setNewName] = useState('')

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await createCategory.mutateAsync({ name: newName.trim() })
    setNewName('')
    setAddOpen(false)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget || !editTarget.name.trim()) return
    await updateCategory.mutateAsync({ id: editTarget.id, name: editTarget.name })
    setEditTarget(null)
  }

  async function handleToggleActive(cat: Category) {
    await updateCategory.mutateAsync({ id: cat.id, isActive: !cat.isActive })
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta categoria? Os produtos serão removidos junto.')) return
    await deleteCategory.mutateAsync(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Botão adicionar */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {/* Lista de categorias */}
      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
          <p className="text-muted-foreground text-sm">Nenhuma categoria criada ainda.</p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Criar primeira categoria
          </Button>
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat.id} className="rounded-xl border bg-card overflow-hidden">
            {/* Header da categoria */}
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-3 cursor-pointer select-none',
                !cat.isActive && 'opacity-60',
              )}
              onClick={() => toggleExpand(cat.id)}
            >
              {expanded[cat.id] ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}

              <span className="flex-1 font-medium text-sm text-foreground">{cat.name}</span>

              <Badge variant={cat.isActive ? 'success' : 'default'}>
                {cat._count?.products ?? 0} produto{(cat._count?.products ?? 0) !== 1 ? 's' : ''}
              </Badge>

              {/* Ações — stopPropagation para não abrir/fechar a lista */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  title={cat.isActive ? 'Desativar' : 'Ativar'}
                  onClick={() => handleToggleActive(cat)}
                  className={cn(
                    'flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-lg transition-colors',
                    cat.isActive
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Editar"
                  onClick={() => setEditTarget({ ...cat })}
                  className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Excluir"
                  onClick={() => handleDelete(cat.id)}
                  className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Produtos da categoria */}
            {expanded[cat.id] && (
              <div className="border-t bg-muted/20 px-4 py-3">
                <ProductList categoryId={cat.id} categoryName={cat.name} />
              </div>
            )}
          </div>
        ))
      )}

      {/* Modal: Nova Categoria */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nova Categoria" size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome da categoria"
            placeholder="Ex: Lanches, Bebidas..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            required
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createCategory.isPending}>
              Criar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Categoria */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar Categoria" size="sm">
        {editTarget && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              label="Nome"
              value={editTarget.name}
              onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
              autoFocus
              required
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={updateCategory.isPending}>
                Salvar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
