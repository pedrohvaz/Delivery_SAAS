import type { PrismaClient } from '@prisma/client'
import { isStoreOpenNow } from '../routes/schedules/index.js'

/**
 * Worker de abertura/fechamento automático.
 * A cada minuto, para cada loja com `autoSchedule = true`, calcula se ela
 * deveria estar aberta agora (pelos horários + fuso) e ajusta `isOpen`.
 * Assim a loja abre e fecha sozinha nos horários definidos (ex.: Brasília).
 */
export function startAutoScheduleWorker(prisma: PrismaClient): NodeJS.Timeout {
  async function tick() {
    try {
      const stores = await prisma.store.findMany({
        where: { autoSchedule: true },
        select: {
          id: true,
          isOpen: true,
          timezone: true,
          schedules: {
            where: { isActive: true },
            select: { dayOfWeek: true, openTime: true, closeTime: true, isActive: true },
          },
        },
      })

      for (const s of stores) {
        const open = isStoreOpenNow(s.schedules, s.timezone ?? 'America/Sao_Paulo')
        if (open !== s.isOpen) {
          await prisma.store.update({ where: { id: s.id }, data: { isOpen: open } })
        }
      }
    } catch (err) {
      console.error('[auto-schedule] erro no ciclo:', err)
    }
  }

  // Roda uma vez no boot e depois a cada 60s.
  void tick()
  return setInterval(() => void tick(), 60_000)
}
