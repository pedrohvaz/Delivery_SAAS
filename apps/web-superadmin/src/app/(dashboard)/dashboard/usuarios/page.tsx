'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Search, UserX, UserCheck, KeyRound, X, Check } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN:    { label: 'Admin',      color: 'bg-blue-50 text-blue-700' },
  OPERATOR: { label: 'Operador',   color: 'bg-muted text-muted-foreground' },
  DELIVERY: { label: 'Entregador', color: 'bg-green-50 text-green-700' },
}

function ResetPasswordModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const qc = useQueryClient()

  const reset = useMutation({
    mutationFn: () => api.post(`/super-admin/users/${userId}/reset-password`, { newPassword: password }),
    onSuccess: () => { setDone(true); setTimeout(onClose, 1500) },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Resetar senha</h2>
            <p className="text-sm text-muted-foreground">{userName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        {done ? (
          <div className="flex items-center gap-2 text-green-700 py-4 justify-center">
            <Check className="h-5 w-5" /> Senha resetada com sucesso!
          </div>
        ) : (
          <>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)"
              className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirmar senha"
              className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {confirm && password !== confirm && <p className="text-xs text-destructive">Senhas não coincidem</p>}
            <button onClick={() => reset.mutate()} disabled={reset.isPending || password.length < 6 || password !== confirm}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
              {reset.isPending ? 'Resetando...' : 'Confirmar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [role, setRole] = useState('')
  const [resetUser, setResetUser] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sa-users', page, search, role],
    queryFn: () => {
      const q = new URLSearchParams({ page: String(page) })
      if (search) q.set('search', search)
      if (role) q.set('role', role)
      return api.get<{ data: any[]; total: number; totalPages: number }>(`/super-admin/users?${q}`).then(r => r.data)
    },
    placeholderData: p => p,
  })

  const toggleActive = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/users/${id}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-users'] }),
  })

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários das Lojas</h1>
        <p className="text-sm text-muted-foreground mt-1">Todos os usuários cadastrados no sistema</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por nome ou e-mail..."
            className="w-full h-10 pl-9 pr-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" />
        </div>
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1) }}
          className="h-10 px-3 rounded-md border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos os papéis</option>
          <option value="ADMIN">Admin</option>
          <option value="OPERATOR">Operador</option>
          <option value="DELIVERY">Entregador</option>
        </select>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div data-table-scroll className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loja</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Papel</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cadastro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>}
            {!isLoading && (data?.data ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>}
            {(data?.data ?? []).map((user: any) => {
              const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: 'bg-muted text-muted-foreground' }
              return (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.store ? (
                      <Link href={`/dashboard/lojas/${user.store.id}`} className="text-blue-600 hover:underline text-xs">
                        {user.store.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', roleInfo.color)}>{roleInfo.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', user.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setResetUser({ id: user.id, name: user.name })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <KeyRound className="h-3.5 w-3.5" /> Senha
                      </button>
                      <button onClick={() => toggleActive.mutate(user.id)} disabled={toggleActive.isPending}
                        className={cn('flex items-center gap-1 text-xs font-medium', user.isActive ? 'text-red-600 hover:underline' : 'text-green-600 hover:underline')}>
                        {user.isActive ? <><UserX className="h-3.5 w-3.5" />Desativar</> : <><UserCheck className="h-3.5 w-3.5" />Ativar</>}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.total} usuários</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-md hover:bg-muted disabled:opacity-40">Anterior</button>
            <span className="px-3 py-1.5">{page} / {data.totalPages}</span>
            <button disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-md hover:bg-muted disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}

      {resetUser && <ResetPasswordModal userId={resetUser.id} userName={resetUser.name} onClose={() => setResetUser(null)} />}
    </div>
  )
}
