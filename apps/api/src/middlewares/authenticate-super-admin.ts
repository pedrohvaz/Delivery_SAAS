import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticateSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const user = request.user as { role?: string; type?: string }
    // Refresh token (30 dias) não vale como acesso
    if (user.role !== 'SUPER_ADMIN' || user.type === 'refresh') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Acesso restrito', statusCode: 403 })
    }
  } catch {
    reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido ou expirado', statusCode: 401 })
  }
}
