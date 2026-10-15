'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { MoneyField } from '@/components/ui/money-field'
import { Button } from '@/components/ui/button'
import { cn } from '@delivery/ui'
import { X, Upload, ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import {
  useCreateProduct,
  useUpdateProduct,
  type Product,
  type ProductInput,
} from '@/hooks/use-cardapio'

interface Props {
  open: boolean
  onClose: () => void
  categoryId: string
  product?: Product | null
}

const AVAILABLE_TAGS = ['Destaque', 'Novo', 'Vegano', 'Picante', 'Promoção', 'Sem glúten']

// ─── Componente de upload de imagem ─────────────────────────────────────────

function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Somente imagens são aceitas.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Tamanho máximo: 5MB.'); return }

    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<{ data: { url: string } }>('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(data.data.url)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro no upload.')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">Foto do produto</label>

      {value ? (
        <div className="relative rounded-xl overflow-hidden border bg-muted group">
          <img src={value} alt="Produto" className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              <Upload className="h-3.5 w-3.5" /> Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90 transition"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {uploading ? 'Enviando...' : 'Clique ou arraste uma imagem'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, WebP · máx. 5MB</p>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export function ProductModal({ open, onClose, categoryId, product }: Props) {
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const isEditing = !!product

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [availableFor, setAvailableFor] = useState<'DELIVERY' | 'PICKUP' | 'BOTH'>('BOTH')
  const [stockControl, setStockControl] = useState(false)
  const [stockQty, setStockQty] = useState('')
  const [minStock, setMinStock] = useState('')
  const [avgCost, setAvgCost] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description ?? '')
      setPrice(String(product.price))
      setImageUrl(product.imageUrl ?? '')
      setTags(product.tags)
      setAvailableFor(product.availableFor)
      setStockControl(product.stockControl)
      setStockQty(product.stockQty != null ? String(product.stockQty) : '')
      setMinStock(product.minStock != null ? String(product.minStock) : '')
      setAvgCost(product.avgCost != null ? String(product.avgCost) : '')
    } else {
      setName(''); setDescription(''); setPrice(''); setImageUrl('')
      setTags([]); setAvailableFor('BOTH'); setStockControl(false)
      setStockQty(''); setMinStock(''); setAvgCost('')
    }
    setError('')
  }, [product, open])

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const priceNum = parseFloat(price.replace(',', '.'))
    if (isNaN(priceNum) || priceNum < 0) { setError('Preço inválido'); return }

    const payload: ProductInput = {
      categoryId,
      name: name.trim(),
      description: description.trim() || undefined,
      price: priceNum,
      imageUrl: imageUrl.trim() || null,
      tags,
      availableFor,
      stockControl,
      stockQty: stockControl && stockQty ? parseInt(stockQty) : null,
      minStock: stockControl && minStock ? parseInt(minStock) : null,
      avgCost: avgCost ? parseFloat(avgCost.replace(',', '.')) : null,
    }

    try {
      if (isEditing) {
        await updateProduct.mutateAsync({ id: product!.id, ...payload })
      } else {
        await createProduct.mutateAsync(payload)
      }
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao salvar produto')
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar produto' : 'Novo produto'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Nome e Preço */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <Input label="Nome do produto *" placeholder="Ex: X-Burguer Duplo"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <MoneyField label="Preço *" value={price} onValueChange={setPrice} required />
          </div>
        </div>

        {/* Descrição */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Descrição</label>
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            placeholder="Descreva o produto..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Upload de imagem */}
        <ImageUploader value={imageUrl} onChange={setImageUrl} />

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Etiquetas</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className={cn('rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                  tags.includes(tag)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
                )}>
                {tag}
              </button>
            ))}
            {tags.filter((t) => !AVAILABLE_TAGS.includes(t)).map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                {tag}
                <button type="button" onClick={() => toggleTag(tag)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </div>

        {/* Disponível para */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Disponível para</label>
          <div className="flex gap-2 flex-wrap">
            {(['BOTH', 'DELIVERY', 'PICKUP'] as const).map((opt) => (
              <button key={opt} type="button" onClick={() => setAvailableFor(opt)}
                className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  availableFor === opt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary',
                )}>
                {opt === 'BOTH' ? 'Delivery e Retirada' : opt === 'DELIVERY' ? 'Apenas Delivery' : 'Apenas Retirada'}
              </button>
            ))}
          </div>
        </div>

        {/* Estoque */}
        <div className="rounded-lg border p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={stockControl} onChange={(e) => setStockControl(e.target.checked)}
              className="h-4 w-4 rounded border-input" />
            <span className="text-sm font-medium text-foreground">Controlar estoque</span>
          </label>
          {stockControl && (
            <div className="grid grid-cols-3 gap-3">
              <Input label="Qtd. em estoque" type="number" min="0" placeholder="0"
                value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
              <Input label="Estoque mínimo" type="number" min="0" placeholder="0"
                value={minStock} onChange={(e) => setMinStock(e.target.value)} />
              <MoneyField label="Custo médio" value={avgCost} onValueChange={setAvgCost} />
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="submit" loading={isPending}>{isEditing ? 'Salvar alterações' : 'Criar produto'}</Button>
        </div>
      </form>
    </Modal>
  )
}
