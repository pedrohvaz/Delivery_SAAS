import type { FastifyRequest, FastifyReply } from 'fastify'
import type { JwtPayload } from '@delivery/types'

// Cache curto do "usuário ainda está ativo?" para não consultar o banco a cada requisição.
// Desativar um usuário passa a valer em no máximo ACTIVE_TTL_MS (o token de 7 dias não basta mais).
const ACTIVE_TTL_MS = 15_000
const activeCache = new Map<string, { active: boolean; at: number }>()

async function isUserActive(request: FastifyRequest, userId: string): Promise<boolean> {
  const hit = activeCache.get(userId)
  if (hit && Date.now() - hit.at < ACTIVE_TTL_MS) return hit.active
  const user = await request.server.prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } })
  const active = !!user?.isActive
  activeCache.set(userId, { active, at: Date.now() })
  if (activeCache.size > 5000) activeCache.clear()
  return active
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido ou expirado', statusCode: 401 })
  }
  // Rotas do lojista exigem um token de admin de loja (com storeId).
  // Bloqueia tokens de cliente (type: 'customer'), de super-admin e refresh tokens —
  // sem isso, where: { storeId: undefined } no Prisma ignoraria o filtro e vazaria dados entre lojas.
  const u = request.user as unknown as { sub?: string; storeId?: string; type?: string }
  if (u.type === 'customer' || u.type === 'refresh' || !u.storeId || !u.sub) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Acesso restrito ao lojista', statusCode: 403 })
  }
  if (!(await isUserActive(request, u.sub))) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Usuário desativado', statusCode: 401 })
  }
}

// Tipar o user decodificado como JwtPayload no request
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtPayload
  }
}
