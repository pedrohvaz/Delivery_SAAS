'use client'

import { Input } from '@/components/ui/input'
import { Toggle } from './toggle'
import { ChipList } from './chip-list'
import type { CardapioWizardState } from './wizard-state'

interface StepConfigProps {
  state: CardapioWizardState
  update: (patch: Partial<CardapioWizardState>) => void
}

export function StepConfig({ state, update }: StepConfigProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Informações do cardápio</h3>
        <p className="text-sm text-muted-foreground">Título, rodapé, logo, QR code e informações extras.</p>
      </div>

      <div className="space-y-3">
        <Input label="Título" value={state.titulo} onChange={(e) => update({ titulo: e.target.value })} placeholder="Nome da loja" />
        <Input
          label="Subtítulo"
          value={state.subtitulo}
          onChange={(e) => update({ subtitulo: e.target.value })}
          placeholder="Ex: Cardápio digital"
        />
        <Input
          label="Texto do rodapé"
          value={state.rodapeTexto}
          onChange={(e) => update({ rodapeTexto: e.target.value })}
          placeholder="Ex: Peça já pelo WhatsApp"
        />
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <label className="flex cursor-pointer items-center justify-between">
          <div>
            <p className="text-sm font-medium">Incluir logo</p>
            <p className="text-xs text-muted-foreground">Exibe o logo da loja no cabeçalho</p>
          </div>
          <Toggle checked={state.incluirLogo} onChange={(v) => update({ incluirLogo: v })} />
        </label>
        {state.incluirLogo && (
          <div className="flex items-center gap-3">
            {state.logoUrl ? (
              <img src={state.logoUrl} alt="Logo" className="h-12 w-12 rounded-full border object-cover" />
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum logo cadastrado. Configure em Configurações.</p>
            )}
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Tamanho do logo (px)</label>
              <input
                type="number"
                min={40}
                max={300}
                value={state.logoTamanho}
                onChange={(e) => update({ logoTamanho: Number(e.target.value) })}
                className="mt-1 h-9 w-full rounded-lg border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <label className="flex cursor-pointer items-center justify-between">
          <div>
            <p className="text-sm font-medium">Incluir QR Code</p>
            <p className="text-xs text-muted-foreground">Adiciona um QR code apontando para o cardápio online</p>
          </div>
          <Toggle checked={state.incluirQr} onChange={(v) => update({ incluirQr: v })} />
        </label>
        {state.incluirQr && (
          <div className="space-y-2">
            <Input label="URL do QR Code" value={state.qrUrl} onChange={(e) => update({ qrUrl: e.target.value })} />
            <Input label="Legenda do QR Code" value={state.qrLegenda} onChange={(e) => update({ qrLegenda: e.target.value })} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Informações extras</p>
        <p className="text-xs text-muted-foreground">Ex: frete grátis, horário de funcionamento, formas de pagamento etc.</p>
        <ChipList items={state.infosExtras} onChange={(items) => update({ infosExtras: items })} />
      </div>
    </div>
  )
}
