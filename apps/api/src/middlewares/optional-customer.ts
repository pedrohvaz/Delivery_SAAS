import type { FastifyRequest } from 'fastify'

// Lê o token de cliente SE presente; nunca retorna 401.
// Mantém rotas públicas (ex.: POST /orders) funcionando para visitantes (guest).
// Retorna o accountId quando há um token de cliente válido, senão null.
export async function getOptionalCustomerAccountId(request: FastifyRequest): Promise<string | null> {
  const auth = request.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = (await request.jwtVerify()) as unknown as { sub?: string; type?: string }
    if (decoded?.type !== 'customer' || !decoded.sub) return null
    return decoded.sub
  } catch {
    return null
  }
}
