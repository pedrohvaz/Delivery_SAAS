'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, QrCode, Check, X, RefreshCw, Copy, ExternalLink } from 'lucide-react'
import {
  useTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useRegenerateQr,
  type Table,
} from '@/hooks/use-tables'
import { useAuthStore } from '@/store/auth'

interface FormState {
  number: string
  label: string
  capacity: string
  isActive: boolean
}

const EMPTY_FORM: FormState = { number: '', label: '', capacity: '4', isActive: true }

function getQrUrl(store: { slug: string } | null, token: string): string {
  if (!store || !token) return ''
  const base = process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3001'
  return `${base}/${store.slug}/mesa/${token}`
}

export default function MesasPage() {
  const { data: tables = [], isLoading } = useTables()
  const createTable = useCreateTable()
  const updateTable = useUpdateTable()
  const deleteTable = useDeleteTable()
  const regenerateQr = useRegenerateQr()
  const { store } = useAuthStore()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showQrId, setShowQrId] = useState<string | null>(null)

  function set(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function openCreate() {
    // Sugere próximo número disponível
    const maxNum = tables.length > 0 ? Math.max(...tables.map((t) => t.number)) : 0
    setEditingId(null)
    setForm({ ...EMPTY_FORM, number: String(maxNum + 1) })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(t: Table) {
    setEditingId(t.id)
    setForm({
      number: String(t.number),
      label: t.label ?? '',
      capacity: String(t.capacity),
      isActive: t.isActive,
    })
    setFormError('')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const number = parseInt(form.number)
    if (!number || number < 1) { setFormError('Número inválido'); return }
    const capacity = parseInt(form.capacity) || 4

    try {
      if (editingId) {
        await updateTable.mutateAsync({
          id: editingId,
          number,
          label: form.label.trim() || undefined,
          capacity,
          isActive: form.isActive,
        })
      } else {
        await createTable.mutateAsync({
          number,
          label: form.label.trim() || undefined,
          capacity,
        })
      }
      cancelForm()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Erro ao salvar mesa')
    }
  }

  async function handleCopyLink(table: Table) {
    const url = getQrUrl(store, table.qrToken)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(table.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback: seleciona o texto manualmente se clipboard não tiver permissão
      prompt('Copie o link da mesa:', url)
    }
  }

  const isPending = createTable.isPending || updateTable.isPending

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mesas e QR Code</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure as mesas do salão e gere QR Codes para autoatendimento
          </p>
        </div>
        {!showForm && (
          <button onClick={openCreate}
            className="flex shrink-0 self-start sm:self-auto items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" />
            Nova mesa
          </button>
        )}
      </div>

      {/* Formulário inline */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? 'Editar mesa' : 'Nova mesa'}</h2>
            <button type="button" onClick={cancelForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Número *</label>
              <input type="number" min="1"
                className="h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.number}
                onChange={(e) => set('number', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Nome / Label</label>
              <input
                className="h-10 w-full rounded-xl border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="ex: Varanda 1"
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Capacidade</label>
              <input type="number" min="1"
                className="h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.capacity}
                onChange={(e) => set('capacity', e.target.value)}
              />
            </div>
          </div>

          {editingId && (
            <label className="flex items-center gap-3 cursor-pointer">
              <button type="button" onClick={() => set('isActive', !form.isActive)}
                className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none
                  ${form.isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                  ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm font-medium">Mesa ativa</span>
            </label>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
              <Check className="h-4 w-4" />
              {isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar mesa'}
            </button>
            <button type="button" onClick={cancelForm}
              className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de mesas */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : tables.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
          <QrCode className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">Nenhuma mesa cadastrada</p>
          <p className="text-xs text-muted-foreground">
            Crie as mesas do salão e gere QR Codes para autoatendimento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map((t) => {
            const url = getQrUrl(store, t.qrToken)
            return (
              <div key={t.id}
                className={`rounded-2xl border bg-card p-4 flex flex-col gap-3 ${!t.isActive ? 'opacity-60' : ''}`}>
                {/* Número + status */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-black text-foreground leading-none">
                      {t.number}
                    </p>
                    {t.label && <p className="text-xs text-muted-foreground mt-0.5">{t.label}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {t.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>

                {/* Capacidade */}
                <p className="text-xs text-muted-foreground">
                  👥 {t.capacity} {t.capacity === 1 ? 'pessoa' : 'pessoas'}
                </p>

                {/* QR expandido */}
                {showQrId === t.id && (
                  <div className="rounded-xl bg-white border p-3 text-center space-y-2">
                    {/* QR visual usando Google Charts API-free / qr-server.com */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`}
                      alt={`QR Mesa ${t.number}`}
                      className="w-40 h-40 mx-auto"
                    />
                    <p className="text-[10px] text-muted-foreground break-all">{url}</p>
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-1.5 flex-wrap mt-auto">
                  <button
                    onClick={() => setShowQrId(showQrId === t.id ? null : t.id)}
                    title="Ver QR Code"
                    className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition
                      ${showQrId === t.id ? 'bg-primary/10 text-primary' : 'border text-muted-foreground hover:bg-muted'}`}>
                    <QrCode className="h-3.5 w-3.5" />
                    QR
                  </button>
                  <button onClick={() => handleCopyLink(t)}
                    title="Copiar link"
                    className="flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition">
                    {copiedId === t.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    Link
                  </button>
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer"
                      title="Abrir página da mesa"
                      className="flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      if (confirm(`Gerar novo QR para Mesa ${t.number}? O QR Code anterior será invalidado e quaisquer links impressos pararão de funcionar.`))
                        regenerateQr.mutate(t.id)
                    }}
                    title="Gerar novo QR (invalida o anterior)"
                    disabled={regenerateQr.isPending}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted transition">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openEdit(t)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted transition">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir Mesa ${t.number}${t.label ? ` (${t.label})` : ''}? Esta ação não pode ser desfeita.`))
                        deleteTable.mutate(t.id)
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
