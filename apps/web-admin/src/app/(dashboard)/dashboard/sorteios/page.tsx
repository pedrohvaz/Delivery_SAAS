'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { Gift, Plus, Trash2, Play, Users, X, Check, Copy, Trophy } from 'lucide-react'
import { cn } from '@delivery/ui'
import { useAuthStore } from '@/store/auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  OPEN:   { label: 'Aberto',   color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Encerrado', color: 'bg-muted text-muted-foreground' },
  DRAWN:  { label: 'Sorteado', color: 'bg-purple-100 text-purple-700' },
}

export default function SorteiosPage() {
  const qc = useQueryClient()
  const { store } = useAuthStore()
  const [showNew, setShowNew] = useState(false)
  const [selectedRaffle, setSelectedRaffle] = useState<any | null>(null)
  const [form, setForm] = useState({ title: '', description: '', prize: '', drawAt: '' })
  const [createError, setCreateError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const { data: raffles = [], isLoading } = useQuery({
    queryKey: ['raffles'],
    queryFn: () => api.get<{ data: any[] }>('/raffles').then(r => r.data.data),
  })

  const { data: entries = [] } = useQuery({
    queryKey: ['raffle-entries', selectedRaffle?.id],
    queryFn: () => api.get<{ data: any[] }>(`/raffles/${selectedRaffle.id}/entries`).then(r => r.data.data),
    enabled: !!selectedRaffle?.id,
  })

  const create = useMutation({
    mutationFn: () => api.post('/raffles', { ...form, drawAt: form.drawAt ? new Date(form.drawAt).toISOString() : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['raffles'] })
      setShowNew(false)
      setForm({ title: '', description: '', prize: '', drawAt: '' })
      setCreateError('')
    },
    onError: (err: any) => {
      setCreateError(err?.response?.data?.message ?? 'Erro ao criar sorteio.')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/raffles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['raffles'] }),
  })

  const draw = useMutation({
    mutationFn: (id: string) => api.post<{ data: any }>(`/raffles/${id}/draw`).then(r => r.data.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['raffles'] })
      setSelectedRaffle(null)
      alert(`🎉 Vencedor: ${data.winner.name} (${data.winner.phone})`)
    },
  })

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/raffles/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['raffles'] }),
  })

  function copyLink(slug: string, id: string) {
    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3001'}/${slug}/sorteio/${id}`)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Sorteios" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-bold">Sorteios</h1><p className="text-sm text-muted-foreground mt-1">Crie sorteios para engajar seus clientes</p></div>
          <button onClick={() => setShowNew(true)} className="flex shrink-0 self-start sm:self-auto items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
            <Plus className="h-4 w-4" /> Novo Sorteio
          </button>
        </div>

        {showNew && (
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Novo Sorteio</h2>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Sorteio de Aniversário"
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Prêmio *</label>
                <input value={form.prize} onChange={e => setForm(f => ({ ...f, prize: e.target.value }))} placeholder="Ex: Pizza Grande + Refrigerante"
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Descrição</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Regras do sorteio..."
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data do sorteio</label>
                <input type="datetime-local" value={form.drawAt} onChange={e => setForm(f => ({ ...f, drawAt: e.target.value }))}
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            {createError && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{createError}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.prize}
                className="flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
                <Check className="h-4 w-4" />{create.isPending ? 'Criando...' : 'Criar Sorteio'}
              </button>
              <button onClick={() => { setShowNew(false); setCreateError('') }} className="h-10 px-4 rounded-xl border text-sm hover:bg-muted transition">Cancelar</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading && [1,2].map(i => <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />)}
          {raffles.length === 0 && !isLoading && (
            <div className="col-span-2 rounded-2xl border border-dashed p-10 text-center">
              <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum sorteio criado ainda</p>
            </div>
          )}
          {raffles.map((raffle: any) => {
            const st = STATUS_MAP[raffle.status] ?? { label: raffle.status, color: 'bg-muted text-muted-foreground' }
            return (
              <div key={raffle.id} className="bg-card border rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-foreground">{raffle.title}</h3>
                    <p className="text-sm text-muted-foreground">🎁 {raffle.prize}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', st.color)}>{st.label}</span>
                </div>
                {raffle.drawAt && <p className="text-xs text-muted-foreground">📅 Sorteio: {format(new Date(raffle.drawAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{raffle._count?.entries ?? 0} participante(s)</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => setSelectedRaffle(raffle)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <Users className="h-3.5 w-3.5" /> Ver participantes
                  </button>
                  <button
                    onClick={() => copyLink(store?.slug ?? '', raffle.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                    title="Copiar link de participação"
                  >
                    {copied === raffle.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === raffle.id ? 'Copiado!' : 'Copiar link'}
                  </button>
                  {raffle.status === 'OPEN' && (
                    <>
                      <button
                        onClick={() => {
                          if (confirm(`Realizar o sorteio "${raffle.title}" agora? Esta ação não pode ser desfeita.`))
                            draw.mutate(raffle.id)
                        }}
                        disabled={draw.isPending}
                        className="flex items-center gap-1 text-xs text-purple-600 hover:underline font-medium">
                        <Trophy className="h-3.5 w-3.5" /> Sortear
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Encerrar "${raffle.title}"? Nenhum novo participante poderá se inscrever.`))
                            toggle.mutate({ id: raffle.id, status: 'CLOSED' })
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:underline">
                        Encerrar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Excluir o sorteio "${raffle.title}"? Todos os participantes serão removidos.`))
                        remove.mutate(raffle.id)
                    }}
                    className="flex items-center gap-1 text-xs text-red-600 hover:underline ml-auto">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal participantes */}
        {selectedRaffle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between p-5 border-b">
                <div><h2 className="font-bold">{selectedRaffle.title}</h2><p className="text-xs text-muted-foreground">{entries.length} participante(s)</p></div>
                <button onClick={() => setSelectedRaffle(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {entries.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum participante ainda.</p>
                  : entries.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{e.name[0].toUpperCase()}</div>
                      <div><p className="text-sm font-medium">{e.name}</p><p className="text-xs text-muted-foreground">{e.phone}</p></div>
                      <p className="ml-auto text-xs text-muted-foreground">{format(new Date(e.createdAt), 'dd/MM HH:mm')}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
