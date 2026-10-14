'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Clock, Power, Save, AlertCircle, Check, CalendarClock, Plus, Trash2, Copy, Moon, PauseCircle,
  PlayCircle, CalendarX, Eye, X,
} from 'lucide-react'
import { cn } from '@delivery/ui'
import {
  useSchedules, useScheduleStatus, useSaveSchedules, useToggleStore, useToggleAutoSchedule,
  usePauseStore, useSpecialDays, useSaveSpecialDay, useDeleteSpecialDay,
  DAY_NAMES, DAY_SHORT, type Schedule,
} from '@/hooks/use-schedules'

interface Turno { openTime: string; closeTime: string }
interface DayState { dayOfWeek: number; isActive: boolean; turnos: Turno[] }

const MAX_TURNOS = 3
const ORDEM = [1, 2, 3, 4, 5, 6, 0] // segunda primeiro, como o lojista pensa a semana
const toMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))

function buildDefaultDays(): DayState[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    isActive: i >= 1 && i <= 5,
    turnos: [{ openTime: '08:00', closeTime: '22:00' }],
  }))
}

function schedulesToDays(schedules: Schedule[]): DayState[] {
  const base = buildDefaultDays()
  if (schedules.length === 0) return base
  return base.map((d) => {
    const rows = schedules.filter((s) => s.dayOfWeek === d.dayOfWeek).sort((a, b) => a.openTime.localeCompare(b.openTime))
    if (rows.length === 0) return { ...d, isActive: false }
    const ativos = rows.filter((r) => r.isActive)
    const usar = ativos.length ? ativos : rows
    return { dayOfWeek: d.dayOfWeek, isActive: ativos.length > 0, turnos: usar.map(({ openTime, closeTime }) => ({ openTime, closeTime })) }
  })
}

function turnoInfo(t: Turno) {
  if (t.openTime === t.closeTime) return { label: '24 horas', noite: false }
  if (toMin(t.closeTime) < toMin(t.openTime)) return { label: 'termina no dia seguinte', noite: true }
  return null
}

function horasDoTurno(t: Turno) {
  const a = toMin(t.openTime), b = toMin(t.closeTime)
  return (b <= a ? b + 1440 - a : b - a) / 60
}

function validar(days: DayState[]): string | null {
  for (const d of days) {
    if (!d.isActive) continue
    const faixas = d.turnos
      .map((t) => ({ ini: toMin(t.openTime), fim: toMin(t.closeTime) <= toMin(t.openTime) ? toMin(t.closeTime) + 1440 : toMin(t.closeTime) }))
      .sort((a, b) => a.ini - b.ini)
    for (let i = 1; i < faixas.length; i++) {
      if (faixas[i]!.ini < faixas[i - 1]!.fim) return `${DAY_NAMES[d.dayOfWeek]}: os turnos estão se sobrepondo.`
    }
  }
  return null
}

// Feriados nacionais de data fixa, para sugerir com um clique
const FERIADOS: [string, string][] = [
  ['01-01', 'Confraternização'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['09-07', 'Independência'],
  ['10-12', 'N. Sra. Aparecida'], ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['11-20', 'Consciência Negra'],
  ['12-24', 'Véspera de Natal'], ['12-25', 'Natal'], ['12-31', 'Véspera de Ano Novo'],
]
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const dataBR = (iso: string) => {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function Switch({ on, onClick, label, disabled, size = 'md' }: { on: boolean; onClick: () => void; label: string; disabled?: boolean; size?: 'md' | 'lg' }) {
  const lg = size === 'lg'
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} disabled={disabled}
      className={cn('relative shrink-0 rounded-full transition-colors disabled:opacity-60', lg ? 'h-7 w-12' : 'h-6 w-11',
        on ? 'bg-primary' : 'bg-muted-foreground/30')}>
      <span className={cn('absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform',
        lg ? 'h-6 w-6' : 'h-5 w-5', on ? 'translate-x-5' : 'translate-x-0')} />
    </button>
  )
}

const TIME_INPUT = 'h-10 w-full min-w-0 sm:w-[6.5rem] rounded-lg border bg-white px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring'

export default function HorariosPage() {
  const { data: schedules, isLoading } = useSchedules()
  const { data: status } = useScheduleStatus()
  const { data: specialDays = [] } = useSpecialDays()
  const saveSchedules = useSaveSchedules()
  const toggleStore = useToggleStore()
  const toggleAuto = useToggleAutoSchedule()
  const pauseStore = usePauseStore()
  const saveSpecial = useSaveSpecialDay()
  const deleteSpecial = useDeleteSpecialDay()

  const [days, setDays] = useState<DayState[]>(buildDefaultDays())
  const original = useRef<string>('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [copyFrom, setCopyFrom] = useState<number | null>(null)
  const [copyTo, setCopyTo] = useState<number[]>([])

  // Nova data especial
  const [spDate, setSpDate] = useState('')
  const [spClosed, setSpClosed] = useState(true)
  const [spOpen, setSpOpen] = useState('18:00')
  const [spClose, setSpClose] = useState('23:00')
  const [spNote, setSpNote] = useState('')
  const [spError, setSpError] = useState('')

  useEffect(() => {
    if (!schedules) return
    const d = schedulesToDays(schedules)
    setDays(d)
    original.current = JSON.stringify(d)
  }, [schedules])

  const dirty = original.current !== '' && JSON.stringify(days) !== original.current

  // Aviso ao sair da página com alterações não salvas
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const horasSemana = useMemo(
    () => days.filter((d) => d.isActive).reduce((acc, d) => acc + d.turnos.reduce((a, t) => a + horasDoTurno(t), 0), 0),
    [days],
  )

  function patchDay(dow: number, fn: (d: DayState) => DayState) {
    setSaved(false)
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dow ? fn(d) : d)))
  }
  const setTurno = (dow: number, i: number, patch: Partial<Turno>) =>
    patchDay(dow, (d) => ({ ...d, turnos: d.turnos.map((t, j) => (j === i ? { ...t, ...patch } : t)) }))
  const addTurno = (dow: number) =>
    patchDay(dow, (d) => {
      const ult = d.turnos[d.turnos.length - 1]
      const fimUlt = ult ? toMin(ult.closeTime) : 0
      const ini = !ult || fimUlt <= 17 * 60 ? 18 * 60 : Math.min(fimUlt + 60, 22 * 60)
      const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      return { ...d, isActive: true, turnos: [...d.turnos, { openTime: fmt(ini), closeTime: fmt(Math.min(ini + 240, 23 * 60 + 59)) }] }
    })
  const removeTurno = (dow: number, i: number) =>
    patchDay(dow, (d) => (d.turnos.length > 1 ? { ...d, turnos: d.turnos.filter((_, j) => j !== i) } : { ...d, isActive: false }))

  function abrirCopia(dow: number) {
    setCopyFrom(dow)
    setCopyTo([])
  }
  function aplicarCopia() {
    const src = days.find((d) => d.dayOfWeek === copyFrom)
    if (!src) return
    setSaved(false)
    setDays((prev) => prev.map((d) => (copyTo.includes(d.dayOfWeek) ? { ...d, isActive: src.isActive, turnos: src.turnos.map((t) => ({ ...t })) } : d)))
    setCopyFrom(null)
  }

  async function handleSave() {
    setSaveError('')
    const erro = validar(days)
    if (erro) { setSaveError(erro); return }
    try {
      await saveSchedules.mutateAsync(
        days.flatMap((d) => d.turnos.map((t) => ({ dayOfWeek: d.dayOfWeek, openTime: t.openTime, closeTime: t.closeTime, isActive: d.isActive }))),
      )
      original.current = JSON.stringify(days)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Erro ao salvar horários. Tente novamente.')
    }
  }

  function descartar() {
    setDays(JSON.parse(original.current))
    setSaveError('')
  }

  async function addSpecial(date = spDate, note = spNote, isClosed = spClosed) {
    setSpError('')
    if (!date) { setSpError('Escolha a data'); return }
    try {
      await saveSpecial.mutateAsync({ date, isClosed, openTime: isClosed ? null : spOpen, closeTime: isClosed ? null : spClose, note: note.trim() || null })
      setSpDate(''); setSpNote('')
    } catch (err: any) {
      setSpError(err?.response?.data?.message ?? 'Não foi possível salvar a data.')
    }
  }

  const sugestoes = useMemo(() => {
    const hoje = hojeISO()
    const ano = Number(hoje.slice(0, 4))
    const usadas = new Set(specialDays.map((s) => s.date))
    return [ano, ano + 1]
      .flatMap((y) => FERIADOS.map(([md, nome]) => ({ date: `${y}-${md}`, nome })))
      .filter((f) => f.date >= hoje && !usadas.has(f.date))
      .slice(0, 4)
  }, [specialDays])

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="h-7 w-48 rounded bg-muted animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
        <div className="h-96 rounded-2xl bg-muted animate-pulse" />
      </div>
    )
  }

  const isOpen = status?.isOpen ?? false
  const shouldBeOpen = status?.shouldBeOpen ?? false
  const autoSchedule = status?.autoSchedule ?? false
  const pausedUntil = status?.pausedUntil ? new Date(status.pausedUntil) : null
  const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const hasOverride = !pausedUntil && isOpen !== shouldBeOpen
  const sorted = ORDEM.map((dow) => days.find((d) => d.dayOfWeek === dow)!)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-5 pb-28">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Horários de Funcionamento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina quando sua loja aceita pedidos, pause quando a cozinha apertar e marque feriados.
          </p>
        </div>

        {/* ── Situação agora ─────────────────────────────────────────── */}
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className={cn('mt-1.5 h-3 w-3 shrink-0 rounded-full', pausedUntil ? 'bg-amber-500' : isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500')} />
              <div>
                <p className="text-lg font-semibold">
                  {pausedUntil ? 'Loja em pausa' : isOpen ? 'Loja aberta' : 'Loja fechada'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pausedUntil
                    ? `Volta sozinha às ${hora(pausedUntil)}`
                    : isOpen
                      ? status?.closesAt ? `Pelos horários, fecha às ${status.closesAt}` : 'Recebendo pedidos'
                      : status?.nextOpenTime ? `Próxima abertura: ${status.nextOpenTime}` : 'Sem horário de abertura configurado'}
                </p>
                {status?.specialToday && (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    Hoje é data especial{status.specialToday.note ? ` (${status.specialToday.note})` : ''}:{' '}
                    {status.specialToday.isClosed ? 'fechado o dia todo' : `${status.specialToday.openTime} às ${status.specialToday.closeTime}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {pausedUntil || !isOpen ? (
                <button onClick={() => toggleStore.mutate()} disabled={toggleStore.isPending}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60 transition">
                  <PlayCircle className="h-4 w-4" /> {toggleStore.isPending ? 'Aguarde...' : pausedUntil ? 'Reabrir agora' : 'Abrir agora'}
                </button>
              ) : (
                <button onClick={() => { if (confirm('Fechar a loja agora? Ela só volta a abrir quando você clicar em "Abrir agora" ou no próximo horário automático.')) toggleStore.mutate() }}
                  disabled={toggleStore.isPending}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 transition">
                  <Power className="h-4 w-4" /> {toggleStore.isPending ? 'Aguarde...' : 'Fechar agora'}
                </button>
              )}
            </div>
          </div>

          {/* Pausa rápida */}
          {isOpen && !pausedUntil && (
            <div className="mt-4 flex flex-col gap-2 rounded-xl bg-muted/40 p-3 lg:flex-row lg:items-center">
              <span className="flex items-center gap-2 text-sm font-medium">
                <PauseCircle className="h-4 w-4 text-amber-600" /> Cozinha cheia? Pausar por
              </span>
              <div className="flex flex-wrap gap-2">
                {[15, 30, 60, 120].map((m) => (
                  <button key={m} onClick={() => pauseStore.mutate(m)} disabled={pauseStore.isPending}
                    className="inline-flex min-h-9 items-center rounded-lg border bg-white px-3 text-sm font-medium hover:border-amber-400 hover:bg-amber-50 disabled:opacity-60 transition">
                    {m < 60 ? `${m} min` : `${m / 60} h`}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground lg:ml-auto">Reabre sozinha no fim da pausa</span>
            </div>
          )}

          {hasOverride && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700">
                {isOpen
                  ? 'A loja está aberta manualmente fora do horário configurado.'
                  : 'A loja está fechada manualmente dentro do horário configurado.'}
                {autoSchedule && ' Ela volta a seguir os horários na próxima abertura ou fechamento.'}
              </p>
            </div>
          )}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── Grade semanal ─────────────────────────────────────────── */}
          <section className="rounded-2xl border bg-card p-4 sm:p-5 space-y-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-base">Horários por dia</h2>
              </div>
              <span className="text-xs text-muted-foreground">{horasSemana.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h abertas por semana</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Use <strong>+ Turno</strong> para abrir em dois horários no mesmo dia (ex.: almoço e jantar).
              Se fechar depois da meia-noite, é só colocar o horário (ex.: 18:00 até 02:00).
            </p>

            <div className="space-y-2">
              {sorted.map((day) => (
                <div key={day.dayOfWeek}
                  className={cn('rounded-xl border p-3 transition-colors', day.isActive ? 'bg-white' : 'bg-muted/30')}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Switch on={day.isActive} label={`Abrir na ${DAY_NAMES[day.dayOfWeek]}`}
                      onClick={() => patchDay(day.dayOfWeek, (d) => ({ ...d, isActive: !d.isActive }))} />
                    <span className={cn('w-20 text-sm font-semibold', !day.isActive && 'text-muted-foreground')}>{DAY_NAMES[day.dayOfWeek]}</span>
                    {!day.isActive && <span className="text-sm text-muted-foreground">Fechado</span>}
                    <div className="ml-auto flex gap-2">
                      {day.isActive && day.turnos.length < MAX_TURNOS && (
                        <button type="button" onClick={() => addTurno(day.dayOfWeek)}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted transition">
                          <Plus className="h-3.5 w-3.5" /> Turno
                        </button>
                      )}
                      <button type="button" onClick={() => abrirCopia(day.dayOfWeek)} aria-label={`Copiar horário de ${DAY_NAMES[day.dayOfWeek]}`}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted transition">
                        <Copy className="h-3.5 w-3.5" /> Copiar<span className="hidden sm:inline"> para...</span>
                      </button>
                    </div>
                  </div>

                  {day.isActive && (
                    <div className="mt-2 space-y-2 sm:pl-14">
                      {day.turnos.map((t, i) => {
                        const info = turnoInfo(t)
                        return (
                          <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {day.turnos.length > 1 && <span className="w-full text-xs text-muted-foreground sm:w-14">{i + 1}º turno</span>}
                            <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-none">
                              <input type="time" value={t.openTime} aria-label={`${DAY_NAMES[day.dayOfWeek]} turno ${i + 1}: abre`}
                                onChange={(e) => e.target.value && setTurno(day.dayOfWeek, i, { openTime: e.target.value })} className={TIME_INPUT} />
                              <span className="text-xs text-muted-foreground">até</span>
                              <input type="time" value={t.closeTime} aria-label={`${DAY_NAMES[day.dayOfWeek]} turno ${i + 1}: fecha`}
                                onChange={(e) => e.target.value && setTurno(day.dayOfWeek, i, { closeTime: e.target.value })} className={TIME_INPUT} />
                              <button type="button" onClick={() => removeTurno(day.dayOfWeek, i)}
                                aria-label={day.turnos.length > 1 ? 'Remover turno' : 'Fechar este dia'} title={day.turnos.length > 1 ? 'Remover turno' : 'Fechar este dia'}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            {info && (
                              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                info.noite ? 'bg-indigo-50 text-indigo-700' : 'bg-green-50 text-green-700')}>
                                {info.noite && <Moon className="h-3 w-3" />}{info.label}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Escolha dos dias para copiar */}
                  {copyFrom === day.dayOfWeek && (
                    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
                      <p className="text-sm font-medium">Copiar o horário de {DAY_NAMES[day.dayOfWeek]} para:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Seg a Sex', dias: [1, 2, 3, 4, 5] },
                          { label: 'Fim de semana', dias: [6, 0] },
                          { label: 'Todos', dias: [0, 1, 2, 3, 4, 5, 6] },
                        ].map((g) => (
                          <button key={g.label} type="button" onClick={() => setCopyTo(g.dias.filter((x) => x !== day.dayOfWeek))}
                            className="min-h-9 rounded-full border bg-white px-3 text-xs font-medium hover:bg-muted">{g.label}</button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ORDEM.filter((x) => x !== day.dayOfWeek).map((x) => {
                          const on = copyTo.includes(x)
                          return (
                            <label key={x} className={cn('inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm',
                              on ? 'border-primary bg-primary text-primary-foreground' : 'bg-white')}>
                              <input type="checkbox" className="sr-only" checked={on}
                                onChange={() => setCopyTo((c) => (on ? c.filter((y) => y !== x) : [...c, x]))} />
                              {DAY_SHORT[x]}
                            </label>
                          )
                        })}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={aplicarCopia} disabled={copyTo.length === 0}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                          <Check className="h-4 w-4" /> Copiar
                        </button>
                        <button type="button" onClick={() => setCopyFrom(null)} className="h-9 rounded-lg border bg-white px-3 text-sm">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {saveError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{saveError}</p>
              </div>
            )}

            <button onClick={handleSave} disabled={saveSchedules.isPending || (!dirty && !saved)}
              className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition">
              {saved ? <><Check className="h-4 w-4" /> Horários salvos!</> : saveSchedules.isPending ? 'Salvando...' : <><Save className="h-4 w-4" /> Salvar horários</>}
            </button>
          </section>

          <div className="space-y-5 min-w-0">
            {/* ── Abertura automática ─────────────────────────────────── */}
            <section className="rounded-2xl border bg-card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold">Abertura automática</p>
                    <p className="text-xs text-muted-foreground">
                      {autoSchedule
                        ? 'A loja abre e fecha sozinha nos horários e datas especiais.'
                        : 'Ligue para a loja abrir e fechar sozinha nos horários definidos.'}
                    </p>
                  </div>
                </div>
                <Switch size="lg" on={autoSchedule} label="Abertura automática" disabled={toggleAuto.isPending}
                  onClick={() => toggleAuto.mutate(!autoSchedule)} />
              </div>
            </section>

            {/* ── Datas especiais ─────────────────────────────────────── */}
            <section className="rounded-2xl border bg-card p-4 sm:p-5 space-y-4">
              <div className="flex items-start gap-3">
                <CalendarX className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold">Feriados e datas especiais</p>
                  <p className="text-xs text-muted-foreground">Feche num dia específico ou abra com outro horário. Vale mais que a grade da semana.</p>
                </div>
              </div>

              {specialDays.length > 0 && (
                <ul className="space-y-2">
                  {specialDays.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-xl border px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize">{dataBR(s.date)}{s.note ? ` · ${s.note}` : ''}</p>
                        <p className={cn('text-xs', s.isClosed ? 'text-red-600' : 'text-muted-foreground')}>
                          {s.isClosed ? 'Fechado o dia todo' : `Aberto das ${s.openTime} às ${s.closeTime}`}
                        </p>
                      </div>
                      <button onClick={() => deleteSpecial.mutate(s.id)} aria-label="Apagar data"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {sugestoes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Próximos feriados (fechar com um clique):</p>
                  <div className="flex flex-wrap gap-2">
                    {sugestoes.map((f) => (
                      <button key={f.date} onClick={() => addSpecial(f.date, f.nome, true)} disabled={saveSpecial.isPending}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs hover:bg-muted disabled:opacity-60">
                        <Plus className="h-3 w-3" /> {f.date.slice(8, 10)}/{f.date.slice(5, 7)} {f.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 rounded-xl bg-muted/40 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <input type="date" value={spDate} min={hojeISO()} onChange={(e) => setSpDate(e.target.value)} aria-label="Data"
                    className="h-10 rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={spNote} onChange={(e) => setSpNote(e.target.value)} maxLength={60} placeholder="Motivo (opcional), ex.: Folga"
                    className="h-10 rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[{ v: true, l: 'Fechado o dia todo' }, { v: false, l: 'Horário diferente' }].map((o) => (
                    <button key={o.l} type="button" onClick={() => setSpClosed(o.v)}
                      className={cn('min-h-9 rounded-lg border px-3 text-sm', spClosed === o.v ? 'border-primary bg-primary text-primary-foreground' : 'bg-white')}>
                      {o.l}
                    </button>
                  ))}
                </div>
                {!spClosed && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="time" value={spOpen} onChange={(e) => e.target.value && setSpOpen(e.target.value)} aria-label="Abre" className={TIME_INPUT} />
                    <span className="text-xs text-muted-foreground">até</span>
                    <input type="time" value={spClose} onChange={(e) => e.target.value && setSpClose(e.target.value)} aria-label="Fecha" className={TIME_INPUT} />
                  </div>
                )}
                {spError && <p className="text-xs text-red-600">{spError}</p>}
                <button onClick={() => addSpecial()} disabled={saveSpecial.isPending}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  <Plus className="h-4 w-4" /> Adicionar data
                </button>
              </div>
            </section>

            {/* ── Como o cliente vê ───────────────────────────────────── */}
            <section className="rounded-2xl border bg-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <p className="font-semibold">Como o cliente vê na loja</p>
              </div>
              <div className="space-y-1.5 rounded-xl bg-muted/40 p-3">
                {sorted.map((d) => (
                  <div key={d.dayOfWeek} className="flex justify-between gap-3 text-sm">
                    <span className="font-medium">{DAY_NAMES[d.dayOfWeek]}</span>
                    <span className={cn('text-right', d.isActive ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                      {d.isActive ? d.turnos.map((t) => (t.openTime === t.closeTime ? '24 horas' : `${t.openTime} – ${t.closeTime}`)).join(' · ') : 'Fechado'}
                    </span>
                  </div>
                ))}
              </div>
              {dirty && <p className="text-xs text-amber-700">Mostrando suas alterações ainda não salvas.</p>}
            </section>
          </div>
        </div>
      </div>

      {/* Barra fixa quando há alterações não salvas */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:left-60">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
            <span className="text-sm font-medium">Você tem alterações nos horários que ainda não foram salvas.</span>
            <div className="flex gap-2">
              <button onClick={descartar} className="h-10 rounded-xl border px-4 text-sm font-medium hover:bg-muted">Descartar</button>
              <button onClick={handleSave} disabled={saveSchedules.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                <Save className="h-4 w-4" /> {saveSchedules.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
