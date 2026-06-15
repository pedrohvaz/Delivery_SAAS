import type { FastifyInstance } from 'fastify'
import type { BotProfile } from './types.js'

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/**
 * Carrega o perfil de CRM do cliente (escopo do tenant) por telefone.
 * Retorna null para cliente novo (sem histórico).
 */
export async function loadProfile(app: FastifyInstance, storeId: string, phone: string): Promise<BotProfile | null> {
  const customer = await app.prisma.customer.findUnique({
    where: { storeId_phone: { storeId, phone } },
    include: {
      addresses: { orderBy: { isDefault: 'desc' } },
      orders: { orderBy: { createdAt: 'desc' }, take: 1, include: { items: true } },
      _count: { select: { orders: true } },
    },
  })

  if (!customer) return null

  const last = customer.orders[0]
  const lastOrderSummary = last
    ? `${last.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')} — R$ ${Number(last.total)
        .toFixed(2)
        .replace('.', ',')} (${formatDate(last.createdAt)})`
    : undefined

  return {
    customerId: customer.id,
    name: customer.name,
    ordersCount: customer._count.orders,
    lastOrderSummary,
    notes: customer.notes,
    addresses: customer.addresses.map((a) => ({
      id: a.id,
      street: a.street,
      number: a.number,
      complement: a.complement,
      district: a.district,
      city: a.city,
      state: a.state,
      zipCode: a.zipCode,
      reference: a.reference,
      isDefault: a.isDefault,
    })),
  }
}
