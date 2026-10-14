import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'
import { invalidateStorePublicCache } from '../../lib/cache.js'
import { addDays } from '../../lib/tz.js'

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário no formato HH:MM')
const MAX_TURNOS = 3

const upsertScheduleSchema = z.object({
  // Um item por turno. O mesmo dia pode ter até 3 turnos (ex.: almoço e jantar).
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openTime: HHMM,
      closeTime: HHMM,
      isActive: z.boolean().default(true),
    }),
  ).max(7 * MAX_TURNOS),
})

const specialDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  isClosed: z.boolean(),
  openTime: HHMM.nullish(),
  closeTime: HHMM.nullish(),
  note: z.string().trim().max(60).nullish(),
})

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const scheduleRoutes: FastifyPluginAsync = async (app) => {
  // Abrir/fechar a loja ou mudar horários altera o que o cliente vê: limpa o cache
  // da vitrine na hora (antes ficava até 2 min mostrando o estado antigo).
  // onSend roda ANTES de a resposta sair: quando o painel recebe o "ok", o cache já foi limpo.
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.method !== 'GET' && reply.statusCode < 400 && request.user?.storeId) {
      await invalidateStorePublicCache(app.prisma, request.user.storeId)
    }
    return payload
  })

  const bad = (reply: any, message: string) =>
    reply.status(400).send({ error: 'Validation Error', message, statusCode: 400 })

  async function loadRules(storeId: string) {
    const [store, schedules, specialDays] = await Promise.all([
      app.prisma.store.findUnique({
        where: { id: storeId },
        select: { isOpen: true, timezone: true, acceptOrders: true, autoSchedule: true, pausedUntil: true, status: true },
      }),
      app.prisma.storeSchedule.findMany({ where: { storeId, isActive: true } }),
      app.prisma.storeSpecialDay.findMany({ where: { storeId, date: { gte: addDays(new Date().toISOString().slice(0, 10), -2) } } }),
    ])
    return { store, schedules, specialDays, tz: store?.timezone ?? 'America/Sao_Paulo' }
  }

  // ─── GET /schedules ────────────────────────────────────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const schedules = await app.prisma.storeSchedule.findMany({
      where: { storeId: request.user.storeId },
      orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }],
    })
    return { data: schedules }
  })

  // ─── PUT /schedules (substitui a grade semanal inteira) ────────────
  app.put('/', { preHandler: [authenticate] }, async (request, reply) => {
    const result = upsertScheduleSchema.safeParse(request.body)
    if (!result.success) return bad(reply, result.error.issues[0]?.message ?? 'Dados inválidos')

    // Turnos do mesmo dia não podem se sobrepor (nem passar de 3)
    for (let d = 0; d < 7; d++) {
      const turnos = result.data.schedules.filter((s) => s.dayOfWeek === d && s.isActive)
      if (turnos.length > MAX_TURNOS) return bad(reply, `${DIAS[d]}: no máximo ${MAX_TURNOS} turnos por dia`)
      const faixas = turnos
        .map((t) => ({ ini: toMin(t.openTime), fim: toMin(t.closeTime) <= toMin(t.openTime) ? toMin(t.closeTime) + 1440 : toMin(t.closeTime) }))
        .sort((a, b) => a.ini - b.ini)
      for (let i = 1; i < faixas.length; i++) {
        if (faixas[i]!.ini < faixas[i - 1]!.fim) return bad(reply, `${DIAS[d]}: os turnos estão se sobrepondo`)
      }
    }

    const storeId = request.user.storeId
    await app.prisma.$transaction([
      app.prisma.storeSchedule.deleteMany({ where: { storeId } }),
      app.prisma.storeSchedule.createMany({ data: result.data.schedules.map((s) => ({ ...s, storeId })) }),
    ])

    // Recalcula isOpen com os novos horários — só com a abertura automática ligada e sem pausa;
    // com ela desligada, isOpen é controle manual do lojista.
    const { store, schedules, specialDays, tz } = await loadRules(storeId)
    if (store?.autoSchedule && !isPaused(store.pausedUntil)) {
      await app.prisma.store.update({ where: { id: storeId }, data: { isOpen: isStoreOpenNow(schedules, tz, specialDays) } })
    }

    const all = await app.prisma.storeSchedule.findMany({ where: { storeId }, orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }] })
    return { data: all }
  })

  // ─── PATCH /schedules/toggle (abrir/fechar manualmente, sem prazo) ─
  app.patch('/toggle', { preHandler: [authenticate] }, async (request, reply) => {
    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: { isOpen: true, status: true },
    })
    // Loja suspensa pelo superadmin não pode ser reaberta pelo lojista
    if (store?.status === 'SUSPENDED') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Loja suspensa. Fale com o suporte.', statusCode: 403 })
    }

    const updated = await app.prisma.store.update({
      where: { id: request.user.storeId },
      data: { isOpen: !store?.isOpen, pausedUntil: null },
      select: { isOpen: true },
    })

    return { data: { isOpen: updated.isOpen } }
  })

  // ─── PATCH /schedules/pause (fecha por alguns minutos e reabre sozinha) ─
  app.patch('/pause', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z.object({ minutes: z.number().int().min(5).max(720) }).safeParse(request.body)
    if (!body.success) return bad(reply, 'Escolha uma pausa entre 5 minutos e 12 horas')

    const store = await app.prisma.store.findUnique({ where: { id: request.user.storeId }, select: { status: true } })
    if (store?.status === 'SUSPENDED') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Loja suspensa. Fale com o suporte.', statusCode: 403 })
    }

    const updated = await app.prisma.store.update({
      where: { id: request.user.storeId },
      data: { isOpen: false, pausedUntil: new Date(Date.now() + body.data.minutes * 60_000) },
      select: { isOpen: true, pausedUntil: true },
    })
    return { data: updated }
  })

  // ─── PATCH /schedules/auto (liga/desliga abertura automática) ─────
  app.patch('/auto', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z.object({ enabled: z.boolean() }).safeParse(request.body)
    if (!body.success) return bad(reply, 'Dados inválidos')

    const storeId = request.user.storeId
    const data: { autoSchedule: boolean; isOpen?: boolean } = { autoSchedule: body.data.enabled }

    // Ao LIGAR, já ajusta o status agora mesmo (sem esperar o próximo ciclo), salvo se estiver pausada.
    if (body.data.enabled) {
      const { store, schedules, specialDays, tz } = await loadRules(storeId)
      if (!isPaused(store?.pausedUntil)) data.isOpen = isStoreOpenNow(schedules, tz, specialDays)
    }

    const updated = await app.prisma.store.update({
      where: { id: storeId },
      data,
      select: { autoSchedule: true, isOpen: true },
    })

    return { data: updated }
  })

  // ─── GET /schedules/status (situação agora) ───────────────────────
  app.get('/status', { preHandler: [authenticate] }, async (request) => {
    const { store, schedules, specialDays, tz } = await loadRules(request.user.storeId)
    const now = new Date()
    const today = localParts(tz, now).dayKey
    const special = specialDays.find((s) => s.date === today) ?? null

    return {
      data: {
        isOpen: store?.isOpen ?? false,
        shouldBeOpen: isStoreOpenNow(schedules, tz, specialDays),
        acceptOrders: store?.acceptOrders ?? true,
        autoSchedule: store?.autoSchedule ?? false,
        pausedUntil: isPaused(store?.pausedUntil) ? store!.pausedUntil : null,
        nextOpenTime: getNextOpenTime(schedules, tz, specialDays),
        closesAt: getClosingTime(schedules, tz, specialDays),
        specialToday: special ? { isClosed: special.isClosed, openTime: special.openTime, closeTime: special.closeTime, note: special.note } : null,
        timezone: tz,
      },
    }
  })

  // ─── Datas especiais (feriados, folgas, horário diferente) ─────────
  app.get('/special-days', { preHandler: [authenticate] }, async (request) => {
    const { tz } = await loadRules(request.user.storeId)
    const today = localParts(tz, new Date()).dayKey
    const data = await app.prisma.storeSpecialDay.findMany({
      where: { storeId: request.user.storeId, date: { gte: today } },
      orderBy: { date: 'asc' },
    })
    return { data }
  })

  app.put('/special-days', { preHandler: [authenticate] }, async (request, reply) => {
    const r = specialDaySchema.safeParse(request.body)
    if (!r.success) return bad(reply, r.error.issues[0]?.message ?? 'Dados inválidos')
    const { date, isClosed, note } = r.data
    const openTime = isClosed ? null : r.data.openTime ?? null
    const closeTime = isClosed ? null : r.data.closeTime ?? null
    if (!isClosed && (!openTime || !closeTime)) return bad(reply, 'Informe o horário de abertura e de fechamento')

    const storeId = request.user.storeId
    const { tz } = await loadRules(storeId)
    if (date < localParts(tz, new Date()).dayKey) return bad(reply, 'Escolha hoje ou uma data futura')
    const count = await app.prisma.storeSpecialDay.count({ where: { storeId } })
    if (count >= 60) return bad(reply, 'Limite de 60 datas especiais. Apague as que já passaram.')

    const saved = await app.prisma.storeSpecialDay.upsert({
      where: { storeId_date: { storeId, date } },
      create: { storeId, date, isClosed, openTime, closeTime, note: note || null },
      update: { isClosed, openTime, closeTime, note: note || null },
    })
    await syncAutoOpen(storeId)
    return { data: saved }
  })

  app.delete('/special-days/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const del = await app.prisma.storeSpecialDay.deleteMany({ where: { id, storeId: request.user.storeId } })
    if (del.count === 0) return reply.status(404).send({ error: 'Not Found', message: 'Data não encontrada', statusCode: 404 })
    await syncAutoOpen(request.user.storeId)
    return reply.status(204).send()
  })

  // Data especial de HOJE muda na hora o estado de quem usa abertura automática
  async function syncAutoOpen(storeId: string) {
    const { store, schedules, specialDays, tz } = await loadRules(storeId)
    if (store?.autoSchedule && !isPaused(store.pausedUntil)) {
      await app.prisma.store.update({ where: { id: storeId }, data: { isOpen: isStoreOpenNow(schedules, tz, specialDays) } })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Regras de horário (usadas também pelo worker de abertura automática e pelos pedidos)
// ─────────────────────────────────────────────────────────────────────────────

interface Schedule {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isActive: boolean
}
export interface SpecialDay {
  date: string
  isClosed: boolean
  openTime: string | null
  closeTime: string | null
}
type Janela = { openTime: string; closeTime: string }

const WEEKDAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

export const isPaused = (until: Date | null | undefined, at = new Date()) => !!until && until.getTime() > at.getTime()

/** Dia (AAAA-MM-DD), dia da semana (0-6) e hora "HH:MM" no fuso da loja. */
function localParts(timezone: string, at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hourCycle: 'h23', weekday: 'short',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(at).map((x) => [x.type, x.value]),
  )
  return {
    dayKey: `${p.year}-${p.month}-${p.day}`,
    dow: WEEKDAY_MAP[p.weekday ?? ''] ?? -1,
    time: `${p.hour}:${p.minute}`,
  }
}

/** closeTime <= openTime significa que a janela cruza a meia-noite (ex.: 18:00–02:00). Igual = 24 horas. */
function crossesMidnight(s: Janela): boolean {
  return s.closeTime <= s.openTime
}

/** Turnos de um dia: a data especial (se houver) substitui a grade da semana. */
function janelasDoDia(dayKey: string, dow: number, schedules: Schedule[], specials: SpecialDay[]): Janela[] {
  const sp = specials.find((s) => s.date === dayKey)
  if (sp) return sp.isClosed || !sp.openTime || !sp.closeTime ? [] : [{ openTime: sp.openTime, closeTime: sp.closeTime }]
  return schedules
    .filter((s) => s.dayOfWeek === dow && s.isActive)
    .sort((a, b) => a.openTime.localeCompare(b.openTime))
}

export function isStoreOpenNow(schedules: Schedule[], timezone: string, specials: SpecialDay[] = [], at = new Date()): boolean {
  const { dayKey, dow, time } = localParts(timezone, at)

  // Turnos de hoje: normais, ou o trecho de hoje de um turno que vira a noite.
  for (const j of janelasDoDia(dayKey, dow, schedules, specials)) {
    if (crossesMidnight(j) ? time >= j.openTime : time >= j.openTime && time < j.closeTime) return true
  }
  // Madrugada: o trecho pós-meia-noite pertence ao turno de ONTEM
  // (ex.: sexta 18:00–02:00 mantém a loja aberta no sábado até 01:59).
  for (const j of janelasDoDia(addDays(dayKey, -1), (dow + 6) % 7, schedules, specials)) {
    if (crossesMidnight(j) && time < j.closeTime) return true
  }
  return false
}

/**
 * A loja aceita pedido agora? Regra única para vitrine, pedidos e bot do WhatsApp.
 * - pausada → não; aberta → sim;
 * - fechada: só aceita se a abertura automática estiver ligada e o turno acabou de começar
 *   (o worker roda a cada minuto e ainda não virou o isOpen). Fechar manualmente dentro do
 *   horário passa a valer de verdade — antes qualquer pedido reabria a loja.
 * `heal` = o chamador deve gravar isOpen = true (atraso do worker).
 */
export function acceptingOrdersNow(
  store: { isOpen: boolean; autoSchedule?: boolean | null; pausedUntil?: Date | null; timezone: string },
  schedules: Schedule[],
  specials: SpecialDay[] = [],
  at = new Date(),
): { open: boolean; heal: boolean } {
  if (isPaused(store.pausedUntil, at)) return { open: false, heal: false }
  if (store.isOpen) return { open: true, heal: false }
  if (!store.autoSchedule) return { open: false, heal: false }
  const agora = isStoreOpenNow(schedules, store.timezone, specials, at)
  const antes = isStoreOpenNow(schedules, store.timezone, specials, new Date(at.getTime() - 3 * 60_000))
  return agora && !antes ? { open: true, heal: true } : { open: false, heal: false }
}

/** Horário em que o turno atual termina (ex.: "23:00"), ou null se fechada pelos horários. */
function getClosingTime(schedules: Schedule[], timezone: string, specials: SpecialDay[]): string | null {
  const { dayKey, dow, time } = localParts(timezone, new Date())
  for (const j of janelasDoDia(addDays(dayKey, -1), (dow + 6) % 7, schedules, specials)) {
    if (crossesMidnight(j) && time < j.closeTime) return j.closeTime
  }
  for (const j of janelasDoDia(dayKey, dow, schedules, specials)) {
    if (j.openTime === j.closeTime && time >= j.openTime) return null // 24 horas
    if (crossesMidnight(j) ? time >= j.openTime : time >= j.openTime && time < j.closeTime) return j.closeTime
  }
  return null
}

function getNextOpenTime(schedules: Schedule[], timezone: string, specials: SpecialDay[]): string | null {
  const { dayKey, dow, time } = localParts(timezone, new Date())
  for (let i = 0; i <= 14; i++) {
    const key = addDays(dayKey, i)
    const turnos = janelasDoDia(key, (dow + i) % 7, schedules, specials)
    const prox = turnos.find((j) => i > 0 || j.openTime > time)
    if (prox) {
      const quando = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : i < 7 ? DIAS[(dow + i) % 7] : `${key.slice(8, 10)}/${key.slice(5, 7)}`
      return `${quando} às ${prox.openTime}`
    }
  }
  return null
}

export default scheduleRoutes
