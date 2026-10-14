'use client'

import { useState } from 'react'
import { Package, AlertTriangle, Check, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useStockProducts, useStockAlerts, useUpdateStock } from '@/hooks/use-stock'
import { currency } from '@/lib/utils'

export default function EstoquePage() {
  const { data: products = [], isLoading } = useStockProducts()
  const { data: alerts = [] } = useStockAlerts()
  const updateStock = useUpdateStock()

  // id do produto sendo editado inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editMin, setEditMin] = useState('')

  function openEdit(id: string, qty: number | null, min: number | null) {
    setEditingId(id)
    setEditQty(qty != null ? String(qty) : '0')
    setEditMin(min != null ? String(min) : '')
  }

  async function saveEdit(id: string) {
    const parsedMin = editMin.trim() === '' ? null : parseInt(editMin)
    await updateStock.mutateAsync({
      id,
      stockQty: parseInt(editQty) || 0,
      minStock: parsedMin !== null && isNaN(parsedMin) ? null : parsedMin,
    })
    setEditingId(null)
  }

  const stockProducts = products.filter((p) => p.stockControl)
  const noStockProducts = products.filter((p) => !p.stockControl)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Controle a disponibilidade dos seus produtos
        </p>
      </div>

      {/* Alertas de estoque baixo */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="font-semibold text-sm">
              {alerts.length} produto{alerts.length !== 1 ? 's' : ''} com estoque baixo ou esgotado
            </p>
          </div>
          <div className="space-y-1.5">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-white border border-orange-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.category.name}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${(a.stockQty ?? 0) <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                    {(a.stockQty ?? 0) <= 0 ? 'Esgotado' : `${a.stockQty} un.`}
                  </p>
                  {a.minStock != null && a.minStock > 0 && (
                    <p className="text-xs text-muted-foreground">mín: {a.minStock}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produtos com controle ativo */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Com controle de estoque ({stockProducts.length})
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : stockProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum produto com controle de estoque ativado.
          </div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="py-2.5 px-4 text-left font-medium">Produto</th>
                  <th className="py-2.5 px-4 text-left font-medium">Categoria</th>
                  <th className="py-2.5 px-4 text-center font-medium">Estoque</th>
                  <th className="py-2.5 px-4 text-center font-medium">Mínimo</th>
                  <th className="py-2.5 px-4 text-center font-medium">Status</th>
                  <th className="py-2.5 px-4 text-center font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {stockProducts.map((p) => {
                  const isLow = p.minStock != null && (p.stockQty ?? 0) <= p.minStock
                  const isEmpty = (p.stockQty ?? 0) <= 0
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="py-3 px-4">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{currency(Number(p.price))}</p>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{p.category.name}</td>

                      {/* Estoque editável inline */}
                      <td className="py-3 px-4 text-center">
                        {editingId === p.id ? (
                          <input
                            type="number" min="0"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(p.id); if (e.key === 'Escape') setEditingId(null) }}
                            autoFocus
                            className="w-16 rounded-lg border px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        ) : (
                          <span
                            className={`font-bold cursor-pointer hover:underline
                              ${isEmpty ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-foreground'}`}
                            onClick={() => openEdit(p.id, p.stockQty, p.minStock)}
                            title="Clique para editar"
                          >
                            {p.stockQty ?? 0}
                          </span>
                        )}
                      </td>

                      {/* Mínimo editável inline */}
                      <td className="py-3 px-4 text-center">
                        {editingId === p.id ? (
                          <input
                            type="number" min="0"
                            placeholder="—"
                            value={editMin}
                            onChange={(e) => setEditMin(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(p.id); if (e.key === 'Escape') setEditingId(null) }}
                            className="w-16 rounded-lg border px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        ) : (
                          <span className="text-muted-foreground">{p.minStock ?? '—'}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold
                          ${p.isActive
                            ? isEmpty ? 'bg-red-100 text-red-700'
                            : isLow ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                            : 'bg-muted text-muted-foreground'}`}>
                          {!p.isActive ? 'Desativado' : isEmpty ? 'Esgotado' : isLow ? 'Baixo' : 'OK'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {editingId === p.id ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => saveEdit(p.id)}
                              disabled={updateStock.isPending}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-lg border px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEdit(p.id, p.stockQty, p.minStock)}
                              className="rounded-lg border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition"
                            >
                              Ajustar
                            </button>
                            <button
                              onClick={() => updateStock.mutate({ id: p.id, stockControl: false })}
                              title="Desativar controle de estoque"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table></div>
          </div>
        )}
      </div>

      {/* Produtos SEM controle — toggle para ativar */}
      {noStockProducts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">
            Sem controle de estoque ({noStockProducts.length})
          </h2>
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="py-2.5 px-4 text-left font-medium">Produto</th>
                  <th className="py-2.5 px-4 text-left font-medium">Categoria</th>
                  <th className="py-2.5 px-4 text-center font-medium">Controle</th>
                </tr>
              </thead>
              <tbody>
                {noStockProducts.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{p.category.name}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => updateStock.mutate({ id: p.id, stockControl: true, stockQty: 0 })}
                        className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-primary transition"
                        title="Ativar controle de estoque"
                      >
                        <ToggleLeft className="h-4 w-4" />
                        Ativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}

      {/* Legenda rápida */}
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Legenda</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />OK — estoque acima do mínimo</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block" />Baixo — abaixo do mínimo configurado</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />Esgotado — produto ocultado do cardápio</span>
          <span className="flex items-center gap-1.5"><ToggleRight className="h-3.5 w-3.5" />Clique em "Ajustar" para editar quantidade</span>
        </div>
      </div>
    </div>
  )
}
