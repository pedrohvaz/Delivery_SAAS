import { useEffect, useState } from 'react'

// Evita erro de hidratação: estado persistido (carrinho/login em localStorage)
// difere entre SSR e cliente; renderize o padrão até montar.
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
