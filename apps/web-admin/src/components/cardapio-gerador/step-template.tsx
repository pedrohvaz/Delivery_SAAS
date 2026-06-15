'use client'

import { useRef, useState } from 'react'
import { Upload, Download, Check } from 'lucide-react'
import { useCardapioTemplates, useValidarTemplate, type CardapioTemplate } from '@/hooks/use-cardapio-gerador'
import type { CardapioWizardState } from './wizard-state'

interface StepTemplateProps {
  state: CardapioWizardState
  update: (patch: Partial<CardapioWizardState>) => void
}

export function StepTemplate({ state, update }: StepTemplateProps) {
  const { data: templates = [], isLoading } = useCardapioTemplates()
  const validarTemplate = useValidarTemplate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedName, setUploadedName] = useState<string | null>(null)

  function selectTemplate(key: string) {
    update({ templateKey: key, templateCustomizado: null })
    setUploadedName(null)
    setUploadError(null)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const result = await validarTemplate.mutateAsync(json)
      if (result.valido === false) {
        setUploadError(`Template inválido. Faltando: ${result.faltando.join(', ')}`)
        setUploadedName(null)
        return
      }
      update({ templateCustomizado: json, templateKey: null })
      setUploadedName(file.name)
    } catch {
      setUploadError('Arquivo inválido. Envie um JSON com as cores do template.')
      setUploadedName(null)
    } finally {
      e.target.value = ''
    }
  }

  function downloadExample() {
    const example = templates.find((t) => !t.is_promocao) ?? templates[0]
    if (!example) return
    const { key, ...rest } = example
    const blob = new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-exemplo.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const padrao = templates.filter((t) => !t.is_promocao)
  const promo = templates.filter((t) => t.is_promocao)

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Escolha um template</h3>
        <p className="text-sm text-muted-foreground">Selecione uma paleta de cores pronta ou envie a sua.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <TemplateSection title="Padrão" templates={padrao} state={state} onSelect={selectTemplate} />
          {promo.length > 0 && <TemplateSection title="Promoção" templates={promo} state={state} onSelect={selectTemplate} />}
        </>
      )}

      <div className="space-y-3 rounded-xl border border-dashed p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Usar template customizado</p>
            <p className="text-xs text-muted-foreground">Envie um JSON com as cores do template.</p>
          </div>
          <button
            type="button"
            onClick={downloadExample}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> Baixar exemplo
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary"
        >
          <Upload className="h-4 w-4" /> {uploadedName ?? 'Selecionar arquivo JSON'}
        </button>
        {state.templateCustomizado && uploadedName && (
          <p className="flex items-center gap-1.5 text-sm text-green-600">
            <Check className="h-4 w-4" /> Template customizado aplicado
          </p>
        )}
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
      </div>
    </div>
  )
}

function TemplateSection({
  title,
  templates,
  state,
  onSelect,
}: {
  title: string
  templates: CardapioTemplate[]
  state: CardapioWizardState
  onSelect: (key: string) => void
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-3 gap-3">
        {templates.map((template) => {
          const isSelected = state.templateKey === template.key && !state.templateCustomizado
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => onSelect(template.key)}
              className={`relative overflow-hidden rounded-xl border-2 p-3 text-left transition-all ${
                isSelected ? 'border-primary' : 'border-border hover:border-primary/40'
              }`}
              style={{ backgroundColor: template.cor_fundo }}
            >
              {isSelected && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
              )}
              <div className="mb-2 h-3 w-full rounded" style={{ backgroundColor: template.cor_destaque }} />
              <p className="text-xs font-semibold" style={{ color: template.cor_texto }}>
                {template.key}
              </p>
              <div className="mt-2 flex gap-1">
                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: template.cor_card }} />
                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: template.cor_preco }} />
                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: template.cor_categoria }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
