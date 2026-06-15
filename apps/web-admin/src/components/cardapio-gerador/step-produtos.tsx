'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { CardapioWizardState, WizardProduto } from './wizard-state'

interface StepProdutosProps {
  state: CardapioWizardState
  update: (patch: Partial<CardapioWizardState>) => void
}

export function StepProdutos({ state, update }: StepProdutosProps) {
  const [comboNome, setComboNome] = useState('')
  const [comboDescricao, setComboDescricao] = useState('')
  const [comboPreco, setComboPreco] = useState('')
  const [comboCategoria, setComboCategoria] = useState('Combos')

  const produtosPorCategoria = state.produtos.reduce<Record<string, WizardProduto[]>>((acc, produto) => {
    (acc[produto.categoria] ??= []).push(produto)
    return acc
  }, {})

  function toggleProduto(id: string) {
    update({
      produtos: state.produtos.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)),
    })
  }

  function setDesconto(id: string, value: string) {
    const desconto = value === '' ? undefined : Math.min(99, Math.max(1, Number(value)))
    update({
      produtos: state.produtos.map((p) => (p.id === id ? { ...p, desconto } : p)),
    })
  }

  function removeProduto(id: string) {
    update({ produtos: state.produtos.filter((p) => p.id !== id) })
  }

  function handleAddCombo() {
    const preco = Number(comboPreco.replace(',', '.'))
    if (!comboNome.trim() || !Number.isFinite(preco) || preco <= 0) return

    const novoCombo: WizardProduto = {
      id: crypto.randomUUID(),
      nome: comboNome.trim(),
      descricao: comboDescricao.trim(),
      preco,
      categoria: comboCategoria.trim() || 'Combos',
      selected: true,
      isCustom: true,
    }

    update({ produtos: [...state.produtos, novoCombo] })
    setComboNome('')
    setComboDescricao('')
    setComboPreco('')
    setComboCategoria('Combos')
  }

  const selectedCount = state.produtos.filter((p) => p.selected).length

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Selecione os produtos</h3>
        <p className="text-sm text-muted-foreground">
          Escolha quais produtos vão aparecer no cardápio e, se quiser, defina um desconto para cada um.
        </p>
      </div>

      {state.produtos.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum produto cadastrado ainda. Cadastre produtos em Cardápio antes de gerar a imagem.
        </p>
      ) : (
        <div className="space-y-5">
          {Object.entries(produtosPorCategoria).map(([categoria, produtos]) => (
            <div key={categoria} className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">{categoria}</h4>
              <div className="space-y-2">
                {produtos.map((produto) => (
                  <div key={produto.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2">
                    <input
                      type="checkbox"
                      checked={produto.selected}
                      onChange={() => toggleProduto(produto.id)}
                      className="h-4 w-4 rounded"
                    />
                    {produto.imagem_url && (
                      <img src={produto.imagem_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {produto.nome}
                        {produto.isCustom && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                            Combo
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">R$ {produto.preco.toFixed(2)}</p>
                    </div>
                    {produto.selected && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Desconto %</span>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          placeholder="-"
                          value={produto.desconto ?? ''}
                          onChange={(e) => setDesconto(produto.id, e.target.value)}
                          className="h-8 w-16 rounded-lg border border-input px-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    )}
                    {produto.isCustom && (
                      <button type="button" onClick={() => removeProduto(produto.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{selectedCount} produto(s) selecionado(s)</p>

      {/* Combo / item com preço total */}
      <div className="space-y-3 rounded-xl border border-dashed p-4">
        <div>
          <p className="text-sm font-medium">Adicionar combo ou item com preço total</p>
          <p className="text-xs text-muted-foreground">
            Útil para combos (ex: "Combo Casal") onde você quer mostrar um preço total único, em vez do preço de cada produto.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Nome do combo" value={comboNome} onChange={(e) => setComboNome(e.target.value)} />
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="Preço total (R$)"
            value={comboPreco}
            onChange={(e) => setComboPreco(e.target.value)}
          />
          <Input
            placeholder="Descrição (opcional)"
            value={comboDescricao}
            onChange={(e) => setComboDescricao(e.target.value)}
            className="sm:col-span-2"
          />
          <Input placeholder="Categoria" value={comboCategoria} onChange={(e) => setComboCategoria(e.target.value)} />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAddCombo}
          disabled={!comboNome.trim() || !comboPreco}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Adicionar combo
        </Button>
      </div>
    </div>
  )
}
