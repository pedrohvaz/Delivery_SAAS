import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { isStoreOpenNow, acceptingOrdersNow } from '../src/routes/schedules'
import { startAutoScheduleWorker } from '../src/lib/auto-schedule'
import { closeApp, createStore, getApp, type TestStore } from './helpers'

// Horário do Prathos de Minas: seg a sáb 10:30–15:00, domingo fechado.
const HORARIO = [1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, openTime: '10:30', closeTime: '15:00', isActive: true }))
const TZ = 'America/Sao_Paulo'
// 2026-10-12 é segunda-feira; horário de Brasília = UTC-3
const at = (iso: string) => vi.setSystemTime(new Date(iso + '-03:00'))

afterEach(() => vi.useRealTimers())

describe('regra de horário', () => {
  const cases: [string, string, boolean][] = [
    ['segunda 10:29', '2026-10-12T10:29:00', false],
    ['segunda 10:30', '2026-10-12T10:30:00', true],
    ['segunda 14:59', '2026-10-12T14:59:00', true],
    ['segunda 15:00', '2026-10-12T15:00:00', false],
    ['sábado 12:00', '2026-10-17T12:00:00', true],
    ['domingo 12:00', '2026-10-18T12:00:00', false],
    ['segunda 23:00', '2026-10-12T23:00:00', false],
  ]
  for (const [nome, iso, aberto] of cases) {
    it(`${nome} → ${aberto ? 'aberta' : 'fechada'}`, () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      at(iso)
      expect(isStoreOpenNow(HORARIO, TZ)).toBe(aberto)
    })
  }

  it('janela que vira a noite (18:00 às 02:00)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const noite = [{ dayOfWeek: 5, openTime: '18:00', closeTime: '02:00', isActive: true }]
    at('2026-10-16T23:30:00') // sexta
    expect(isStoreOpenNow(noite, TZ)).toBe(true)
    at('2026-10-16T17:59:00')
    expect(isStoreOpenNow(noite, TZ)).toBe(false)
  })
})

describe('turnos, datas especiais e pausa', () => {
  // Almoço e jantar na segunda
  const DOIS = [
    { dayOfWeek: 1, openTime: '11:00', closeTime: '14:00', isActive: true },
    { dayOfWeek: 1, openTime: '18:00', closeTime: '23:00', isActive: true },
  ]
  it('dois turnos no mesmo dia', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    at('2026-10-12T12:00:00'); expect(isStoreOpenNow(DOIS, TZ)).toBe(true)
    at('2026-10-12T16:00:00'); expect(isStoreOpenNow(DOIS, TZ)).toBe(false)
    at('2026-10-12T19:00:00'); expect(isStoreOpenNow(DOIS, TZ)).toBe(true)
  })

  it('feriado fecha o dia, horário especial substitui a grade', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    at('2026-10-12T12:00:00')
    expect(isStoreOpenNow(HORARIO, TZ, [{ date: '2026-10-12', isClosed: true, openTime: null, closeTime: null }])).toBe(false)
    const especial = [{ date: '2026-10-12', isClosed: false, openTime: '16:00', closeTime: '20:00' }]
    expect(isStoreOpenNow(HORARIO, TZ, especial)).toBe(false)
    at('2026-10-12T17:00:00'); expect(isStoreOpenNow(HORARIO, TZ, especial)).toBe(true)
    // domingo (normalmente fechado) aberto por data especial
    at('2026-10-18T12:00:00')
    expect(isStoreOpenNow(HORARIO, TZ, [{ date: '2026-10-18', isClosed: false, openTime: '10:00', closeTime: '14:00' }])).toBe(true)
  })

  it('fechar manualmente dentro do horário vale de verdade', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    at('2026-10-12T12:00:00')
    const base = { timezone: TZ, autoSchedule: true }
    expect(acceptingOrdersNow({ ...base, isOpen: false }, HORARIO).open).toBe(false)
    expect(acceptingOrdersNow({ ...base, isOpen: true }, HORARIO).open).toBe(true)
    // pausa ativa bloqueia mesmo com isOpen = true
    expect(acceptingOrdersNow({ ...base, isOpen: true, pausedUntil: new Date(Date.now() + 600_000) }, HORARIO).open).toBe(false)
    // turno acabou de começar e o worker ainda não abriu: aceita e pede para abrir
    at('2026-10-12T10:31:00')
    expect(acceptingOrdersNow({ ...base, isOpen: false }, HORARIO)).toEqual({ open: true, heal: true })
    expect(acceptingOrdersNow({ ...base, autoSchedule: false, isOpen: false }, HORARIO).open).toBe(false)
  })
})

describe('abertura automática muda a loja no banco', () => {
  let s: TestStore
  beforeAll(async () => {
    s = await createStore('auto')
    const app = await getApp()
    await app.prisma.storeSchedule.createMany({ data: HORARIO.map((h) => ({ ...h, storeId: s.storeId })) })
    await app.prisma.store.update({ where: { id: s.storeId }, data: { autoSchedule: true, isOpen: false } })
  })
  afterAll(closeApp)

  async function runOnce(iso: string) {
    vi.useFakeTimers({ toFake: ['Date'] })
    at(iso)
    const app = await getApp()
    const timer = startAutoScheduleWorker(app.prisma)
    await new Promise((r) => setTimeout(r, 1500)) // primeiro ciclo roda na hora
    clearInterval(timer)
    vi.useRealTimers()
    return (await app.prisma.store.findUniqueOrThrow({ where: { id: s.storeId } })).isOpen
  }

  it('abre às 10:30 de segunda', async () => {
    expect(await runOnce('2026-10-12T10:31:00')).toBe(true)
  })
  it('fecha às 15:00', async () => {
    expect(await runOnce('2026-10-12T15:01:00')).toBe(false)
  })
  it('não abre no domingo', async () => {
    expect(await runOnce('2026-10-18T12:00:00')).toBe(false)
  })
})
