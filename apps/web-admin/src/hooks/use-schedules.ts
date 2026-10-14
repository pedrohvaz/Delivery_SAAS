import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export interface Schedule {
  id: string
  dayOfWeek: number
  openTime: string
  closeTime: string
  isActive: boolean
}

export interface ScheduleStatus {
  isOpen: boolean
  shouldBeOpen: boolean
  acceptOrders: boolean
  autoSchedule: boolean
  nextOpenTime: string | null
  pausedUntil: string | null
  closesAt: string | null
  specialToday: { isClosed: boolean; openTime: string | null; closeTime: string | null; note: string | null } | null
  timezone: string
}

export interface SpecialDay {
  id: string
  date: string
  isClosed: boolean
  openTime: string | null
  closeTime: string | null
  note: string | null
}

export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.get<{ data: Schedule[] }>('/schedules').then((r) => r.data.data),
  })
}

export function useScheduleStatus() {
  return useQuery({
    queryKey: ['schedule-status'],
    queryFn: () => api.get<{ data: ScheduleStatus }>('/schedules/status').then((r) => r.data.data),
    refetchInterval: 60_000, // atualiza a cada minuto
  })
}

export function useSaveSchedules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (schedules: Omit<Schedule, 'id'>[]) =>
      api.put<{ data: Schedule[] }>('/schedules', { schedules }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] })
      qc.invalidateQueries({ queryKey: ['schedule-status'] })
    },
  })
}

export function useToggleStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch<{ data: { isOpen: boolean } }>('/schedules/toggle').then((r) => r.data.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['schedule-status'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
      useAuthStore.setState((state) => ({
        store: state.store ? { ...state.store, isOpen: data.isOpen } : null,
      }))
    },
  })
}

export function useToggleAutoSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) =>
      api.patch<{ data: { autoSchedule: boolean; isOpen: boolean } }>('/schedules/auto', { enabled }).then((r) => r.data.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['schedule-status'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
      useAuthStore.setState((state) => ({
        store: state.store ? { ...state.store, isOpen: data.isOpen } : null,
      }))
    },
  })
}

// Atualiza o status da loja no painel inteiro (cabeçalho, menu) depois de abrir/fechar/pausar
function refreshOpenState(qc: ReturnType<typeof useQueryClient>, isOpen: boolean) {
  qc.invalidateQueries({ queryKey: ['schedule-status'] })
  qc.invalidateQueries({ queryKey: ['settings'] })
  useAuthStore.setState((state) => ({ store: state.store ? { ...state.store, isOpen } : null }))
}

export function usePauseStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (minutes: number) =>
      api.patch<{ data: { isOpen: boolean } }>('/schedules/pause', { minutes }).then((r) => r.data.data),
    onSuccess: (data) => refreshOpenState(qc, data.isOpen),
  })
}

export function useSpecialDays() {
  return useQuery({
    queryKey: ['special-days'],
    queryFn: () => api.get<{ data: SpecialDay[] }>('/schedules/special-days').then((r) => r.data.data),
  })
}

export function useSaveSpecialDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: Omit<SpecialDay, 'id'>) => api.put('/schedules/special-days', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['special-days'] })
      qc.invalidateQueries({ queryKey: ['schedule-status'] })
    },
  })
}

export function useDeleteSpecialDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/schedules/special-days/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['special-days'] })
      qc.invalidateQueries({ queryKey: ['schedule-status'] })
    },
  })
}
