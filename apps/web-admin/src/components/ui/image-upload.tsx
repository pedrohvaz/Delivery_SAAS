'use client'

import { useRef, useState } from 'react'
import { ImageIcon, Link2, Loader2, Trash2, Upload } from 'lucide-react'
import { cn } from '@delivery/ui'
import { api } from '@/lib/api'

interface ImageUploadFieldProps {
  label: string
  hint?: string
  value: string
  onChange: (url: string) => void
  /** Pasta no servidor: define o tamanho máximo (banner 1920px, logo 512px). */
  folder: 'banners' | 'logos' | 'products'
  /** Proporção da pré-visualização (ex.: 'aspect-[3/1]' para banner, 'aspect-square' para logo). */
  aspectClass?: string
  /** Classe extra da área de pré-visualização (ex.: largura da logo). */
  previewClass?: string
}

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Campo de imagem com upload (clique ou arraste), pré-visualização, troca e remoção.
 * Também aceita colar um link, para quem já tem a imagem hospedada.
 */
export function ImageUploadField({ label, hint, value, onChange, folder, aspectClass = 'aspect-[3/1]', previewClass }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showLink, setShowLink] = useState(false)

  async function handleFile(file: File) {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { setError('Use uma imagem JPG, PNG, WebP ou GIF.'); return }
    if (file.size > MAX_BYTES) { setError('A imagem pode ter no máximo 5 MB.'); return }
    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<{ data: { url: string } }>(`/upload/image?folder=${folder}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(data.data.url)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Não foi possível enviar a imagem.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={value ? `Trocar ${label.toLowerCase()}` : `Enviar ${label.toLowerCase()}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) { e.preventDefault(); inputRef.current?.click() } }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
        className={cn(
          'group relative overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 cursor-pointer transition',
          aspectClass, previewClass,
          dragOver ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/60',
        )}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold"><Upload className="h-3.5 w-3.5" /> Trocar imagem</span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs font-semibold text-foreground">Clique ou arraste uma imagem</span>
            <span className="text-[11px]">JPG, PNG ou WebP · até 5 MB</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-60">
          <Upload className="h-3.5 w-3.5" /> {value ? 'Trocar' : 'Enviar imagem'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60">
            <Trash2 className="h-3.5 w-3.5" /> Remover
          </button>
        )}
        <button type="button" onClick={() => setShowLink((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Link2 className="h-3.5 w-3.5" /> {showLink ? 'Esconder link' : 'Usar um link'}
        </button>
      </div>

      {showLink && (
        <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…"
          className="w-full h-9 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
