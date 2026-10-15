'use client'

import { useState } from 'react'
import { Store } from 'lucide-react'
import { cn } from '@delivery/ui'
import { useAuthStore } from '@/store/auth'
import { useSettings } from '@/hooks/use-settings'

/**
 * Logo da loja no topo do menu. Usa o logo salvo em Configurações (atualiza na hora,
 * sem novo login); sem logo — ou se a imagem não carregar — mostra o ícone padrão.
 */
export function StoreLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const store = useAuthStore((s) => s.store)
  const { data: settings } = useSettings()
  const logo = (settings ? settings.logoUrl : store?.logoUrl) || null
  const [quebrada, setQuebrada] = useState<string | null>(null)

  const box = size === 'sm' ? 'h-7 w-7 rounded-md' : 'h-11 w-11 rounded-xl'

  if (logo && quebrada !== logo) {
    return (
      <img
        src={logo}
        alt={`Logo ${store?.name ?? 'da loja'}`}
        onError={() => setQuebrada(logo)}
        className={cn('shrink-0 border bg-white object-contain', box)}
      />
    )
  }
  return (
    <div className={cn('flex shrink-0 items-center justify-center bg-primary text-primary-foreground', size === 'sm' ? 'h-7 w-7 rounded-md' : 'h-9 w-9 rounded-lg')}>
      <Store className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
    </div>
  )
}
