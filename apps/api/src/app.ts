import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { join } from 'path'
import { mkdirSync } from 'fs'
import prismaPlugin from './plugins/prisma'
import { socketPlugin } from './plugins/socket.js'
import authRoutes from './routes/auth'
import categoryRoutes from './routes/categories/index.js'
import productRoutes from './routes/products/index.js'
import addonRoutes from './routes/addons/index.js'
import storePublicRoutes from './routes/store/index.js'
import orderRoutes from './routes/orders/index.js'
import customerAccountRoutes from './routes/customer/index.js'
import paymentRoutes from './routes/payments/index.js'
import settingsRoutes from './routes/settings/index.js'
import deliveryAreaRoutes from './routes/delivery-areas/index.js'
import scheduleRoutes from './routes/schedules/index.js'
import customerRoutes from './routes/customers/index.js'
import couponRoutes, { couponPublicRoutes } from './routes/coupons/index.js'
import deliverymenRoutes from './routes/deliverymen/index.js'
import reportRoutes from './routes/reports/index.js'
import tableRoutes, { tablePublicRoutes } from './routes/tables/index.js'
import superAdminAuthRoutes from './routes/super-admin/auth.js'
import superAdminStoresRoutes from './routes/super-admin/stores.js'
import superAdminMetricsRoutes from './routes/super-admin/metrics.js'
import superAdminOrdersRoutes from './routes/super-admin/orders.js'
import superAdminUsersRoutes from './routes/super-admin/users.js'
import superAdminReportsRoutes from './routes/super-admin/reports.js'
import superAdminHealthRoutes from './routes/super-admin/health.js'
import superAdminConfigRoutes from './routes/super-admin/config.js'
import cashRegisterRoutes from './routes/cash-register/index.js'
import uploadRoutes from './routes/upload/index.js'
import automationRoutes from './routes/automation/index.js'
import reviewRoutes from './routes/reviews/index.js'
import loyaltyRoutes from './routes/loyalty/index.js'
import raffleRoutes from './routes/raffles/index.js'
import noticesRoutes from './routes/notices/index.js'
import planRoutes from './routes/plans/index.js'
import stripeWebhookRoutes from './routes/stripe-webhook/index.js'

export function buildApp() {
  const app = Fastify({
    // Atrás do proxy da Railway: usa X-Forwarded-For como IP real do cliente.
    // Sem isso, o rate limit agrupa todo mundo no IP do proxy (e nunca/aleatoriamente dispara).
    trustProxy: true,
    logger: {
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  // Garante que a pasta de uploads existe antes de registrar o static
  const uploadsDir = join(process.cwd(), 'uploads')
  mkdirSync(uploadsDir, { recursive: true })

  // Upload de arquivos
  app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })

  // Servir arquivos locais (fallback quando R2 não está configurado)
  app.register(staticFiles, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  })

  // Segurança
  app.register(helmet)
  app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  })
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // JWT
  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  })

  // Prisma + Socket.io
  app.register(prismaPlugin)
  app.register(socketPlugin)

  // Rotas
  app.register(authRoutes, { prefix: '/auth' })
  app.register(categoryRoutes, { prefix: '/categories' })
  app.register(productRoutes, { prefix: '/products' })
  app.register(addonRoutes, { prefix: '/addons' })
  app.register(storePublicRoutes, { prefix: '/store' })
  app.register(orderRoutes, { prefix: '/orders' })
  app.register(customerAccountRoutes, { prefix: '/customer' })
  app.register(paymentRoutes, { prefix: '/payments' })
  app.register(settingsRoutes, { prefix: '/settings' })
  app.register(deliveryAreaRoutes, { prefix: '/delivery-areas' })
  app.register(scheduleRoutes, { prefix: '/schedules' })
  app.register(customerRoutes, { prefix: '/customers' })
  app.register(couponRoutes, { prefix: '/coupons' })
  app.register(couponPublicRoutes, { prefix: '/store' })
  app.register(deliverymenRoutes, { prefix: '/deliverymen' })
  app.register(reportRoutes, { prefix: '/reports' })
  app.register(tableRoutes, { prefix: '/tables' })
  app.register(tablePublicRoutes, { prefix: '/store' })
  app.register(superAdminAuthRoutes, { prefix: '/super-admin/auth' })
  app.register(superAdminStoresRoutes, { prefix: '/super-admin/stores' })
  app.register(superAdminMetricsRoutes, { prefix: '/super-admin/metrics' })
  app.register(superAdminOrdersRoutes, { prefix: '/super-admin/orders' })
  app.register(superAdminUsersRoutes, { prefix: '/super-admin/users' })
  app.register(superAdminReportsRoutes, { prefix: '/super-admin/reports' })
  app.register(superAdminHealthRoutes, { prefix: '/super-admin/health' })
  app.register(superAdminConfigRoutes, { prefix: '/super-admin/config' })
  app.register(cashRegisterRoutes, { prefix: '/cash-register' })
  app.register(uploadRoutes, { prefix: '/upload' })
  app.register(automationRoutes, { prefix: '/automation' })
  app.register(reviewRoutes, { prefix: '/reviews' })
  app.register(loyaltyRoutes, { prefix: '/loyalty' })
  app.register(raffleRoutes, { prefix: '/raffles' })
  app.register(noticesRoutes, { prefix: '/notices' })
  app.register(planRoutes, { prefix: '/plans' })
  app.register(stripeWebhookRoutes, { prefix: '/stripe' })

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Handler global de erros
  app.setErrorHandler((error, request, reply) => {
    app.log.error({ err: error, url: request.url, method: request.method }, 'Erro não capturado')
    const statusCode = error.statusCode ?? 500
    reply.status(statusCode).send({
      error: error.name ?? 'Internal Server Error',
      message: statusCode === 500 ? 'Erro interno do servidor' : error.message,
      statusCode,
    })
  })

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: 'Not Found', message: `Rota ${request.method} ${request.url} não encontrada`, statusCode: 404 })
  })

  return app
}
