'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function hexToHsl(hex: string): string | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null
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
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// Aplica a cor da loja em todas as telas dela (cardápio, checkout, pedido, conta...),
// não só no cardápio. Usa a mesma consulta ['store', slug] das páginas: sem pedido extra.
export function StoreTheme() {
  const slug = useParams<{ slug: string }>()?.slug
  const { data: color } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => api.get<{ data: { primaryColor: string } }>(`/store/${slug}`).then((r) => r.data.data),
    enabled: !!slug,
    select: (s) => s?.primaryColor,
  })

  useEffect(() => {
    const hsl = color ? hexToHsl(color) : null
    if (!hsl) return
    document.documentElement.style.setProperty('--primary', hsl)
    document.documentElement.style.setProperty('--ring', hsl)
    return () => {
      document.documentElement.style.removeProperty('--primary')
      document.documentElement.style.removeProperty('--ring')
    }
  }, [color])

  return null
}
