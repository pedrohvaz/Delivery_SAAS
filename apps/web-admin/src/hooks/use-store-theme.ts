'use client'

import { useEffect } from 'react'
import { useSettings } from '@/hooks/use-settings'

const CACHE_KEY = 'bylink:primaryColor'

/** "#a70417" -> "353 95% 34%" (formato das variáveis do tema). */
function hexToHsl(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/** Texto do botão: branco em cor escura, quase preto em cor clara (ex.: amarelo). */
function foregroundFor(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return L > 0.45 ? '222 47% 11%' : '0 0% 100%'
}

function apply(hex: string) {
  const hsl = hexToHsl(hex)
  if (!hsl) return
  const root = document.documentElement.style
  root.setProperty('--primary', hsl)
  root.setProperty('--ring', hsl)
  root.setProperty('--primary-foreground', foregroundFor(hex))
}

function clear() {
  const root = document.documentElement.style
  root.removeProperty('--primary')
  root.removeProperty('--ring')
  root.removeProperty('--primary-foreground')
}

/**
 * Aplica no painel a mesma cor principal escolhida para a vitrine da loja
 * (Configurações → Aparência). Guarda a última cor para não piscar laranja ao recarregar.
 */
export function useStoreTheme() {
  const { data: settings } = useSettings()

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) apply(cached)
    } catch { /* sem localStorage: segue com a cor padrão */ }
    return clear
  }, [])

  useEffect(() => {
    const color = settings?.primaryColor
    if (!color) return
    apply(color)
    try { localStorage.setItem(CACHE_KEY, color) } catch { /* ok */ }
  }, [settings?.primaryColor])
}

/** Para usar dentro de páginas já autenticadas (painel e cozinha). */
export function StoreTheme() {
  useStoreTheme()
  return null
}
