import type { FastifyInstance } from 'fastify'
import { setState } from '../session.js'
import type { BotStore, OrderDraft } from '../types.js'
import { enterConfirmation } from './confirmation.js'

/** Texto inicial da etapa de pagamento (lista numerada das formas ativas). */
export function enterPayment(store: BotStore): string {
  if (store.paymentMethods.length === 0) {
    return '💳 Como você prefere pagar? (ex: dinheiro, pix, cartão)'
  }
  const list = store.paymentMethods.map((m, i) => `${i + 1}. ${m.label}`).join('\n')
  return `💳 Como você prefere pagar?\n\n${list}\n\nResponda com o número.`
}

function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const value = Number(cleaned)
  return Number.isFinite(value) && value > 0 ? value : null
}

export async function handlePayment(
  app: FastifyInstance,
  store: BotStore,
  conv: { id: string; customerPhone: string; customerName: string | null },
  draft: OrderDraft,
  text: string,
): Promise<string> {
  const trimmed = text.trim()

  // Sub-etapa: aguardando o valor do troco (dinheiro)
  if (draft.paymentMethod === 'CASH' && draft.changeAsked) {
    draft.changeAsked = false
    if (!/^(n|não|nao|sem|nada|0)/i.test(trimmed)) {
      const val = parseMoney(trimmed)
      if (val != null) draft.changeFor = val
    }
    return enterConfirmation(app, store, conv.id, draft)
  }

  // Escolha da forma de pagamento (por número ou nome)
  const methods = store.paymentMethods
  let chosen = methods.find((_, i) => String(i + 1) === trimmed)
  if (!chosen) {
    const lower = trimmed.toLowerCase()
    chosen = methods.find((m) => m.label.toLowerCase() === lower || m.type.toLowerCase() === lower)
  }
  if (!chosen && methods.length === 0) {
    // Loja sem formas cadastradas — aceita texto livre
    draft.paymentMethod = trimmed.toUpperCase()
    return enterConfirmation(app, store, conv.id, draft)
  }
  if (!chosen) {
    await setState(app, conv.id, 'SELECTING_PAYMENT', draft)
    return `Não entendi 😅.\n\n${enterPayment(store)}`
  }

  draft.paymentMethod = chosen.type

  if (chosen.type === 'CASH') {
    draft.changeAsked = true
    await setState(app, conv.id, 'SELECTING_PAYMENT', draft)
    return 'Você vai precisar de troco? Se sim, troco para quanto? (responda *não* se não precisar)'
  }

  return enterConfirmation(app, store, conv.id, draft)
}
