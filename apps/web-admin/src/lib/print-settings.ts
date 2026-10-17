'use client'

import { useEffect, useState } from 'react'

/**
 * Preferências de impressão. Ficam NESTE computador (cada caixa/cozinha tem sua impressora),
 * por isso vão no localStorage e não no servidor.
 */
export interface PrintSettings {
  /** Largura do papel da impressora térmica. */
  paper: '80' | '58'
  /** Via completa (cliente/entregador): itens, preços, endereço, pagamento. */
  full: boolean
  /** Via da cozinha: só itens e observações, letra grande, sem preços. */
  kitchen: boolean
  /** Cópias de cada via. */
  copies: number
  /** Letra maior em toda a comanda. */
  bigFont: boolean
  /** Impressão automática: desligada, ao chegar o pedido, ou ao aceitar (sair de "pendente"). */
  auto: 'off' | 'new' | 'confirmed'
}

export const DEFAULT_PRINT: PrintSettings = { paper: '80', full: true, kitchen: false, copies: 1, bigFont: false, auto: 'off' }

const KEY = 'bylink-impressao'
const EVENT = 'bylink-impressao-mudou'

export function getPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_PRINT, ...JSON.parse(raw) } : DEFAULT_PRINT
  } catch {
    return DEFAULT_PRINT
  }
}

export function savePrintSettings(s: PrintSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    window.dispatchEvent(new Event(EVENT))
  } catch { /* sem localStorage: vale só até recarregar */ }
}

export function usePrintSettings(): [PrintSettings, (s: PrintSettings) => void] {
  const [s, setS] = useState<PrintSettings>(DEFAULT_PRINT)
  useEffect(() => {
    setS(getPrintSettings())
    const h = () => setS(getPrintSettings())
    window.addEventListener(EVENT, h)
    window.addEventListener('storage', h)
    return () => { window.removeEventListener(EVENT, h); window.removeEventListener('storage', h) }
  }, [])
  return [s, (n) => { setS(n); savePrintSettings(n) }]
}

// ─── Pedidos já impressos automaticamente (para não imprimir duas vezes) ─────
const PRINTED = 'bylink-impressos'

export function wasAutoPrinted(id: string): boolean {
  try { return (JSON.parse(localStorage.getItem(PRINTED) ?? '[]') as string[]).includes(id) } catch { return false }
}

export function markAutoPrinted(id: string) {
  try {
    const list = (JSON.parse(localStorage.getItem(PRINTED) ?? '[]') as string[]).filter((x) => x !== id)
    list.push(id)
    localStorage.setItem(PRINTED, JSON.stringify(list.slice(-300)))
  } catch { /* ignora */ }
}
