'use client'

import { Check, ImageIcon, Wand2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { CardapioWizardState } from './wizard-state'

interface StepModoProps {
  state: CardapioWizardState
  update: (patch: Partial<CardapioWizardState>) => void
}

const MODOS = [
  {
    value: 'manual' as const,
    title: 'Manual',
    description: 'Layout pronto com as cores do template escolhido.',
    icon: Check,
  },
  {
    value: 'ia_fundo' as const,
    title: 'Fundo com IA',
    description: 'Gera um fundo personalizado com IA, mantendo o layout dos produtos.',
    icon: ImageIcon,
  },
  {
    value: 'ia_completo' as const,
    title: 'Cardápio completo com IA',
    description: 'A IA cria a arte inteira do cardápio, incluindo produtos e preços.',
    icon: Wand2,
  },
]

export function StepModo({ state, update }: StepModoProps) {
  function updateConfigIa(patch: Partial<CardapioWizardState['configIa']>) {
    update({ configIa: { ...state.configIa, ...patch } })
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Modo de geração</h3>
        <p className="text-sm text-muted-foreground">Escolha como a imagem do cardápio será criada.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {MODOS.map((modo) => {
          const Icon = modo.icon
          const isSelected = state.modo === modo.value
          return (
            <button
              key={modo.value}
              type="button"
              onClick={() => update({ modo: modo.value })}
              className={`flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
              }`}
            >
              <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{modo.title}</p>
              <p className="text-xs text-muted-foreground">{modo.description}</p>
            </button>
          )
        })}
      </div>

      {state.modo !== 'manual' && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">Configurações de IA</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Tipo de estabelecimento"
              placeholder="Ex: Pizzaria, Hamburgueria"
              value={state.configIa.tipoEstabelecimento}
              onChange={(e) => updateConfigIa({ tipoEstabelecimento: e.target.value })}
            />
            <Input
              label="Estilo visual"
              placeholder="Ex: Moderno, rústico, minimalista"
              value={state.configIa.estilo}
              onChange={(e) => updateConfigIa({ estilo: e.target.value })}
            />
            <Input
              label="Paleta de cores"
              placeholder="Ex: Tons de vermelho e dourado"
              value={state.configIa.paletaCores}
              onChange={(e) => updateConfigIa({ paletaCores: e.target.value })}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Qualidade</label>
              <select
                value={state.configIa.qualidade}
                onChange={(e) => updateConfigIa({ qualidade: e.target.value as 'standard' | 'hd' })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="standard">Padrão</option>
                <option value="hd">HD (mais lento)</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Descrição visual (opcional)</label>
            <textarea
              value={state.configIa.descricaoVisual}
              onChange={(e) => updateConfigIa({ descricaoVisual: e.target.value })}
              rows={2}
              placeholder="Descreva detalhes do visual desejado"
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {state.modo === 'ia_completo' && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Os preços gerados pela IA podem conter erros. Revise antes de publicar.</p>
        </div>
      )}
    </div>
  )
}
