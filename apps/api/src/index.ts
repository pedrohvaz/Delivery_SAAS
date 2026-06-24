import 'dotenv/config'
import { buildApp } from './app'
import { startNotificationWorker } from './lib/queue.js'
import { startAutoScheduleWorker } from './lib/auto-schedule.js'
import { PrismaClient } from '@prisma/client'

const PORT = Number(process.env.PORT) || 3333
const HOST = process.env.HOST ?? '0.0.0.0'

async function start() {
  const app = buildApp()

  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`🚀 API rodando em http://localhost:${PORT}`)

    // Inicia worker de filas (se Redis estiver configurado)
    const prisma = new PrismaClient()
    const worker = startNotificationWorker(prisma)
    if (worker) console.log('📬 Worker de filas iniciado')

    // Abre/fecha lojas automaticamente conforme os horários (autoSchedule)
    startAutoScheduleWorker(prisma)
    console.log('🕒 Worker de horário automático iniciado')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
