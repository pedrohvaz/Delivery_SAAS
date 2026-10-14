'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, X, Check, UserX, UserCheck, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function AdminsPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['sa-admins'],
    queryFn: () => api.get<{ data: any[] }>('/super-admin/users/admins').then(r => r.data.data),
  })

  const create = useMutation({
    mutationFn: () => api.post('/super-admin/users/admins', { name, email, password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-admins'] })
      setShowNew(false); setName(''); setEmail(''); setPassword('')
      setSuccess('Super admin criado com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erro ao criar admin'),
  })

  const toggleActive = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/users/admins/${id}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-admins'] }),
  })

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Super Admins</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os administradores da plataforma</p>
        </div>
        <button onClick={() => { setShowNew(true); setError('') }}
          className="flex shrink-0 items-center gap-2 h-10 whitespace-nowrap px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
          <Plus className="h-4 w-4" /> Novo Admin
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      {showNew && (
        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Novo Super Admin</h2>
            <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo"
                className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com"
                className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Senha inicial (mín. 6 caracteres)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => create.mutate()} disabled={create.isPending || !name || !email || password.length < 6}
              className="flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
              {create.isPending ? 'Criando...' : <><Check className="h-4 w-4" />Criar</>}
            </button>
            <button onClick={() => setShowNew(false)} className="h-10 px-4 rounded-xl border text-sm hover:bg-muted transition">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admin</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cadastro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>}
            {admins.map((admin: any) => (
              <tr key={admin.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', admin.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                    {admin.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(admin.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActive.mutate(admin.id)} disabled={toggleActive.isPending}
                    className={cn('flex items-center gap-1 text-xs font-medium ml-auto', admin.isActive ? 'text-red-600 hover:underline' : 'text-green-600 hover:underline')}>
                    {admin.isActive ? <><UserX className="h-3.5 w-3.5" />Desativar</> : <><UserCheck className="h-3.5 w-3.5" />Ativar</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
