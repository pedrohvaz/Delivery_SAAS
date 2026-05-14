import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middlewares/authenticate'
import { hashPassword, verifyPassword } from '../../lib/hash'
import { registerSchema, loginSchema, refreshSchema } from './schemas'
import type { JwtPayload } from '@delivery/types'
import { createCheckoutSession, createPreSignupCheckoutSession, retrieveCheckoutSession, getStripe } from '../../lib/stripe.js'

// Helper para assinar refresh token (payload mínimo)
function signRefresh(app: Parameters<FastifyPluginAsync>[0], sub: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (app.jwt.sign as any)({ sub }, { expiresIn: '30d' })
}

const authRoutes: FastifyPluginAsync = async (app) => {
  // ─── POST /auth/register ──────────────────────────────────────────
  app.post('/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const { storeName, storeSlug, name, email, password, phone, planSlug, successUrl, cancelUrl } = result.data

    // Verifica se slug já está em uso
    const existingStore = await app.prisma.store.findUnique({ where: { slug: storeSlug } })
    if (existingStore) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Esse endereço de loja já está em uso',
        statusCode: 409,
      })
    }

    // Verifica se e-mail já está em uso
    const existingUser = await app.prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Esse e-mail já está cadastrado',
        statusCode: 409,
      })
    }

    const passwordHash = await hashPassword(password)

    // Cria loja + usuário admin em transação
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { store, user } = await app.prisma.$transaction(async (tx: any) => {
      const store = await tx.store.create({
        data: {
          name: storeName,
          slug: storeSlug,
          phone,
        },
      })

      const user = await tx.user.create({
        data: {
          storeId: store.id,
          name,
          email,
          password: passwordHash,
          role: 'ADMIN',
        },
      })

      return { store, user }
    })

    // Cria formas de pagamento padrão para a nova loja
    await app.prisma.paymentMethod.createMany({
      data: [
        { storeId: store.id, type: 'PIX',         label: 'Pix',               isActive: true },
        { storeId: store.id, type: 'CASH',         label: 'Dinheiro',          isActive: true },
        { storeId: store.id, type: 'CREDIT_CARD',  label: 'Cartão de Crédito', isActive: true },
        { storeId: store.id, type: 'DEBIT_CARD',   label: 'Cartão de Débito',  isActive: true },
      ],
    })

    const payload: JwtPayload = { sub: user.id, storeId: store.id, role: user.role }
    const accessToken = app.jwt.sign(payload, { expiresIn: '7d' })
    const refreshToken = signRefresh(app, user.id)

    // Se o usuário escolheu um plano pago, cria a checkout session do Stripe
    let checkoutUrl: string | null = null
    if (planSlug && planSlug !== 'gratis' && getStripe()) {
      try {
        const plan = await app.prisma.plan.findUnique({ where: { slug: planSlug } })
        if (plan?.stripePriceId) {
          const session = await createCheckoutSession({
            priceId: plan.stripePriceId,
            customerEmail: user.email,
            storeId: store.id,
            successUrl: successUrl ?? `${process.env.NEXT_PUBLIC_API_URL ?? ''}/dashboard?billing=success`,
            cancelUrl: cancelUrl ?? `${process.env.NEXT_PUBLIC_API_URL ?? ''}/dashboard/assinatura?billing=canceled`,
            trialDays: 7,
          })
          checkoutUrl = session.url
        }
      } catch (err) {
        app.log.error({ err }, 'Erro ao criar Stripe Checkout no registro')
      }
    }

    return reply.status(201).send({
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        store: { id: store.id, name: store.name, slug: store.slug },
        checkoutUrl,
      },
    })
  })

  // ─── POST /auth/start-paid-signup ─────────────────────────────────
  // Cria sessão Stripe Checkout SEM criar a conta ainda.
  // Os dados de cadastro vão na metadata da sessão.
  // Após o pagamento, o webhook cria a conta.
  app.post('/start-paid-signup', async (request, reply) => {
    const schema = z.object({
      storeName: z.string().min(2),
      storeSlug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      phone: z.string().optional(),
      planSlug: z.string(),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const d = result.data

    if (!getStripe()) {
      return reply.status(503).send({ error: 'Stripe', message: 'Stripe não configurado', statusCode: 503 })
    }

    // Valida slug e email duplicados antes de mandar pra Stripe
    const [existingStore, existingUser] = await Promise.all([
      app.prisma.store.findUnique({ where: { slug: d.storeSlug } }),
      app.prisma.user.findUnique({ where: { email: d.email } }),
    ])
    if (existingStore) {
      return reply.status(409).send({ error: 'Conflict', message: 'Esse endereço de loja já está em uso', statusCode: 409 })
    }
    if (existingUser) {
      return reply.status(409).send({ error: 'Conflict', message: 'Esse e-mail já está cadastrado', statusCode: 409 })
    }

    const plan = await app.prisma.plan.findUnique({ where: { slug: d.planSlug } })
    if (!plan?.stripePriceId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Plano não encontrado ou sem preço no Stripe', statusCode: 404 })
    }

    const passwordHash = await hashPassword(d.password)

    const session = await createPreSignupCheckoutSession({
      priceId: plan.stripePriceId,
      customerEmail: d.email,
      metadata: {
        signupType: 'paid',
        storeName: d.storeName,
        storeSlug: d.storeSlug,
        name: d.name,
        email: d.email,
        passwordHash,
        phone: d.phone ?? '',
        planSlug: d.planSlug,
      },
      successUrl: d.successUrl,
      cancelUrl: d.cancelUrl,
      trialDays: 7,
    })

    return reply.send({ data: { checkoutUrl: session.url, sessionId: session.id } })
  })

  // ─── POST /auth/claim-session ─────────────────────────────────────
  // Após pagamento, frontend troca sessionId por tokens de auth
  app.post('/claim-session', async (request, reply) => {
    const schema = z.object({ sessionId: z.string() })
    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: 'sessionId inválido', statusCode: 400 })
    }

    let session
    try {
      session = await retrieveCheckoutSession(result.data.sessionId)
    } catch {
      return reply.status(404).send({ error: 'Not Found', message: 'Sessão não encontrada', statusCode: 404 })
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return reply.status(402).send({ error: 'Payment Required', message: 'Pagamento ainda não confirmado', statusCode: 402 })
    }

    const email = session.metadata?.email || session.customer_email
    if (!email) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Sessão sem e-mail', statusCode: 400 })
    }

    // Procura a conta criada pelo webhook
    const user = await app.prisma.user.findUnique({
      where: { email },
      include: { store: true },
    })

    if (!user) {
      return reply.status(404).send({
        error: 'Processing',
        message: 'Conta ainda sendo criada. Tente novamente em alguns segundos.',
        statusCode: 404,
      })
    }

    const payload: JwtPayload = { sub: user.id, storeId: user.storeId, role: user.role }
    const accessToken = app.jwt.sign(payload, { expiresIn: '7d' })
    const refreshToken = signRefresh(app, user.id)

    return reply.send({
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        store: { id: user.store.id, name: user.store.name, slug: user.store.slug, logoUrl: user.store.logoUrl },
      },
    })
  })

  // ─── POST /auth/login ─────────────────────────────────────────────
  app.post('/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Dados inválidos',
        statusCode: 400,
      })
    }

    const { email, password } = result.data

    const user = await app.prisma.user.findUnique({
      where: { email },
      include: { store: true },
    })

    if (!user || !(await verifyPassword(password, user.password))) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'E-mail ou senha incorretos',
        statusCode: 401,
      })
    }

    if (!user.isActive) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Usuário desativado',
        statusCode: 403,
      })
    }

    const payload: JwtPayload = { sub: user.id, storeId: user.storeId, role: user.role }
    const accessToken = app.jwt.sign(payload, { expiresIn: '7d' })
    const refreshToken = signRefresh(app, user.id)

    return reply.send({
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        store: { id: user.store.id, name: user.store.name, slug: user.store.slug, logoUrl: user.store.logoUrl },
      },
    })
  })

  // ─── POST /auth/refresh ───────────────────────────────────────────
  app.post('/refresh', async (request, reply) => {
    const result = refreshSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Token inválido', statusCode: 400 })
    }

    try {
      const decoded = app.jwt.verify(result.data.refreshToken) as { sub: string }
      const user = await app.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { store: true },
      })

      if (!user || !user.isActive) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido', statusCode: 401 })
      }

      const payload: JwtPayload = { sub: user.id, storeId: user.storeId, role: user.role }
      const accessToken = app.jwt.sign(payload, { expiresIn: '7d' })

      return reply.send({ data: { accessToken } })
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Token expirado ou inválido', statusCode: 401 })
    }
  })

  // ─── GET /auth/me ─────────────────────────────────────────────────
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await app.prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { store: true },
    })

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'Usuário não encontrado', statusCode: 404 })
    }

    return reply.send({
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        store: {
          id: user.store.id,
          name: user.store.name,
          slug: user.store.slug,
          logoUrl: user.store.logoUrl,
          isOpen: user.store.isOpen,
        },
      },
    })
  })
}

export default authRoutes
