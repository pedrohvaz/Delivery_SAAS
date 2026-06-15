'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { useProducts, useCategories } from '@/hooks/use-cardapio'
import { useAuthStore } from '@/store/auth'
import { INITIAL_WIZARD_STATE, type CardapioWizardState, type WizardProduto } from '@/components/cardapio-gerador/wizard-state'
import { StepProdutos } from '@/components/cardapio-gerador/step-produtos'
import { StepTemplate } from '@/components/cardapio-gerador/step-template'
import { StepConfig } from '@/components/cardapio-gerador/step-config'
import { StepModo } from '@/components/cardapio-gerador/step-modo'
import { StepRevisao } from '@/components/cardapio-gerador/step-revisao'

const STEPS = [
  { step: 1, label: 'Produtos' },
  { step: 2, label: 'Template' },
  { step: 3, label: 'Informações' },
  { step: 4, label: 'Modo' },
  { step: 5, label: 'Revisão' },
] as const

export default function GerarCardapioPage() {
  const { data: products } = useProducts()
  const { data: categories } = useCategories()
  const { store } = useAuthStore()

  const [state, setState] = useState<CardapioWizardState>(INITIAL_WIZARD_STATE)

  function update(patch: Partial<CardapioWizardState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  // Popula produtos e dados da loja na primeira carga
  useEffect(() => {
    if (!products || state.produtos.length > 0) return

    const categoriesById = new Map((categories ?? []).map((c) => [c.id, c.name]))
    const produtos: WizardProduto[] = products.map((product) => ({
      id: product.id,
      nome: product.name,
      descricao: product.description ?? '',
      preco: Number(product.price),
      categoria: product.category?.name ?? categoriesById.get(product.categoryId) ?? 'Outros',
      imagem_url: product.imageUrl,
      selected: false,
    }))

    setState((prev) => ({
      ...prev,
      produtos,
      titulo: prev.titulo || store?.name || '',
      logoUrl: store?.logoUrl ?? null,
      qrUrl: store?.slug ? `${process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3001'}/${store.slug}` : prev.qrUrl,
    }))
  }, [products, categories, store, state.produtos.length])

  function canGoNext(): boolean {
    switch (state.step) {
      case 1:
        return state.produtos.some((p) => p.selected)
      case 2:
        return !!(state.templateKey || state.templateCustomizado)
      case 3:
        return state.titulo.trim().length > 0
      default:
        return true
    }
  }

  function goNext() {
    if (state.step < 5 && canGoNext()) update({ step: (state.step + 1) as CardapioWizardState['step'] })
  }

  function goBack() {
    if (state.step > 1) update({ step: (state.step - 1) as CardapioWizardState['step'] })
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Gerar imagem do cardápio" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Indicador de progresso */}
          <div className="flex items-center gap-2">
            {STEPS.map(({ step, label }, i) => (
              <div key={step} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    state.step >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step}
                </div>
                <span className={`hidden text-xs font-medium sm:block ${state.step >= step ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className={`h-px flex-1 ${state.step > step ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          {/* Conteúdo do passo */}
          <div className="rounded-2xl border bg-card p-5">
            {state.step === 1 && <StepProdutos state={state} update={update} />}
            {state.step === 2 && <StepTemplate state={state} update={update} />}
            {state.step === 3 && <StepConfig state={state} update={update} />}
            {state.step === 4 && <StepModo state={state} update={update} />}
            {state.step === 5 && <StepRevisao state={state} update={update} />}
          </div>

          {/* Navegação */}
          {!(state.step === 5 && state.resultImageUrl) && (
            <div className="flex justify-between">
              <Button type="button" variant="secondary" onClick={goBack} disabled={state.step === 1}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
              {state.step < 5 && (
                <Button type="button" onClick={goNext} disabled={!canGoNext()}>
                  Próximo <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
