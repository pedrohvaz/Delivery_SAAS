import type { FastifyRequest, FastifyReply } from 'fastify'

// Exige um token de CLIENTE (conta global da vitrine).
// Tokens de admin/super-admin não têm `type: 'customer'` e são barrados.
export async function authenticateCustomer(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const u = request.user as unknown as { type?: string }
    if (u.type !== 'customer') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Token inválido para cliente', statusCode: 403 })
    }
  } catch {
    reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido ou expirado', statusCode: 401 })
  }
}
