'use client'

import { useState, useEffect } from 'react'
import { Clock, Power, Save, AlertCircle, Check, CalendarClock } from 'lucide-react'
import {
  useSchedules,
  useScheduleStatus,
  useSaveSchedules,
  useToggleStore,
  useToggleAutoSchedule,
  DAY_NAMES,
  DAY_SHORT,
  type Schedule,
} from '@/hooks/use-schedules'

interface DayState {
  dayOfWeek: number
  isActive: boolean
  openTime: string
  closeTime: string
}

const DEFAULT_TIMES = { openTime: '08:00', closeTime: '22:00' }

function buildDefaultDays(): DayState[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    isActive: i >= 1 && i <= 5, // Seg–Sex por padrão
    ...DEFAULT_TIMES,
  }))
}

function schedulesToDays(schedules: Schedule[]): DayState[] {
  const base = buildDefaultDays()
  for (const s of schedules) {
    const idx = base.findIndex((d) => d.dayOfWeek === s.dayOfWeek)
    if (idx !== -1) {
      base[idx] = { dayOfWeek: s.dayOfWeek, isActive: s.isActive, openTime: s.openTime, closeTime: s.closeTime }
    }
  }
  return base
}

export default function HorariosPage() {
  const { data: schedules, isLoading } = useSchedules()
  const { data: status } = useScheduleStatus()
  const saveSchedules = useSaveSchedules()
  const toggleStore = useToggleStore()
  const toggleAuto = useToggleAutoSchedule()

  const [days, setDays] = useState<DayState[]>(buildDefaultDays())
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Inicializa os dias quando os dados chegam da API
  useEffect(() => {
    if (schedules) setDays(schedulesToDays(schedules))
  }, [schedules])

  function setDay(dayOfWeek: number, patch: Partial<DayState>) {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)),
    )
  }

  // Copia horário de um dia para todos os dias ativos
  function copyToAll(dayOfWeek: number) {
    const source = days.find((d) => d.dayOfWeek === dayOfWeek)
    if (!source) return
    setDays((prev) =>
      prev.map((d) =>
        d.isActive && d.dayOfWeek !== dayOfWeek
          ? { ...d, openTime: source.openTime, closeTime: source.closeTime }
          : d,
      ),
    )
  }

  async function handleSave() {
    setSaveError('')

    // Valida horários dos dias ativos
    const invalidDay = days.find((d) => d.isActive && d.closeTime <= d.openTime)
    if (invalidDay) {
      setSaveError(
        `Horário inválido em ${DAY_NAMES[invalidDay.dayOfWeek]}: o fechamento deve ser posterior à abertura.`,
      )
      return
    }

    try {
      // Envia TODOS os dias (ativos e inativos) para preservar os horários configurados
      await saveSchedules.mutateAsync(
        days.map(({ dayOfWeek, openTime, closeTime, isActive }) => ({
          dayOfWeek, openTime, closeTime, isActive,
        })),
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Erro ao salvar horários. Tente novamente.')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-7 w-48 rounded bg-muted animate-pulse" />
        <div className="h-96 rounded-2xl bg-muted animate-pulse" />
      </div>
    )
  }

  const isOpen = status?.isOpen ?? false
  const shouldBeOpen = status?.shouldBeOpen ?? false
  const autoSchedule = status?.autoSchedule ?? false

  // Detecta se há divergência (manual override)
  const hasOverride = isOpen !== shouldBeOpen

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Horários de Funcionamento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure os dias e horários em que sua loja aceita pedidos
        </p>
      </div>

      {/* ── Status atual + toggle manual ───────────────────────────── */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <div>
              <p className="font-semibold text-base">
                {isOpen ? 'Loja aberta' : 'Loja fechada'}
              </p>
              {!isOpen && status?.nextOpenTime && (
                <p className="text-xs text-muted-foreground">
                  Próxima abertura: {status.nextOpenTime}
                </p>
              )}
              {isOpen && shouldBeOpen && (
                <p className="text-xs text-green-600">Aberta conforme horário configurado</p>
              )}
            </div>
          </div>

          <button
            onClick={() => toggleStore.mutate()}
            disabled={toggleStore.isPending}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition
              ${isOpen
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              } disabled:opacity-60`}
          >
            <Power className="h-4 w-4" />
            {toggleStore.isPending ? 'Aguarde...' : isOpen ? 'Fechar agora' : 'Abrir agora'}
          </button>
        </div>

        {hasOverride && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700">
              {isOpen && !shouldBeOpen
                ? 'A loja está aberta manualmente fora do horário configurado.'
                : 'A loja está fechada manualmente dentro do horário configurado.'}
            </p>
          </div>
        )}
      </section>

      {/* ── Abertura automática ───────────────────────────────────── */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-base">Abertura automática</p>
              <p className="text-xs text-muted-foreground">
                {autoSchedule
                  ? 'A loja abre e fecha sozinha nos horários abaixo (fuso de Brasília).'
                  : 'Ative para a loja abrir e fechar sozinha nos horários definidos.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleAuto.mutate(!autoSchedule)}
            disabled={toggleAuto.isPending}
            aria-pressed={autoSchedule}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60
              ${autoSchedule ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform
              ${autoSchedule ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      {/* ── Grade de horários ─────────────────────────────────────── */}
      <section className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Horários por dia</h2>
        </div>

        <div className="space-y-2">
          {days.map((day) => (
            <div
              key={day.dayOfWeek}
              className={`rounded-xl border p-3 transition-colors
                ${day.isActive ? 'bg-white' : 'bg-muted/30 opacity-60'}`}
            >
              <div className="flex items-center gap-3">
                {/* Toggle do dia */}
                <button
                  type="button"
                  onClick={() => setDay(day.dayOfWeek, { isActive: !day.isActive })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none
                    ${day.isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                    ${day.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>

                {/* Nome do dia */}
                <span className={`w-20 text-sm font-medium ${day.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <span className="hidden sm:inline">{DAY_NAMES[day.dayOfWeek]}</span>
                  <span className="sm:hidden">{DAY_SHORT[day.dayOfWeek]}</span>
                </span>

                {/* Inputs de horário */}
                {day.isActive && (
                  <>
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="time"
                        value={day.openTime}
                        onChange={(e) => setDay(day.dayOfWeek, { openTime: e.target.value })}
                        className="h-8 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <span className="text-xs text-muted-foreground">até</span>
                      <input
                        type="time"
                        value={day.closeTime}
                        onChange={(e) => setDay(day.dayOfWeek, { closeTime: e.target.value })}
                        className="h-8 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToAll(day.dayOfWeek)}
                      className="shrink-0 text-xs text-muted-foreground hover:text-primary transition"
                      title="Copiar para todos os dias ativos"
                    >
                      Copiar p/ todos
                    </button>
                  </>
                )}

                {!day.isActive && (
                  <span className="text-xs text-muted-foreground ml-auto">Fechado</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {saveError && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{saveError}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saveSchedules.isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition"
        >
          {saved ? <><Check className="h-4 w-4" /> Horários salvos!</> : saveSchedules.isPending ? 'Salvando...' : <><Save className="h-4 w-4" /> Salvar horários</>}
        </button>
      </section>

      {/* ── Dica ─────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        💡 Com a <strong>abertura automática</strong> ligada, a loja abre e fecha sozinha nos horários acima
        (fuso de Brasília), verificando a cada minuto. O botão “Abrir/Fechar agora” serve como ajuste manual
        temporário — no próximo ciclo o sistema volta a seguir os horários.
      </p>
    </div>
    </div>
  )
}
