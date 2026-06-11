import type { FastifyRequest, FastifyReply } from 'fastify'
import type { JwtPayload } from '@delivery/types'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    // Rotas do lojista exigem um token de admin de loja (com storeId).
    // Bloqueia tokens de cliente (type: 'customer'), de super-admin e refresh tokens —
    // sem isso, where: { storeId: undefined } no Prisma ignoraria o filtro e vazaria dados entre lojas.
    const u = request.user as unknown as { storeId?: string; type?: string }
    if (u.type === 'customer' || !u.storeId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Acesso restrito ao lojista', statusCode: 403 })
    }
  } catch {
    reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido ou expirado', statusCode: 401 })
  }
}

// Tipar o user decodificado como JwtPayload no request
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtPayload
  }
}
