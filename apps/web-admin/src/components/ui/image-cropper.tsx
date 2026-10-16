'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Crosshair, Maximize, Minimize, X, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@delivery/ui'

export interface CropOptions {
  /** Largura ÷ altura do resultado (1 = quadrado, 5 = banner largo). */
  aspect: number
  /** Tamanho final da imagem gerada, em pixels. */
  width: number
  height: number
  /** Mostra o guia redondo (o logo aparece num círculo na vitrine). */
  round?: boolean
}

const FUNDOS = [
  { cor: 'transparent', nome: 'Transparente' },
  { cor: '#ffffff', nome: 'Branco' },
  { cor: '#000000', nome: 'Preto' },
]

/**
 * Editor de recorte: arrasta para posicionar, zoom, centralizar, caber inteira e cor do fundo.
 * Sem bibliotecas: a imagem é desenhada num <canvas> no tamanho final e devolvida como arquivo.
 */
export function ImageCropper({ src, options, onCancel, onConfirm }: {
  src: string
  options: CropOptions
  onCancel: () => void
  onConfirm: (file: File) => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [erro, setErro] = useState('')
  const [frameW, setFrameW] = useState(0)
  // Posição do centro da imagem em relação ao centro do quadro (em px do quadro) e escala
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [fundo, setFundo] = useState(options.round ? '#ffffff' : 'transparent')
  const [salvando, setSalvando] = useState(false)
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  const frameH = frameW / options.aspect

  // Carrega a imagem (crossOrigin para poder desenhar no canvas imagens já enviadas)
  useEffect(() => {
    const i = new Image()
    i.crossOrigin = 'anonymous'
    i.onload = () => setImg(i)
    i.onerror = () => setErro('Não foi possível abrir esta imagem para ajustar. Envie o arquivo de novo.')
    i.src = src
  }, [src])

  // Largura do quadro acompanha a tela
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFrameW(el.clientWidth))
    ro.observe(el)
    setFrameW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Escalas de referência: "cobrir" (preenche o quadro) e "caber" (imagem inteira visível)
  const cover = img && frameW ? Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight) : 1
  const contain = img && frameW ? Math.min(frameW / img.naturalWidth, frameH / img.naturalHeight) : 1
  const minScale = contain * 0.5
  const maxScale = cover * 4

  const preencher = useCallback(() => { setScale(cover); setPos({ x: 0, y: 0 }) }, [cover])
  const caber = useCallback(() => { setScale(contain); setPos({ x: 0, y: 0 }) }, [contain])

  // Ao abrir: logo começa inteiro (caber), banner começa preenchendo
  useEffect(() => {
    if (!img || !frameW) return
    if (options.round) caber()
    else preencher()
    // só na primeira vez que a imagem e o quadro estão prontos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, frameW > 0])

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    setPos({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y })
  }
  function onWheel(e: React.WheelEvent) {
    setScale((s) => Math.min(maxScale, Math.max(minScale, s * (e.deltaY < 0 ? 1.08 : 1 / 1.08))))
  }
  const zoom = (f: number) => setScale((s) => Math.min(maxScale, Math.max(minScale, s * f)))

  // Setas do teclado movem a imagem
  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 2
    const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const d = m[e.key]
    if (d) { e.preventDefault(); setPos((p) => ({ x: p.x + d[0], y: p.y + d[1] })) }
  }

  async function confirmar() {
    if (!img || !frameW) return
    setSalvando(true)
    try {
      const { width: W, height: H } = options
      const k = W / frameW // px do resultado por px do quadro
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      if (fundo !== 'transparent') { ctx.fillStyle = fundo; ctx.fillRect(0, 0, W, H) }
      const dw = img.naturalWidth * scale * k
      const dh = img.naturalHeight * scale * k
      const dx = W / 2 + pos.x * k - dw / 2
      const dy = H / 2 + pos.y * k - dh / 2
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, dx, dy, dw, dh)
      const tipo = fundo === 'transparent' ? 'image/png' : 'image/webp'
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, tipo, 0.92))
      if (!blob) throw new Error('falhou')
      onConfirm(new File([blob], `imagem.${tipo === 'image/png' ? 'png' : 'webp'}`, { type: tipo }))
    } catch {
      setErro('Não foi possível gerar a imagem. Tente enviar o arquivo de novo.')
      setSalvando(false)
    }
  }

  const xadrez = 'bg-[conic-gradient(#e5e7eb_25%,#fff_0_50%,#e5e7eb_0_75%,#fff_0)] bg-[length:16px_16px]'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Ajustar imagem"
        className="max-h-[94vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Ajustar imagem</h2>
            <p className="text-xs text-muted-foreground">Arraste para posicionar · use o zoom · resultado {options.width} × {options.height} px</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className={cn('mx-auto w-full', options.aspect <= 1 ? 'max-w-sm' : '')}>
          <div
            ref={frameRef}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { drag.current = null }}
            onPointerCancel={() => { drag.current = null }}
            onWheel={onWheel}
            onKeyDown={onKeyDown}
            className={cn('relative w-full cursor-grab touch-none select-none overflow-hidden rounded-xl border active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-ring',
              fundo === 'transparent' && xadrez)}
            style={{ height: frameH || undefined, aspectRatio: frameH ? undefined : String(options.aspect), background: fundo !== 'transparent' ? fundo : undefined }}
          >
            {img && frameW > 0 && (
              <img src={src} alt="" draggable={false} crossOrigin="anonymous"
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: img.naturalWidth * scale,
                  height: img.naturalHeight * scale,
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                }} />
            )}
            {/* Guias: círculo do logo e linhas do centro */}
            {options.round && <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/60 mix-blend-difference" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/60 mix-blend-difference" />
            {!img && !erro && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>}
          </div>
          {options.round && <p className="mt-1 text-center text-[11px] text-muted-foreground">A parte fora do círculo fica escondida na vitrine.</p>}
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => zoom(1 / 1.15)} aria-label="Diminuir" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border hover:bg-muted"><ZoomOut className="h-4 w-4" /></button>
          <input type="range" aria-label="Zoom" min={minScale} max={maxScale} step={(maxScale - minScale) / 200 || 0.01} value={scale}
            onChange={(e) => setScale(Number(e.target.value))} className="h-10 flex-1 accent-[hsl(var(--primary))]" />
          <button type="button" onClick={() => zoom(1.15)} aria-label="Aumentar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border hover:bg-muted"><ZoomIn className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPos({ x: 0, y: 0 })} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted">
            <Crosshair className="h-4 w-4" /> Centralizar
          </button>
          <button type="button" onClick={caber} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted">
            <Minimize className="h-4 w-4" /> Caber inteira
          </button>
          <button type="button" onClick={preencher} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted">
            <Maximize className="h-4 w-4" /> Preencher
          </button>
          <div className="flex items-center gap-1.5 sm:ml-auto">
            <span className="text-xs text-muted-foreground">Fundo:</span>
            {FUNDOS.map((f) => (
              <button key={f.cor} type="button" onClick={() => setFundo(f.cor)} title={f.nome} aria-label={`Fundo ${f.nome.toLowerCase()}`}
                className={cn('h-8 w-8 rounded-full border-2', fundo === f.cor ? 'border-primary' : 'border-input', f.cor === 'transparent' && xadrez)}
                style={f.cor !== 'transparent' ? { background: f.cor } : undefined} />
            ))}
            <label title="Outra cor" className={cn('relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2', !FUNDOS.some((f) => f.cor === fundo) ? 'border-primary' : 'border-input')}
              style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
              <input type="color" value={fundo.startsWith('#') ? fundo : '#ffffff'} onChange={(e) => setFundo(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Escolher outra cor de fundo" />
            </label>
          </div>
        </div>

        <div className="flex gap-2 border-t pt-4">
          <button type="button" onClick={confirmar} disabled={!img || salvando}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:flex-none sm:px-6">
            <Check className="h-4 w-4" /> {salvando ? 'Gerando...' : 'Usar esta imagem'}
          </button>
          <button type="button" onClick={onCancel} className="h-11 rounded-xl border px-5 text-sm font-medium hover:bg-muted">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
