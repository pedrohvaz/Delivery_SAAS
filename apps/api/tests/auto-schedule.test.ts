import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { isStoreOpenNow } from '../src/routes/schedules'
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
