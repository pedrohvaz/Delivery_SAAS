import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authenticateSuperAdmin } from '../../middlewares/authenticate-super-admin.js'

const superAdminUsersRoutes: FastifyPluginAsync = async (app) => {

  // GET /super-admin/users — todos os usuários de todas as lojas
  app.get('/', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { page = '1', search = '', role } = request.query as { page?: string; search?: string; role?: string }
    const take = 30
    const skip = (Number(page) - 1) * take

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (role) where.role = role

    const [users, total] = await Promise.all([
      app.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
          store: { select: { id: true, name: true, slug: true } },
        },
      }),
      app.prisma.user.count({ where }),
    ])

    return reply.send({ data: users, total, page: Number(page), totalPages: Math.ceil(total / take) })
  })

  // PATCH /super-admin/users/:id/toggle-active — ativar/desativar usuário
  app.patch('/:id/toggle-active', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await app.prisma.user.findUnique({ where: { id }, select: { isActive: true } })
    if (!user) return reply.status(404).send({ error: 'Not Found', message: 'Usuário não encontrado', statusCode: 404 })

    const updated = await app.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    })
    return reply.send({ data: updated })
  })

  // POST /super-admin/users/:id/reset-password — resetar senha
  app.post('/:id/reset-password', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({ newPassword: z.string().min(6) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Senha deve ter mínimo 6 caracteres', statusCode: 400 })

    const user = await app.prisma.user.findUnique({ where: { id } })
    if (!user) return reply.status(404).send({ error: 'Not Found', message: 'Usuário não encontrado', statusCode: 404 })

    const hashed = await bcrypt.hash(body.data.newPassword, 10)
    await app.prisma.user.update({ where: { id }, data: { password: hashed } })
    return reply.send({ data: { message: 'Senha resetada com sucesso' } })
  })

  // GET /super-admin/admins — listar super admins
  app.get('/admins', { preHandler: [authenticateSuperAdmin] }, async (_request, reply) => {
    const admins = await app.prisma.superAdmin.findMany({
      select: { id: true, name: true, email: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return reply.send({ data: admins })
  })

  // POST /super-admin/admins — criar novo super admin
  app.post('/admins', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: body.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })

    const existing = await app.prisma.superAdmin.findUnique({ where: { email: body.data.email } })
    if (existing) return reply.status(409).send({ error: 'Conflict', message: 'E-mail já cadastrado', statusCode: 409 })

    const hashed = await bcrypt.hash(body.data.password, 10)
    const admin = await app.prisma.superAdmin.create({
      data: { name: body.data.name, email: body.data.email, password: hashed },
      select: { id: true, name: true, email: true, isActive: true, createdAt: true },
    })
    return reply.status(201).send({ data: admin })
  })

  // PATCH /super-admin/admins/:id/toggle-active
  app.patch('/admins/:id/toggle-active', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const admin = await app.prisma.superAdmin.findUnique({ where: { id }, select: { isActive: true } })
    if (!admin) return reply.status(404).send({ error: 'Not Found', message: 'Admin não encontrado', statusCode: 404 })

    const updated = await app.prisma.superAdmin.update({
      where: { id },
      data: { isActive: !admin.isActive },
      select: { id: true, isActive: true },
    })
    return reply.send({ data: updated })
  })
}

export default superAdminUsersRoutes
