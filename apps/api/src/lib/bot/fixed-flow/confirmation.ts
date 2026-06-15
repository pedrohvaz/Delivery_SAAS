import type { FastifyInstance } from 'fastify'
import { computeSubtotal, resolveDeliveryFee } from '../../order-service.js'
import { resetToFree, setState } from '../session.js'
import type { BotProfile, BotStore, OrderDraft } from '../types.js'
import { registerOrder } from './register.js'

function money(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function formatAddress(a: NonNullable<OrderDraft['address']>): string {
  const base = `${a.street}, ${a.number}${a.complement ? ` (${a.complement})` : ''} — ${a.district}`
  const city = a.city ? `, ${a.city}${a.state ? `/${a.state}` : ''}` : ''
  return base + city + (a.reference ? `\nRef.: ${a.reference}` : '')
}

function buildSummary(store: BotStore, draft: OrderDraft): string {
  const lines = draft.items.map((item) => {
    const addonsTotal = item.addons.reduce((a, b) => a + b.price, 0)
    const unit = item.price + addonsTotal
    const addons = item.addons.length > 0 ? ` (${item.addons.map((a) => a.optionName).join(', ')})` : ''
    return `• ${item.quantity}x ${item.name}${addons} — ${money(unit * item.quantity)}`
  })

  const paymentLabel =
    store.paymentMethods.find((m) => m.type === draft.paymentMethod)?.label ?? draft.paymentMethod ?? '—'

  const parts = [
    '🧾 *Confira seu pedido:*',
    '',
    lines.join('\n'),
    '',
    `Subtotal: ${money(draft.subtotal ?? 0)}`,
  ]
  if (draft.type === 'DELIVERY') parts.push(`Entrega: ${money(draft.deliveryFee ?? 0)}`)
  parts.push(`*Total: ${money(draft.total ?? 0)}*`)
  parts.push('')
  if (draft.type === 'DELIVERY' && draft.address) parts.push(`📍 Entrega: ${formatAddress(draft.address)}`)
  else parts.push('🏠 Retirada no local')
  parts.push(`💳 Pagamento: ${paymentLabel}`)
  if (draft.paymentMethod === 'CASH' && draft.changeFor) parts.push(`💵 Troco para: ${money(draft.changeFor)}`)
  parts.push(`⏱ Tempo estimado: ${store.estimatedTime} min`)
  parts.push('')
  parts.push('Posso confirmar? Responda *sim* para finalizar ou *não* para ajustar.')

  return parts.join('\n')
}

/** Recalcula os totais de forma autoritativa, salva o draft e exibe o resumo. */
export async function enterConfirmation(
  app: FastifyInstance,
  store: BotStore,
  convId: string,
  draft: OrderDraft,
): Promise<string> {
  const subtotal = computeSubtotal(draft.items)
  let deliveryFee = 0
  if (draft.type === 'DELIVERY') {
    deliveryFee = resolveDeliveryFee({
      areas: store.deliveryAreas,
      type: 'DELIVERY',
      district: draft.address?.district,
      subtotal,
    })
  }
  draft.subtotal = subtotal
  draft.deliveryFee = deliveryFee
  draft.total = Math.max(0, subtotal + deliveryFee)

  await setState(app, convId, 'AWAITING_CONFIRMATION', draft)
  return buildSummary(store, draft)
}

export async function handleConfirmation(
  app: FastifyInstance,
  store: BotStore,
  conv: { id: string; customerPhone: string; customerName: string | null },
  _profile: BotProfile | null,
  draft: OrderDraft,
  text: string,
): Promise<string> {
  const t = text.trim().toLowerCase()

  if (/^(sim|s|confirmar|confirmo|confirma|isso|pode|👍|ok|claro|positivo)\b/.test(t) || t.includes('confirm')) {
    return registerOrder(app, store, conv, draft)
  }

  if (/(n[aã]o|cancela|cancelar|editar|mudar|alterar|trocar|errado)/.test(t)) {
    await resetToFree(app, conv.id)
    return 'Sem problemas! 🙂 Me diga o que você quer ajustar no pedido.'
  }

  await setState(app, conv.id, 'AWAITING_CONFIRMATION', draft)
  return 'Posso confirmar o pedido? Responda *sim* para finalizar ou *não* para ajustar.'
}
