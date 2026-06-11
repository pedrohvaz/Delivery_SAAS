'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, ChevronRight } from 'lucide-react'
import { currency } from '@/lib/utils'
import { useCartStore, type SelectedAddon } from '@/store/cart'
import { cn } from '@delivery/ui'

interface AddonOption { id: string; name: string; price: number }
interface AddonGroup { id: string; name: string; min: number; max: number; required: boolean; options: AddonOption[] }
interface Product { id: string; name: string; description: string | null; price: number; imageUrl: string | null; addonGroups: AddonGroup[] }

export function ProductModal({ product, slug, onClose }: { product: Product | null; slug: string; onClose: () => void }) {
  const { addItem } = useCartStore()
  const [qty, setQty] = useState(1)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) { setQty(1); setSelected({}); setNotes(''); setError('') }
  }, [product])

  if (!product) return null

  function toggleOption(group: AddonGroup, optionId: string) {
    setSelected((prev) => {
      const current = prev[group.id] ?? []
      if (group.max === 1) return { ...prev, [group.id]: current.includes(optionId) ? [] : [optionId] }
      if (current.includes(optionId)) return { ...prev, [group.id]: current.filter((id) => id !== optionId) }
      if (current.length >= group.max) return prev
      return { ...prev, [group.id]: [...current, optionId] }
    })
  }

  function buildAddons(): SelectedAddon[] {
    return product!.addonGroups.flatMap((group) =>
      (selected[group.id] ?? []).flatMap((id) => {
        const opt = group.options.find((o) => o.id === id)
        return opt ? [{ groupId: group.id, groupName: group.name, optionId: opt.id, optionName: opt.name, price: Number(opt.price) }] : []
      })
    )
  }

  function validate(): boolean {
    for (const group of product!.addonGroups) {
      const count = (selected[group.id] ?? []).length
      if (group.required && count < group.min) {
        setError(`Selecione ao menos ${group.min} opção em "${group.name}"`)
        return false
      }
    }
    return true
  }

  const addons = buildAddons()
  const addonsTotal = addons.reduce((s, a) => s + a.price, 0)
  const lineTotal = (Number(product.price) + addonsTotal) * qty

  // Verifica se todos os grupos obrigatórios foram preenchidos
  const canAdd = product.addonGroups.every((group) => {
    if (!group.required) return true
    const count = (selected[group.id] ?? []).length
    return count >= group.min
  })

  function handleAdd() {
    setError('')
    if (!validate()) return
    addItem({ productId: product!.id, name: product!.name, price: Number(product!.price), quantity: qty, notes: notes || undefined, addons, imageUrl: product!.imageUrl }, slug)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Imagem ou header colorido */}
        {product.imageUrl ? (
          <div className="relative h-52 w-full shrink-0 overflow-hidden">
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <button onClick={onClose}
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur text-white hover:bg-black/50 transition">
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-4 left-5 right-14">
              <h2 className="text-xl font-bold text-white leading-tight">{product.name}</h2>
              <p className="text-lg font-bold text-white/90 mt-0.5">{currency(Number(product.price))}</p>
            </div>
          </div>
        ) : (
          <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 px-5 pt-5 pb-4">
            <button onClick={onClose}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold text-foreground pr-10">{product.name}</h2>
            <p className="text-lg font-bold text-primary mt-1">{currency(Number(product.price))}</p>
          </div>
        )}

        {/* Descrição */}
        {product.description && (
          <div className="px-5 pt-4 pb-2">
            <p className="text-sm text-muted-foreground">{product.description}</p>
          </div>
        )}

        {/* Complementos */}
        <div className="flex-1 overflow-y-auto px-5 space-y-5 py-4">
          {product.addonGroups.map((group) => {
            const selCount = (selected[group.id] ?? []).length
            return (
              <div key={group.id} className="rounded-2xl border overflow-hidden">
                {/* Cabeçalho do grupo */}
                <div className={cn('flex items-center justify-between px-4 py-3', group.required ? 'bg-primary/5 border-b' : 'bg-muted/40 border-b')}>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{group.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {group.required ? `Obrigatório · ` : ''}
                      {group.max === 1 ? 'Escolha 1' : `Escolha até ${group.max}`}
                    </p>
                  </div>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold', group.required ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {group.required ? 'Obrigatório' : 'Opcional'}
                  </span>
                </div>

                {/* Opções */}
                <div className="divide-y">
                  {group.options.map((opt) => {
                    const isSelected = (selected[group.id] ?? []).includes(opt.id)
                    return (
                      <button key={opt.id} type="button" onClick={() => toggleOption(group, opt.id)}
                        className={cn('flex w-full items-center justify-between px-4 py-3 text-sm transition-colors', isSelected ? 'bg-primary/5' : 'hover:bg-muted/40')}>
                        <div className="flex items-center gap-3">
                          <div className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40')}>
                            {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <span className={cn('font-medium', isSelected ? 'text-foreground' : 'text-muted-foreground')}>{opt.name}</span>
                        </div>
                        {Number(opt.price) > 0 && (
                          <span className={cn('font-semibold text-xs', isSelected ? 'text-primary' : 'text-muted-foreground')}>
                            +{currency(Number(opt.price))}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Observações */}
          <div className="rounded-2xl border overflow-hidden">
            <div className="bg-muted/40 border-b px-4 py-3">
              <h3 className="font-semibold text-sm text-foreground">Alguma observação?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Opcional · Tem algum pedido especial?</p>
            </div>
            <textarea
              className="w-full px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none resize-none bg-white"
              rows={2}
              placeholder="Ex: sem cebola, bem passado, ponto na carne..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-4 space-y-3 bg-white">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
              ⚠ {error}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border bg-muted/30 p-1">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border shadow-sm hover:bg-muted transition active:scale-90">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center font-bold text-base">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border shadow-sm hover:bg-muted transition active:scale-90">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={handleAdd} disabled={!canAdd}
              title={!canAdd ? 'Selecione os itens obrigatórios' : undefined}
              className="flex-1 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 hover:bg-primary/90 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
              <span>Adicionar</span>
              <span>{currency(lineTotal)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
