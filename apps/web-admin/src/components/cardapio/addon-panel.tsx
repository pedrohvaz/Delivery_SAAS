'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { MoneyField } from '@/components/ui/money-field'
import { Button } from '@/components/ui/button'
import { cn } from '@delivery/ui'
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, Power } from 'lucide-react'
import {
  useAddonGroups,
  useCreateAddonGroup,
  useUpdateAddonGroup,
  useDeleteAddonGroup,
  useCreateAddonOption,
  useUpdateAddonOption,
  useDeleteAddonOption,
  type Product,
  type AddonGroup,
  type AddonOption,
} from '@/hooks/use-cardapio'

interface Props {
  product: Product
  onClose: () => void
}

// ─── Edit Group Form (inline) ────────────────────────────────────────────────

interface GroupEditState {
  name: string
  min: string
  max: string
  required: boolean
}

// ─── Edit Option Form (inline) ───────────────────────────────────────────────

interface OptionEditState {
  name: string
  price: string
  isActive: boolean
}

export function AddonPanel({ product, onClose }: Props) {
  const { data: groups = [], isLoading } = useAddonGroups(product.id)
  const createGroup = useCreateAddonGroup()
  const updateGroup = useUpdateAddonGroup()
  const deleteGroup = useDeleteAddonGroup()
  const createOption = useCreateAddonOption()
  const updateOption = useUpdateAddonOption()
  const deleteOption = useDeleteAddonOption()

  // ── expand/collapse ──────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // ── create group ─────────────────────────────────────────────────────────
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupMin, setNewGroupMin] = useState('0')
  const [newGroupMax, setNewGroupMax] = useState('1')
  const [newGroupRequired, setNewGroupRequired] = useState(false)

  // ── edit group ───────────────────────────────────────────────────────────
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupForm, setEditGroupForm] = useState<GroupEditState>({ name: '', min: '0', max: '1', required: false })

  // ── create option ────────────────────────────────────────────────────────
  const [newOptionName, setNewOptionName] = useState<Record<string, string>>({})
  const [newOptionPrice, setNewOptionPrice] = useState<Record<string, string>>({})

  // ── edit option ──────────────────────────────────────────────────────────
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [editOptionForm, setEditOptionForm] = useState<OptionEditState>({ name: '', price: '', isActive: true })

  function toggleGroup(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // ── create group ─────────────────────────────────────────────────────────

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    const minVal = parseInt(newGroupMin) || 0
    const maxVal = parseInt(newGroupMax) || 1
    if (minVal > maxVal) {
      alert(`Mínimo (${minVal}) não pode ser maior que o máximo (${maxVal}).`)
      return
    }
    const group = await createGroup.mutateAsync({
      productId: product.id,
      name: newGroupName.trim(),
      min: minVal,
      max: maxVal,
      required: newGroupRequired,
    })
    setNewGroupName(''); setNewGroupMin('0'); setNewGroupMax('1'); setNewGroupRequired(false)
    setAddingGroup(false)
    setExpanded((prev) => ({ ...prev, [group.id]: true }))
  }

  // ── edit group ───────────────────────────────────────────────────────────

  function startEditGroup(group: AddonGroup, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingGroupId(group.id)
    setEditGroupForm({ name: group.name, min: String(group.min), max: String(group.max), required: group.required })
  }

  function cancelEditGroup() {
    setEditingGroupId(null)
  }

  async function handleUpdateGroup(e: React.FormEvent, group: AddonGroup) {
    e.preventDefault()
    const minVal = parseInt(editGroupForm.min) || 0
    const maxVal = parseInt(editGroupForm.max) || 1
    if (minVal > maxVal) {
      alert(`Mínimo (${minVal}) não pode ser maior que o máximo (${maxVal}).`)
      return
    }
    await updateGroup.mutateAsync({
      id: group.id,
      productId: product.id,
      name: editGroupForm.name.trim() || group.name,
      min: minVal,
      max: maxVal,
      required: editGroupForm.required,
    })
    setEditingGroupId(null)
  }

  // ── create option ─────────────────────────────────────────────────────────

  async function handleCreateOption(group: AddonGroup, e: React.FormEvent) {
    e.preventDefault()
    const name = newOptionName[group.id]?.trim()
    if (!name) return
    const price = parseFloat((newOptionPrice[group.id] ?? '0').replace(',', '.')) || 0
    await createOption.mutateAsync({ groupId: group.id, productId: product.id, name, price })
    setNewOptionName((prev) => ({ ...prev, [group.id]: '' }))
    setNewOptionPrice((prev) => ({ ...prev, [group.id]: '' }))
  }

  // ── edit option ──────────────────────────────────────────────────────────

  function startEditOption(option: AddonOption, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingOptionId(option.id)
    setEditOptionForm({ name: option.name, price: option.price > 0 ? String(option.price) : '', isActive: option.isActive })
  }

  function cancelEditOption() {
    setEditingOptionId(null)
  }

  async function handleUpdateOption(e: React.FormEvent, option: AddonOption) {
    e.preventDefault()
    const price = parseFloat((editOptionForm.price ?? '0').replace(',', '.')) || 0
    await updateOption.mutateAsync({
      id: option.id,
      productId: product.id,
      name: editOptionForm.name.trim() || option.name,
      price,
      isActive: editOptionForm.isActive,
    })
    setEditingOptionId(null)
  }

  return (
    <Modal open={true} onClose={onClose} title={`Complementos — ${product.name}`} size="lg">
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {groups.length === 0 && !addingGroup && (
              <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                <p className="text-sm text-muted-foreground">Nenhum grupo de complementos ainda.</p>
                <p className="text-xs text-muted-foreground">Ex: Tamanho, Sabores, Adicionais</p>
              </div>
            )}

            {/* ── Grupos existentes ── */}
            {groups.map((group) => (
              <div key={group.id} className="rounded-lg border overflow-hidden">

                {/* Header do grupo — modo edição inline */}
                {editingGroupId === group.id ? (
                  <form
                    onSubmit={(e) => handleUpdateGroup(e, group)}
                    className="px-4 py-3 bg-muted/40 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Editar grupo</p>
                    <Input
                      label="Nome do grupo"
                      value={editGroupForm.name}
                      onChange={(e) => setEditGroupForm((f) => ({ ...f, name: e.target.value }))}
                      autoFocus
                      required
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        label="Mínimo"
                        type="number"
                        min="0"
                        value={editGroupForm.min}
                        onChange={(e) => setEditGroupForm((f) => ({ ...f, min: e.target.value }))}
                      />
                      <Input
                        label="Máximo"
                        type="number"
                        min="1"
                        value={editGroupForm.max}
                        onChange={(e) => setEditGroupForm((f) => ({ ...f, max: e.target.value }))}
                      />
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-foreground">Obrigatório?</span>
                        <div className="flex items-center h-10 gap-2">
                          <input
                            type="checkbox"
                            checked={editGroupForm.required}
                            onChange={(e) => setEditGroupForm((f) => ({ ...f, required: e.target.checked }))}
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-muted-foreground">{editGroupForm.required ? 'Sim' : 'Não'}</span>
                        </div>
                      </label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="secondary" size="sm" onClick={cancelEditGroup}>
                        <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                      </Button>
                      <Button type="submit" size="sm" loading={updateGroup.isPending}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Salvar
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Header do grupo — modo visualização */
                  <div
                    className="flex items-center gap-3 px-4 py-3 bg-muted/40 cursor-pointer"
                    onClick={() => toggleGroup(group.id)}
                  >
                    {expanded[group.id]
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{group.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {group.required ? 'Obrigatório' : 'Opcional'} · mín {group.min} · máx {group.max}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{group.options.length} opções</span>
                    <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        title="Editar grupo"
                        onClick={(e) => startEditGroup(group, e)}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Excluir grupo"
                        onClick={(e) => { e.stopPropagation(); deleteGroup.mutate({ id: group.id, productId: product.id }) }}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Opções do grupo */}
                {expanded[group.id] && (
                  <div className="p-3 space-y-2">
                    {group.options.map((option) => (
                      <div key={option.id}>
                        {/* Opção — modo edição inline */}
                        {editingOptionId === option.id ? (
                          <form
                            onSubmit={(e) => handleUpdateOption(e, option)}
                            className="flex items-end gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                          >
                            <div className="flex-1">
                              <Input
                                placeholder="Nome da opção"
                                value={editOptionForm.name}
                                onChange={(e) => setEditOptionForm((f) => ({ ...f, name: e.target.value }))}
                                autoFocus
                              />
                            </div>
                            <div className="w-28">
                              <MoneyField
                                aria-label="Preço adicional"
                                placeholder="+ R$ 0,00"
                                value={editOptionForm.price}
                                onValueChange={(v) => setEditOptionForm((f) => ({ ...f, price: v }))}
                              />
                            </div>
                            <button
                              type="button"
                              title={editOptionForm.isActive ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}
                              onClick={() => setEditOptionForm((f) => ({ ...f, isActive: !f.isActive }))}
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                                editOptionForm.isActive
                                  ? 'border-green-300 bg-green-50 text-green-600'
                                  : 'border-border text-muted-foreground hover:bg-accent',
                              )}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                            <Button type="submit" size="sm" loading={updateOption.isPending} title="Salvar">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={cancelEditOption} title="Cancelar">
                              <X className="h-4 w-4" />
                            </Button>
                          </form>
                        ) : (
                          /* Opção — modo visualização */
                          <div className={cn(
                            'flex items-center gap-3 rounded-lg border bg-card px-3 py-2',
                            !option.isActive && 'opacity-50',
                          )}>
                            <span className="flex-1 text-sm">{option.name}</span>
                            {!option.isActive && (
                              <span className="text-xs text-muted-foreground italic">Inativa</span>
                            )}
                            <span className="text-sm font-medium text-primary shrink-0">
                              {option.price > 0
                                ? `+${Number(option.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                : 'Grátis'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                title="Editar opção"
                                onClick={(e) => startEditOption(option, e)}
                                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                title="Excluir opção"
                                onClick={() => deleteOption.mutate({ id: option.id, productId: product.id })}
                                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Adicionar opção */}
                    <form onSubmit={(e) => handleCreateOption(group, e)} className="flex items-end gap-2 pt-1">
                      <div className="flex-1">
                        <Input
                          placeholder="Nome da opção (Ex: Médio)"
                          value={newOptionName[group.id] ?? ''}
                          onChange={(e) => setNewOptionName((p) => ({ ...p, [group.id]: e.target.value }))}
                        />
                      </div>
                      <div className="w-28">
                        <MoneyField
                          aria-label="Preço adicional"
                          placeholder="+ R$ 0,00"
                          value={newOptionPrice[group.id] ?? ''}
                          onValueChange={(v) => setNewOptionPrice((p) => ({ ...p, [group.id]: v }))}
                        />
                      </div>
                      <Button type="submit" size="sm" variant="secondary" loading={createOption.isPending}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ))}

            {/* ── Formulário novo grupo ── */}
            {addingGroup ? (
              <form onSubmit={handleCreateGroup} className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Novo grupo de complementos</p>
                <Input
                  label="Nome do grupo"
                  placeholder="Ex: Tamanho, Sabores, Adicionais"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  required
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Mínimo" type="number" min="0" value={newGroupMin} onChange={(e) => setNewGroupMin(e.target.value)} />
                  <Input label="Máximo" type="number" min="1" value={newGroupMax} onChange={(e) => setNewGroupMax(e.target.value)} />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-foreground">Obrigatório?</span>
                    <div className="flex items-center h-10 gap-2">
                      <input
                        type="checkbox"
                        checked={newGroupRequired}
                        onChange={(e) => setNewGroupRequired(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-muted-foreground">{newGroupRequired ? 'Sim' : 'Não'}</span>
                    </div>
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setAddingGroup(false)}>Cancelar</Button>
                  <Button type="submit" size="sm" loading={createGroup.isPending}>Criar grupo</Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setAddingGroup(true)} className="w-full">
                <Plus className="mr-1.5 h-4 w-4" /> Adicionar grupo de complementos
              </Button>
            )}
          </>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </Modal>
  )
}
