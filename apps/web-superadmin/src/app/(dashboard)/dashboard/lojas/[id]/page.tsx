'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, Store, Phone, MapPin, Users, ShoppingBag,
  Package, UserCircle, ToggleLeft, ToggleRight, Clock,
  MessageCircle, Mail, X, Send, ShieldOff, ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:          { label: 'Pendente',       color: 'bg-yellow-50 text-yellow-700' },
  CONFIRMED:        { label: 'Confirmado',      color: 'bg-blue-50 text-blue-700' },
  IN_PRODUCTION:    { label: 'Em produção',     color: 'bg-orange-50 text-orange-700' },
  OUT_FOR_DELIVERY: { label: 'Saiu p/ entrega', color: 'bg-purple-50 text-purple-700' },
  READY_FOR_PICKUP: { label: 'Pronto p/ retirada', color: 'bg-indigo-50 text-indigo-700' },
  DELIVERED:        { label: 'Entregue',        color: 'bg-green-50 text-green-700' },
  CANCELLED:        { label: 'Cancelado',       color: 'bg-red-50 text-red-700' },
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', OPERATOR: 'Operador', DELIVERY: 'Entregador',
}

type Tab = 'geral' | 'pedidos' | 'usuarios'

export default function LojaDetalhesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('geral')
  const [showContact, setShowContact] = useState(false)
  const [contactMethod, setContactMethod] = useState<'whatsapp' | 'email'>('whatsapp')
  const [contactMsg, setContactMsg] = useState('')
  const [contactLoading, setContactLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['sa-store', id],
    queryFn: () => api.get<{ data: any }>(`/super-admin/stores/${id}`).then((r) => r.data.data),
  })

  const toggleOpen = useMutation({
    mutationFn: () => api.patch(`/super-admin/stores/${id}/toggle-open`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-store', id] }),
  })

  const toggleAccept = useMutation({
    mutationFn: () => api.patch(`/super-admin/stores/${id}/toggle-accept`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-store', id] }),
  })

  const suspend = useMutation({
    mutationFn: () => api.patch(`/super-admin/stores/${id}/suspend`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-store', id] }),
  })
  const activate = useMutation({
    mutationFn: () => api.patch(`/super-admin/stores/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-store', id] }),
  })

  async function handleContact() {
    if (!contactMsg.trim()) return
    setContactLoading(true)
    try {
      const { data: result } = await api.post(`/super-admin/stores/${id}/contact`, { method: contactMethod, message: contactMsg })
      window.open(result.data.url, '_blank')
      setShowContact(false)
      setContactMsg('')
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Erro ao contatar lojista')
    } finally {
      setContactLoading(false)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>
  }

  if (!data) {
    return <div className="p-8 text-muted-foreground">Loja não encontrada.</div>
  }

  const metrics = [
    { label: 'Pedidos', value: data._count.orders, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
    { label: 'Receita', value: `R$ ${Number(data.revenueTotal).toFixed(2).replace('.', ',')}`, icon: Package, color: 'text-green-600 bg-green-50' },
    { label: 'Clientes', value: data._count.customers, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Produtos', value: data._count.products, icon: Package, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div className="p-8 space-y-6">
      {/* Voltar */}
      <Link href="/dashboard/lojas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar para Lojas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden border">
            {data.logoUrl
              ? <img src={data.logoUrl} alt="" className="h-14 w-14 object-cover" />
              : <Store className="h-6 w-6 text-muted-foreground" />
            }
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{data.name}</h1>
            <p className="text-sm text-muted-foreground">/{data.slug} {data.city && `· ${data.city}, ${data.state}`}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleOpen.mutate()}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              data.isOpen ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
            )}
          >
            {data.isOpen ? <><ToggleRight className="h-4 w-4" />Aberta</> : <><ToggleLeft className="h-4 w-4" />Fechada</>}
          </button>
          <button
            onClick={() => toggleAccept.mutate()}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              data.acceptOrders ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
            )}
          >
            {data.acceptOrders ? 'Aceitando pedidos' : 'Bloqueada'}
          </button>
          {/* Suspender / Reativar */}
          {data.status === 'SUSPENDED' ? (
            <button onClick={() => activate.mutate()} disabled={activate.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition">
              <ShieldCheck className="h-4 w-4" /> Reativar
            </button>
          ) : (
            <button onClick={() => suspend.mutate()} disabled={suspend.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 transition">
              <ShieldOff className="h-4 w-4" /> Suspender
            </button>
          )}
          {/* Contatar lojista */}
          <button onClick={() => setShowContact(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-muted text-foreground border-border hover:bg-accent transition">
            <MessageCircle className="h-4 w-4" /> Contatar
          </button>
        </div>
      </div>

      {/* Badge de suspensão */}
      {data.status === 'SUSPENDED' && (
        <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 flex items-center gap-3">
          <ShieldOff className="h-4 w-4 text-orange-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Loja suspensa</p>
            {data.suspendReason && <p className="text-xs text-orange-600">Motivo: {data.suspendReason}</p>}
          </div>
        </div>
      )}

      {/* Modal de contato */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Contatar Lojista</h2>
              <button onClick={() => setShowContact(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setContactMethod('whatsapp')}
                className={cn('flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition',
                  contactMethod === 'whatsapp' ? 'bg-green-50 border-green-300 text-green-700' : 'hover:bg-muted')}>
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
              <button onClick={() => setContactMethod('email')}
                className={cn('flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition',
                  contactMethod === 'email' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-muted')}>
                <Mail className="h-4 w-4" /> E-mail
              </button>
            </div>
            <textarea value={contactMsg} onChange={e => setContactMsg(e.target.value)} rows={4}
              placeholder="Mensagem para o lojista..."
              className="w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={handleContact} disabled={contactLoading || !contactMsg.trim()}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2">
              <Send className="h-4 w-4" />
              {contactLoading ? 'Abrindo...' : contactMethod === 'whatsapp' ? 'Abrir WhatsApp' : 'Abrir E-mail'}
            </button>
            <p className="text-xs text-muted-foreground text-center">Abrirá o app correspondente com a mensagem pronta</p>
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-6">
        {([['geral', 'Visão Geral'], ['pedidos', 'Pedidos Recentes'], ['usuarios', 'Usuários']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'pb-3 text-sm font-medium border-b-2 transition-colors',
              tab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Visão Geral */}
      {tab === 'geral' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Informações</h3>
            {data.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" />{data.phone}</div>}
            {data.whatsapp && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" />WhatsApp: {data.whatsapp}</div>}
            {(data.address || data.city) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[data.address, data.number, data.district, data.city, data.state].filter(Boolean).join(', ')}
              </div>
            )}
            {data.description && <p className="text-sm text-muted-foreground">{data.description}</p>}
            <div className="text-xs text-muted-foreground pt-1">
              Cadastro: {format(new Date(data.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Clock className="h-4 w-4" />Horários</h3>
            {data.schedules.length === 0
              ? <p className="text-sm text-muted-foreground">Sem horários cadastrados</p>
              : data.schedules.map((s: any) => (
                <div key={s.dayOfWeek} className="flex items-center justify-between text-sm">
                  <span className={cn('font-medium', s.isActive ? 'text-foreground' : 'text-muted-foreground line-through')}>
                    {DAY_NAMES[s.dayOfWeek]}
                  </span>
                  <span className="text-muted-foreground">{s.openTime} — {s.closeTime}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Tab: Pedidos */}
      {tab === 'pedidos' && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nº</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Valor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.length === 0
                ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum pedido.</td></tr>
                : data.recentOrders.map((o: any) => {
                    const s = STATUS_LABELS[o.status] ?? { label: o.status, color: 'bg-muted text-muted-foreground' }
                    return (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">#{o.orderNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.customer?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.type}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3">R$ {Number(o.total).toFixed(2).replace('.', ',')}</td>
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(o.createdAt), 'dd/MM/yy HH:mm')}</td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table></div>
        </div>
      )}

      {/* Tab: Usuários */}
      {tab === 'usuarios' && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-mail</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Função</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.users.length === 0
                ? <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário.</td></tr>
                : data.users.map((u: any) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ROLE_LABELS[u.role] ?? u.role}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                          {u.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  )
}
