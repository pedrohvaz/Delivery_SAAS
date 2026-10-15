// Cópia de packages/ui/src/money-input.tsx (o superadmin não usa o pacote @delivery/ui).
'use client'

import { forwardRef, type InputHTMLAttributes, type MutableRefObject } from 'react'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Formata um valor em reais: 1234.5 → "R$ 1.234,50". */
export function formatBRL(value: number): string {
  return BRL.format(value)
}

/** Converte o que veio do estado (número, "12.50", "12,5", "") em centavos; vazio → null. */
function toCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\s|R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

export type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'max'> & {
  /** Valor em reais (número ou texto com ponto decimal). Vazio = campo vazio. */
  value: string | number | null | undefined
  /** Recebe o valor em reais com ponto decimal ("1234.50"), ou "" quando o campo é apagado. */
  onValueChange: (value: string) => void
  /** Valor máximo em reais. */
  max?: number
}

/**
 * Campo de dinheiro no formato brasileiro, como maquininha: digita só números e os
 * centavos entram pela direita (1 → R$ 0,01; 1990 → R$ 19,90). Funciona igual no
 * celular (teclado numérico) e no computador.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, max, placeholder = 'R$ 0,00', onFocus, ...props }, ref) => {
    const cents = toCents(value)
    const display = cents === null ? '' : BRL.format(cents / 100)

    const toEnd = (el: HTMLInputElement) =>
      requestAnimationFrame(() => {
        const end = el.value.length
        try { el.setSelectionRange(end, end) } catch { /* alguns navegadores não deixam */ }
      })

    return (
      <input
        {...props}
        ref={ref as MutableRefObject<HTMLInputElement> | ((el: HTMLInputElement) => void) | null}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onFocus={(e) => { toEnd(e.currentTarget); onFocus?.(e) }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11)
          if (!digits) { onValueChange(''); return }
          let c = parseInt(digits, 10)
          if (max !== undefined) c = Math.min(c, Math.round(max * 100))
          onValueChange((c / 100).toFixed(2))
          toEnd(e.currentTarget)
        }}
      />
    )
  },
)
MoneyInput.displayName = 'MoneyInput'
