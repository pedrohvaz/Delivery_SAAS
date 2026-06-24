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
