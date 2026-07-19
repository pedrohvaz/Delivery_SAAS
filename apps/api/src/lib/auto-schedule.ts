import type { PrismaClient } from '@prisma/client'
import { isStoreOpenNow } from '../routes/schedules/index.js'

/**
 * Worker de abertura/fechamento automático.
 * A cada minuto, para cada loja com `autoSchedule = true`, calcula se ela
 * deveria estar aberta agora (pelos horários + fuso) e aplica `isOpen` apenas
 * nas TRANSIÇÕES de horário (fechado→aberto ou aberto→fechado). Fora das
 * transições o campo não é tocado, então abrir/fechar manualmente vale até o
 * próximo horário programado — em vez de ser desfeito no ciclo seguinte.
 */
export function startAutoScheduleWorker(prisma: PrismaClient): NodeJS.Timeout {
  // Último estado calculado por loja (memória do processo). No primeiro ciclo
  // após o boot sincroniza o estado real; depois, só transições alteram isOpen.
  const lastDesired = new Map<string, boolean>()
  let firstTick = true

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

      const seen = new Set<string>()
      for (const s of stores) {
        seen.add(s.id)
        const desired = isStoreOpenNow(s.schedules, s.timezone ?? 'America/Sao_Paulo')
        const prev = lastDesired.get(s.id)
        lastDesired.set(s.id, desired)

        // Aplica no boot (sincroniza após downtime) e depois só quando o
        // horário "vira". Lojas que ligaram o autoSchedule no meio do caminho
        // (prev === undefined) já tiveram isOpen ajustado pelo PATCH /schedules/auto.
        const apply = firstTick || (prev !== undefined && prev !== desired)
        if (apply && desired !== s.isOpen) {
          await prisma.store.update({ where: { id: s.id }, data: { isOpen: desired } })
        }
      }

      // Limpa lojas que desligaram o autoSchedule.
      for (const id of lastDesired.keys()) {
        if (!seen.has(id)) lastDesired.delete(id)
      }

      firstTick = false
    } catch (err) {
      console.error('[auto-schedule] erro no ciclo:', err)
    }
  }

  // Roda uma vez no boot e depois a cada 60s.
  void tick()
  return setInterval(() => void tick(), 60_000)
}
