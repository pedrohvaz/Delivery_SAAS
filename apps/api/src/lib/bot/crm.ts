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

/** Limpa o nome vindo do perfil do WhatsApp (pode ter emoji, espaços, ser só ".") */
export function cleanWhatsAppName(raw?: string | null): string | null {
  if (!raw) return null
  const name = raw.replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
  // Precisa ter ao menos 2 letras para ser um nome (evita ".", "🙂", números)
  return (name.match(/\p{L}/gu) ?? []).length >= 2 ? name : null
}

const PLACEHOLDER_NAMES = new Set(['', 'cliente'])

/**
 * Usa o nome do perfil do WhatsApp como nome do cliente na loja: cria o cadastro
 * (aba Clientes) no primeiro contato e substitui o genérico "Cliente". Nunca
 * sobrescreve um nome que o lojista ou o próprio cliente já informou.
 * Retorna o nome conhecido do cliente (para cumprimentar), se houver.
 */
export async function syncCustomerName(
  app: FastifyInstance,
  storeId: string,
  phone: string,
  conversationId: string,
  pushName?: string,
): Promise<string | null> {
  const name = cleanWhatsAppName(pushName)
  try {
    const existing = await app.prisma.customer.findUnique({
      where: { storeId_phone: { storeId, phone } },
      select: { id: true, name: true },
    })
    let current = existing?.name ?? null
    if (name) {
      if (!existing) {
        const created = await app.prisma.customer.create({ data: { storeId, phone, name }, select: { id: true } })
        await app.prisma.conversation.update({ where: { id: conversationId }, data: { customerId: created.id, customerName: name } })
        current = name
      } else if (PLACEHOLDER_NAMES.has(existing.name.trim().toLowerCase())) {
        await app.prisma.customer.update({ where: { id: existing.id }, data: { name } })
        current = name
      }
      await app.prisma.conversation.updateMany({ where: { id: conversationId, customerName: null }, data: { customerName: name } })
    }
    return current && !PLACEHOLDER_NAMES.has(current.trim().toLowerCase()) ? current : null
  } catch (err) {
    app.log.warn({ err: (err as Error).message }, 'bot: não foi possível salvar o nome do WhatsApp')
    return name
  }
}
