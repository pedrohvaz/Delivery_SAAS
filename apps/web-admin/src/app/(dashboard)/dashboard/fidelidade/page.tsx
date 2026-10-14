'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'
import { Star, Plus, Check, X } from 'lucide-react'
import { cn } from '@delivery/ui'

interface LoyaltyConfig {
  isEnabled: boolean; pointsPerReal: number; pointsToReal: number
  minRedeemPoints: number; expirationDays: number
}

export default function FidelidadePage() {
  const qc = useQueryClient()
  const { data: config } = useQuery<LoyaltyConfig>({
    queryKey: ['loyalty-config'],
    queryFn: () => api.get<{ data: LoyaltyConfig }>('/loyalty/config').then(r => r.data.data),
  })

  const { data: customersData } = useQuery({
    queryKey: ['loyalty-customers'],
    queryFn: () => api.get<{ data: any[]; total: number }>('/loyalty/customers').then(r => r.data),
  })

  const updateConfig = useMutation({
    mutationFn: (data: Partial<LoyaltyConfig>) => api.patch('/loyalty/config', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-config'] }),
  })

  const addPoints = useMutation({
    mutationFn: ({ customerId, points }: { customerId: string; points: number }) =>
      api.post('/loyalty/add', { customerId, points }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-customers'] }),
  })

  const [ppr, setPpr] = useState('1')
  const [ptr, setPtr] = useState('100')
  const [minRedeem, setMinRedeem] = useState('100')
  const [expDays, setExpDays] = useState('365')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addPts, setAddPts] = useState('')
  const [addError, setAddError] = useState('')

  useEffect(() => {
    if (config) {
      setPpr(String(config.pointsPerReal))
      setPtr(String(config.pointsToReal))
      setMinRedeem(String(config.minRedeemPoints))
      setExpDays(String(config.expirationDays))
    }
  }, [config])

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault()
    setSaveError('')
    const parsedPpr = Number(ppr)
    const parsedPtr = Number(ptr)
    const parsedMin = Number(minRedeem)
    const parsedExp = Number(expDays)
    if (!parsedPpr || parsedPpr < 0.1) { setSaveError('Pontos por R$1 deve ser no mínimo 0,1'); return }
    if (!parsedPtr || parsedPtr < 1) { setSaveError('Pontos para R$1 de desconto deve ser no mínimo 1'); return }
    if (!parsedMin || parsedMin < 1) { setSaveError('Mínimo para resgatar deve ser no mínimo 1'); return }
    if (!parsedExp || parsedExp < 1) { setSaveError('Validade deve ser no mínimo 1 dia'); return }
    try {
      await updateConfig.mutateAsync({ pointsPerReal: parsedPpr, pointsToReal: parsedPtr, minRedeemPoints: parsedMin, expirationDays: parsedExp })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Erro ao salvar configuração.')
    }
  }

  async function handleAddPoints(customerId: string) {
    const pts = parseInt(addPts)
    if (!pts || pts < 1) { setAddError('Informe um valor de pontos válido (mínimo 1)'); return }
    setAddError('')
    try {
      await addPoints.mutateAsync({ customerId, points: pts })
      setAddingId(null)
      setAddPts('')
    } catch (err: any) {
      setAddError(err?.response?.data?.message ?? 'Erro ao adicionar pontos.')
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Fidelidade" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
        <div><h1 className="text-2xl font-bold">Sistema de Fidelidade</h1><p className="text-sm text-muted-foreground mt-1">Recompense seus clientes com pontos a cada compra</p></div>

        {/* Toggle + config */}
        <section className="bg-card border rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center"><Star className="h-5 w-5 text-yellow-600" /></div>
              <div><h2 className="font-semibold">Programa de Pontos</h2><p className="text-xs text-muted-foreground">Clientes ganham pontos a cada pedido</p></div>
            </div>
            <button
              onClick={() => updateConfig.mutate({ isEnabled: !config?.isEnabled })}
              disabled={updateConfig.isPending}
              className={cn('relative h-7 w-12 rounded-full transition-colors disabled:opacity-60', config?.isEnabled ? 'bg-green-500' : 'bg-muted-foreground/30')}>
              <span className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                style={{ transform: config?.isEnabled ? 'translateX(22px)' : 'translateX(2px)' }} />
            </button>
          </div>

          {config?.isEnabled && (
            <form onSubmit={saveConfig} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Pontos por R$1 gasto</label>
                <input type="number" min="0.1" step="0.1" value={ppr} onChange={e => setPpr(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <p className="text-xs text-muted-foreground">Ex: 1 = cliente ganha 1 ponto por R$1</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Pontos para R$1 de desconto</label>
                <input type="number" min="1" value={ptr} onChange={e => setPtr(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <p className="text-xs text-muted-foreground">Ex: 100 = 100 pontos = R$1 de desconto</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Mínimo para resgatar (pts)</label>
                <input type="number" min="1" value={minRedeem} onChange={e => setMinRedeem(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Validade dos pontos (dias)</label>
                <input type="number" min="1" value={expDays} onChange={e => setExpDays(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              {ppr && ptr && (
                <div className="col-span-2 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  💡 Pedido de R$50 → <strong>{(50 * Number(ppr)).toFixed(0)} pontos</strong> → vale <strong>{currency((50 * Number(ppr)) / Number(ptr))}</strong> de desconto
                </div>
              )}
              <div className="col-span-2 space-y-2">
                {saveError && <p className="text-xs text-destructive">{saveError}</p>}
                <button type="submit" disabled={updateConfig.isPending}
                  className="flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
                  {saved ? <><Check className="h-4 w-4" />Salvo!</> : 'Salvar configuração'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Ranking de clientes */}
        <section className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Clientes com Pontos</h2>
            <span className="text-xs text-muted-foreground">{customersData?.total ?? 0} clientes</span>
          </div>
          {(customersData?.data ?? []).length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Nenhum cliente com pontos ainda.</div>
          ) : (
            <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pontos</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total ganho</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total resgatado</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody>
                {(customersData?.data ?? []).map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">{l.customer?.phone}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">{l.points} pts</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.totalEarned} pts</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.totalRedeemed} pts</td>
                    <td className="px-4 py-3">
                      {addingId === l.customer?.id ? (
                        <div className="space-y-1">
                          <div className="flex gap-1.5">
                            <input
                              type="number" min="1" placeholder="pts" value={addPts}
                              onChange={e => { setAddPts(e.target.value); setAddError('') }}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddPoints(l.customer.id); if (e.key === 'Escape') { setAddingId(null); setAddPts(''); setAddError('') } }}
                              autoFocus
                              className="w-16 h-8 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button
                              onClick={() => handleAddPoints(l.customer.id)}
                              disabled={addPoints.isPending}
                              className="h-8 px-2 rounded-lg bg-primary text-primary-foreground text-xs disabled:opacity-50">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setAddingId(null); setAddPts(''); setAddError('') }}
                              className="h-8 px-2 rounded-lg border text-muted-foreground hover:bg-muted">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {addError && <p className="text-xs text-destructive">{addError}</p>}
                        </div>
                      ) : (
                        <button onClick={() => { setAddingId(l.customer?.id); setAddError('') }} className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </section>
      </main>
    </div>
  )
}
