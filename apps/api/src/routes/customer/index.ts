import type { FastifyPluginAsync } from 'fastify'
import { hashPassword, verifyPassword } from '../../lib/hash'
import { authenticateCustomer } from '../../middlewares/authenticate-customer'
import { customerRegisterSchema, customerLoginSchema, customerRefreshSchema, accountAddressSchema } from './schemas'
import { AUTH_RATE_LIMIT } from '../auth/index.js'
import type { CustomerJwtPayload } from '@delivery/types'

// Só dígitos — telefone canônico da conta global
function digits(v: string): string {
  return v.replace(/\D/g, '')
}

// Assina tokens de cliente (namespace separado do admin via `type: 'customer'`)
function signCustomerToken(app: Parameters<FastifyPluginAsync>[0], accountId: string, expiresIn: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (app.jwt.sign as any)({ sub: accountId, type: 'customer' }, { expiresIn })
}

function accountId(request: { user: unknown }): string {
  return (request.user as unknown as CustomerJwtPayload).sub
}

const customerRoutes: FastifyPluginAsync = async (app) => {
  // ─── POST /customer/register ──────────────────────────────────────
  app.post('/register', AUTH_RATE_LIMIT, async (request, reply) => {
    const result = customerRegisterSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })
    }

    const phone = digits(result.data.phone)
    const email = result.data.email?.toLowerCase().trim() || null
    const cpf = result.data.cpf ? digits(result.data.cpf) : null
    if (phone.length < 8) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Telefone inválido', statusCode: 400 })
    }

    // Duplicidade (telefone é a chave primária de login)
    const existingPhone = await app.prisma.customerAccount.findUnique({ where: { phone } })
    if (existingPhone) {
      return reply.status(409).send({ error: 'Conflict', message: 'Esse telefone já está cadastrado', statusCode: 409 })
    }
    if (email) {
      const existingEmail = await app.prisma.customerAccount.findUnique({ where: { email } })
      if (existingEmail) {
        return reply.status(409).send({ error: 'Conflict', message: 'Esse e-mail já está cadastrado', statusCode: 409 })
      }
    }

    const passwordHash = await hashPassword(result.data.password)
    const account = await app.prisma.customerAccount.create({
      data: { name: result.data.name, phone, email, cpf, password: passwordHash },
    })

    // Vincula perfis store-scoped existentes (mesmo telefone, em QUALQUER loja) e
    // importa endereços salvos — assim o histórico de todas as lojas aparece de imediato.
    // Casa por dígitos via regexp_replace (telefones legados podem estar mascarados).
    try {
      const matches = await app.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Customer"
        WHERE "accountId" IS NULL
        AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ${phone}
      `
      if (matches.length > 0) {
        const ids = matches.map((m) => m.id)
        await app.prisma.customer.updateMany({ where: { id: { in: ids } }, data: { accountId: account.id } })

        const legacyAddresses = await app.prisma.customerAddress.findMany({ where: { customerId: { in: ids } } })
        const seen = new Set<string>()
        const toCreate = legacyAddresses
          .filter((a) => {
            const key = `${a.street}|${a.number}|${a.zipCode}`.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .map((a, i) => ({
            accountId: account.id,
            street: a.street, number: a.number, complement: a.complement,
            district: a.district, city: a.city, state: a.state, zipCode: a.zipCode,
            reference: a.reference, lat: a.lat, lng: a.lng,
            isDefault: i === 0,
          }))
        if (toCreate.length > 0) {
          await app.prisma.customerAccountAddress.createMany({ data: toCreate })
        }
      }
    } catch (err) {
      app.log.error({ err }, 'Erro ao vincular perfis legados ao CustomerAccount')
    }

    const accessToken = signCustomerToken(app, account.id, '7d')
    const refreshToken = signCustomerToken(app, account.id, '30d')
    return reply.status(201).send({
      data: {
        accessToken,
        refreshToken,
        account: { id: account.id, name: account.name, phone: account.phone, email: account.email },
      },
    })
  })

  // ─── POST /customer/login ─────────────────────────────────────────
  app.post('/login', AUTH_RATE_LIMIT, async (request, reply) => {
    const result = customerLoginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Dados inválidos', statusCode: 400 })
    }

    const { identifier, password } = result.data
    const isEmail = identifier.includes('@')
    const account = isEmail
      ? await app.prisma.customerAccount.findUnique({ where: { email: identifier.toLowerCase().trim() } })
      : await app.prisma.customerAccount.findUnique({ where: { phone: digits(identifier) } })

    if (!account || !(await verifyPassword(password, account.password))) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Telefone/e-mail ou senha incorretos', statusCode: 401 })
    }

    const accessToken = signCustomerToken(app, account.id, '7d')
    const refreshToken = signCustomerToken(app, account.id, '30d')
    return reply.send({
      data: {
        accessToken,
        refreshToken,
        account: { id: account.id, name: account.name, phone: account.phone, email: account.email },
      },
    })
  })

  // ─── POST /customer/refresh ───────────────────────────────────────
  app.post('/refresh', async (request, reply) => {
    const result = customerRefreshSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Token inválido', statusCode: 400 })
    }
    try {
      const decoded = app.jwt.verify(result.data.refreshToken) as { sub: string; type?: string }
      if (decoded.type !== 'customer') {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido', statusCode: 401 })
      }
      const account = await app.prisma.customerAccount.findUnique({ where: { id: decoded.sub }, select: { id: true } })
      if (!account) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido', statusCode: 401 })
      }
      const accessToken = signCustomerToken(app, account.id, '7d')
      return reply.send({ data: { accessToken } })
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Token expirado ou inválido', statusCode: 401 })
    }
  })

  // ─── GET /customer/me ─────────────────────────────────────────────
  app.get('/me', { preHandler: [authenticateCustomer] }, async (request, reply) => {
    const account = await app.prisma.customerAccount.findUnique({
      where: { id: accountId(request) },
      select: { id: true, name: true, phone: true, email: true, cpf: true },
    })
    if (!account) {
      return reply.status(404).send({ error: 'Not Found', message: 'Conta não encontrada', statusCode: 404 })
    }
    return reply.send({ data: { account } })
  })

  // ─── GET /customer/addresses ──────────────────────────────────────
  app.get('/addresses', { preHandler: [authenticateCustomer] }, async (request) => {
    const addresses = await app.prisma.customerAccountAddress.findMany({
      where: { accountId: accountId(request) },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    return { data: addresses }
  })

  // ─── POST /customer/addresses ─────────────────────────────────────
  app.post('/addresses', { preHandler: [authenticateCustomer] }, async (request, reply) => {
    const id = accountId(request)
    const result = accountAddressSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })
    }
    const count = await app.prisma.customerAccountAddress.count({ where: { accountId: id } })
    const makeDefault = result.data.isDefault || count === 0
    const address = await app.prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.customerAccountAddress.updateMany({ where: { accountId: id }, data: { isDefault: false } })
      }
      return tx.customerAccountAddress.create({ data: { ...result.data, accountId: id, isDefault: makeDefault } })
    })
    return reply.status(201).send({ data: address })
  })

  // ─── PATCH /customer/addresses/:id ────────────────────────────────
  app.patch('/addresses/:id', { preHandler: [authenticateCustomer] }, async (request, reply) => {
    const acc = accountId(request)
    const { id } = request.params as { id: string }
    const existing = await app.prisma.customerAccountAddress.findFirst({ where: { id, accountId: acc } })
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Endereço não encontrado', statusCode: 404 })
    }
    const result = accountAddressSchema.partial().safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })
    }
    const updated = await app.prisma.$transaction(async (tx) => {
      if (result.data.isDefault) {
        await tx.customerAccountAddress.updateMany({ where: { accountId: acc }, data: { isDefault: false } })
      }
      return tx.customerAccountAddress.update({ where: { id }, data: result.data })
    })
    return reply.send({ data: updated })
  })

  // ─── DELETE /customer/addresses/:id ───────────────────────────────
  app.delete('/addresses/:id', { preHandler: [authenticateCustomer] }, async (request, reply) => {
    const acc = accountId(request)
    const { id } = request.params as { id: string }
    const existing = await app.prisma.customerAccountAddress.findFirst({ where: { id, accountId: acc } })
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Endereço não encontrado', statusCode: 404 })
    }
    await app.prisma.customerAccountAddress.delete({ where: { id } })
    return reply.send({ data: { success: true } })
  })

  // ─── GET /customer/orders (histórico GLOBAL — todas as lojas) ──────
  app.get('/orders', { preHandler: [authenticateCustomer] }, async (request) => {
    const profiles = await app.prisma.customer.findMany({
      where: { accountId: accountId(request) },
      select: { id: true },
    })
    const ids = profiles.map((p) => p.id)
    if (ids.length === 0) return { data: [] }

    const orders = await app.prisma.order.findMany({
      where: { customerId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, orderNumber: true, status: true, total: true, type: true, createdAt: true,
        store: { select: { name: true, slug: true, logoUrl: true } },
        items: { select: { name: true, quantity: true }, take: 3 },
        review: { select: { rating: true } },
      },
    })
    return { data: orders }
  })
}

export default customerRoutes
