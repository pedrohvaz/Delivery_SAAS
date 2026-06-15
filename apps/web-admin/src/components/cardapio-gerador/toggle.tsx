'use client'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none disabled:opacity-50
        ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
          ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}
