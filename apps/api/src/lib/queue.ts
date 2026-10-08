import { Queue, Worker, type ConnectionOptions } from 'bullmq'
import type { PrismaClient } from '@prisma/client'

const connection: ConnectionOptions = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}

// ─── Fila de notificações WhatsApp ────────────────────────────────────────────

export type WhatsAppJob =
  | { type: 'ORDER_STATUS'; orderId: string; event: string }
  | { type: 'CUSTOM'; phone: string; message: string; evolutionUrl: string; apiKey: string; instance: string }

let notificationQueue: Queue | null = null

export function getNotificationQueue(): Queue | null {
  if (!process.env.REDIS_URL) return null
  if (!notificationQueue) {
    // Retentativas valem para qualquer job da fila (no Worker essas opções seriam ignoradas)
    notificationQueue = new Queue('notifications', {
      connection,
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    })
  }
  return notificationQueue
}

export function startNotificationWorker(prisma: PrismaClient) {
  if (!process.env.REDIS_URL) return null

  const worker = new Worker<WhatsAppJob>(
    'notifications',
    async (job) => {
      const { notifyOrderStatus } = await import('./notifications.js')

      if (job.data.type === 'ORDER_STATUS') {
        await notifyOrderStatus({ prisma, orderId: job.data.orderId, event: job.data.event as any })
      } else if (job.data.type === 'CUSTOM') {
        const { evolutionSendText } = await import('./evolution.js')
        await evolutionSendText(
          { url: job.data.evolutionUrl, apiKey: job.data.apiKey, instance: job.data.instance },
          job.data.phone,
          job.data.message,
        )
      }
    },
    { connection },
  )

  worker.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job?.id} falhou:`, err.message)
  })

  return worker
}

export async function enqueueOrderNotification(orderId: string, event: string) {
  const queue = getNotificationQueue()
  if (!queue) {
    // Fallback síncrono se Redis não estiver disponível
    return null
  }
  return queue.add('order-status', { type: 'ORDER_STATUS', orderId, event }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  })
}
