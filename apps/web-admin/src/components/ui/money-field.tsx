'use client'

import { cn, MoneyInput, type MoneyInputProps } from '@delivery/ui'
import { useId } from 'react'

/** Campo de dinheiro (R$) com o mesmo visual do <Input> do painel. */
export function MoneyField({ label, error, className, id, ...props }: MoneyInputProps & { label?: string; error?: string }) {
  const auto = useId()
  const fieldId = id ?? auto
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <MoneyInput
        id={fieldId}
        className={cn(
          'h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
