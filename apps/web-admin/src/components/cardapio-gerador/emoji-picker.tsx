'use client'

import { cn } from '@delivery/ui'

// Mesma lista (e ordem) de apps/cardapio-service/app/icons.py (EMOJI_TO_GLYPH).
export const CARDAPIO_EMOJIS = [
  '🔥', '🚚', '🛵', '⏰', '📍', '📞', '⭐', '🎁', '❤', '🍕',
  '🍔', '☕', '🎂', '🍦', '💳', '📦', '✅', '🏆', '🔔', '💰',
  '💵', '🍗', '🏷', '👍', '⚡', '🌿', '🍵', '🌶', '🐟', '🥕',
]

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {CARDAPIO_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border text-base transition-colors',
            value === emoji ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
