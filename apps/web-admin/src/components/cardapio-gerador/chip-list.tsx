'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Toggle } from './toggle'
import { EmojiPicker } from './emoji-picker'
import type { WizardInfoExtra } from './wizard-state'

interface ChipListProps {
  items: WizardInfoExtra[]
  onChange: (items: WizardInfoExtra[]) => void
}

export function ChipList({ items, onChange }: ChipListProps) {
  const [novoTexto, setNovoTexto] = useState('')
  const [novoIcone, setNovoIcone] = useState('⭐')
  const [novaPosicao, setNovaPosicao] = useState<'topo' | 'rodape'>('topo')
  const [novoDestaque, setNovoDestaque] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  function handleAdd() {
    if (!novoTexto.trim()) return
    onChange([
      ...items,
      { id: crypto.randomUUID(), texto: novoTexto.trim(), icone: novoIcone, posicao: novaPosicao, destaque: novoDestaque },
    ])
    setNovoTexto('')
    setNovoIcone('⭐')
    setNovaPosicao('topo')
    setNovoDestaque(false)
    setShowPicker(false)
  }

  function handleRemove(id: string) {
    onChange(items.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
              <span className="text-base">{item.icone}</span>
              <span className="flex-1 text-sm truncate">{item.texto}</span>
              <span className="text-xs text-muted-foreground">{item.posicao === 'topo' ? 'Topo' : 'Rodapé'}</span>
              {item.destaque && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Destaque</span>
              )}
              <button type="button" onClick={() => handleRemove(item.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed p-3 space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg"
          >
            {novoIcone}
          </button>
          <Input
            placeholder="Ex: Frete grátis acima de R$ 50"
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            className="flex-1"
          />
        </div>
        {showPicker && <EmojiPicker value={novoIcone} onChange={setNovoIcone} />}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Posição:</span>
            <div className="flex overflow-hidden rounded-lg border">
              <button
                type="button"
                onClick={() => setNovaPosicao('topo')}
                className={`px-3 py-1 text-xs font-medium ${novaPosicao === 'topo' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Topo
              </button>
              <button
                type="button"
                onClick={() => setNovaPosicao('rodape')}
                className={`px-3 py-1 text-xs font-medium ${novaPosicao === 'rodape' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Rodapé
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle checked={novoDestaque} onChange={setNovoDestaque} />
            <span className="text-sm">Destaque (promoção)</span>
          </label>
          <Button type="button" size="sm" onClick={handleAdd} disabled={!novoTexto.trim()} className="ml-auto">
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  )
}
