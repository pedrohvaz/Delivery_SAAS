import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authenticateSuperAdmin } from '../../middlewares/authenticate-super-admin.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const superAdminAuthRoutes: FastifyPluginAsync = async (app) => {
  // POST /super-admin/auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const { email, password } = body.data

    const admin = await app.prisma.superAdmin.findUnique({ where: { email } })
    if (!admin || !admin.isActive) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Credenciais inválidas', statusCode: 401 })
    }

    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Credenciais inválidas', statusCode: 401 })
    }

    const accessToken = app.jwt.sign(
      { sub: admin.id, role: 'SUPER_ADMIN' },
      { expiresIn: '7d' },
    )
    const refreshToken = app.jwt.sign(
      { sub: admin.id, role: 'SUPER_ADMIN' },
      { expiresIn: '30d' },
    )

    return reply.send({
      data: {
        accessToken,
        refreshToken,
        admin: { id: admin.id, name: admin.name, email: admin.email },
      },
    })
  })

  // POST /super-admin/auth/refresh
  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    if (!refreshToken) {
      return reply.status(400).send({ error: 'Bad Request', message: 'refreshToken obrigatório', statusCode: 400 })
    }
    try {
      const payload = app.jwt.verify<{ sub: string; role: string }>(refreshToken)
      if (payload.role !== 'SUPER_ADMIN') throw new Error()
      const accessToken = app.jwt.sign({ sub: payload.sub, role: 'SUPER_ADMIN' }, { expiresIn: '7d' })
      return reply.send({ data: { accessToken } })
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido', statusCode: 401 })
    }
  })

  // GET /super-admin/auth/me
  app.get('/me', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const payload = request.user as { sub: string }
    const admin = await app.prisma.superAdmin.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true },
    })
    if (!admin) {
      return reply.status(404).send({ error: 'Not Found', message: 'Admin não encontrado', statusCode: 404 })
    }
    return reply.send({ data: { admin } })
  })

  // PATCH /super-admin/auth/profile
  app.patch('/profile', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const payload = request.user as { sub: string }
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const existing = await app.prisma.superAdmin.findFirst({
      where: { email: body.data.email, NOT: { id: payload.sub } },
    })
    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'E-mail já em uso', statusCode: 409 })
    }

    const admin = await app.prisma.superAdmin.update({
      where: { id: payload.sub },
      data: { name: body.data.name, email: body.data.email },
      select: { id: true, name: true, email: true },
    })
    return reply.send({ data: { admin } })
  })

  // PATCH /super-admin/auth/password
  app.patch('/password', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const payload = request.user as { sub: string }
    const schema = z.object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(6),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const admin = await app.prisma.superAdmin.findUnique({ where: { id: payload.sub } })
    if (!admin) {
      return reply.status(404).send({ error: 'Not Found', message: 'Admin não encontrado', statusCode: 404 })
    }

    const valid = await bcrypt.compare(body.data.currentPassword, admin.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Senha atual incorreta', statusCode: 401 })
    }

    const hashed = await bcrypt.hash(body.data.newPassword, 10)
    await app.prisma.superAdmin.update({
      where: { id: payload.sub },
      data: { password: hashed },
    })
    return reply.send({ data: { message: 'Senha atualizada com sucesso' } })
  })
}

export default superAdminAuthRoutes
