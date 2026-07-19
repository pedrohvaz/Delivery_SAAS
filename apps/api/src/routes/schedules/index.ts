import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'

const upsertScheduleSchema = z.object({
  // Recebe array de horários (um por dia da semana ativo)
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
      closeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
      isActive: z.boolean().default(true),
    }),
  ),
})

const scheduleRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /schedules ────────────────────────────────────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const schedules = await app.prisma.storeSchedule.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { dayOfWeek: 'asc' },
    })
    return { data: schedules }
  })

  // ─── PUT /schedules (upsert em lote — substitui todos os horários) ─
  app.put('/', { preHandler: [authenticate] }, async (request, reply) => {
    const result = upsertScheduleSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const storeId = request.user.storeId

    // Remove todos os horários existentes e recria
    await app.prisma.storeSchedule.deleteMany({ where: { storeId } })

    if (result.data.schedules.length > 0) {
      await app.prisma.storeSchedule.createMany({
        data: result.data.schedules.map((s) => ({ ...s, storeId })),
      })
    }

    const schedules = await app.prisma.storeSchedule.findMany({
      where: { storeId },
      orderBy: { dayOfWeek: 'asc' },
    })

    // Recalcula isOpen com base nos novos horários — mas só quando a abertura
    // automática está ligada; com ela desligada, isOpen é controle manual do
    // lojista e editar horários não deve abrir/fechar a loja.
    const storeData = await app.prisma.store.findUnique({
      where: { id: storeId },
      select: { timezone: true, autoSchedule: true },
    })
    if (storeData?.autoSchedule) {
      const open = isStoreOpenNow(schedules, storeData.timezone ?? 'America/Sao_Paulo')
      await app.prisma.store.update({
        where: { id: storeId },
        data: { isOpen: open },
      })
    }

    return { data: schedules }
  })

  // ─── PATCH /schedules/toggle (abrir/fechar manualmente) ───────────
  app.patch('/toggle', { preHandler: [authenticate] }, async (request) => {
    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: { isOpen: true },
    })

    const updated = await app.prisma.store.update({
      where: { id: request.user.storeId },
      data: { isOpen: !store?.isOpen },
      select: { isOpen: true },
    })

    return { data: { isOpen: updated.isOpen } }
  })

  // ─── PATCH /schedules/auto (liga/desliga abertura automática) ─────
  app.patch('/auto', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({ enabled: z.boolean() })
    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Dados inválidos', statusCode: 400 })
    }

    const storeId = request.user.storeId
    const data: { autoSchedule: boolean; isOpen?: boolean } = { autoSchedule: body.data.enabled }

    // Ao LIGAR, já ajusta o status agora mesmo (sem esperar o próximo ciclo).
    if (body.data.enabled) {
      const store = await app.prisma.store.findUnique({ where: { id: storeId }, select: { timezone: true } })
      const schedules = await app.prisma.storeSchedule.findMany({ where: { storeId, isActive: true } })
      data.isOpen = isStoreOpenNow(schedules, store?.timezone ?? 'America/Sao_Paulo')
    }

    const updated = await app.prisma.store.update({
      where: { id: storeId },
      data,
      select: { autoSchedule: true, isOpen: true },
    })

    return { data: updated }
  })

  // ─── GET /schedules/status (verifica se loja está aberta agora) ────
  app.get('/status', { preHandler: [authenticate] }, async (request) => {
    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: { isOpen: true, timezone: true, acceptOrders: true, autoSchedule: true },
    })

    const schedules = await app.prisma.storeSchedule.findMany({
      where: { storeId: request.user.storeId, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    })

    const shouldBeOpen = isStoreOpenNow(schedules, store?.timezone ?? 'America/Sao_Paulo')
    const nextOpenTime = getNextOpenTime(schedules, store?.timezone ?? 'America/Sao_Paulo')

    return {
      data: {
        isOpen: store?.isOpen ?? false,
        shouldBeOpen,
        acceptOrders: store?.acceptOrders ?? true,
        autoSchedule: store?.autoSchedule ?? false,
        nextOpenTime,
      },
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de lógica de horário
// ─────────────────────────────────────────────────────────────────────────────

interface Schedule {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isActive: boolean
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/** Dia da semana (0-6) e hora atual "HH:MM" no fuso da loja. */
function nowInTimezone(timezone: string): { currentDay: number; currentTime: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(new Date())

  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return {
    currentDay: WEEKDAY_MAP[weekdayStr] ?? -1,
    currentTime: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
  }
}

/** closeTime <= openTime significa que a janela cruza a meia-noite (ex.: 18:00–02:00 ou 18:00–00:00). */
function crossesMidnight(s: Pick<Schedule, 'openTime' | 'closeTime'>): boolean {
  return s.closeTime <= s.openTime
}

export function isStoreOpenNow(schedules: Schedule[], timezone: string): boolean {
  if (schedules.length === 0) return false

  const { currentDay, currentTime } = nowInTimezone(timezone)

  // Janela de hoje: normal (abre e fecha no mesmo dia) ou o trecho de hoje de
  // uma janela que vira a noite (da abertura até 23:59).
  const today = schedules.find((s) => s.dayOfWeek === currentDay && s.isActive)
  if (today) {
    const open = crossesMidnight(today)
      ? currentTime >= today.openTime
      : currentTime >= today.openTime && currentTime < today.closeTime
    if (open) return true
  }

  // Madrugada: o trecho pós-meia-noite pertence à janela de ONTEM
  // (ex.: sexta 18:00–02:00 mantém a loja aberta no sábado até 01:59).
  const yesterday = schedules.find((s) => s.dayOfWeek === (currentDay + 6) % 7 && s.isActive)
  if (yesterday && crossesMidnight(yesterday) && currentTime < yesterday.closeTime) return true

  return false
}

function getNextOpenTime(schedules: Schedule[], timezone: string): string | null {
  if (schedules.length === 0) return null

  const { currentDay, currentTime } = nowInTimezone(timezone)

  const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  // Ainda abre hoje?
  const today = schedules.find((s) => s.dayOfWeek === currentDay && s.isActive)
  if (today && currentTime < today.openTime) {
    return `Hoje às ${today.openTime}`
  }

  // Procura o próximo dia com horário ativo (até 7 dias à frente)
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7
    const schedule = schedules.find((s) => s.dayOfWeek === nextDay && s.isActive)
    if (schedule) {
      const dayLabel = i === 1 ? 'Amanhã' : DAY_NAMES[nextDay] ?? ''
      return `${dayLabel} às ${schedule.openTime}`
    }
  }

  return null
}

export default scheduleRoutes
