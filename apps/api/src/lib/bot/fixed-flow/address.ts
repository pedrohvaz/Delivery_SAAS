import type { FastifyInstance } from 'fastify'
import { OrderError, computeSubtotal, resolveDeliveryFee } from '../../order-service.js'
import { setState } from '../session.js'
import type { BotProfile, BotProfileAddress, BotStore, DraftAddress, OrderDraft } from '../types.js'
import { enterPayment } from './payment.js'

function formatSaved(a: BotProfileAddress): string {
  const base = `${a.street}, ${a.number} — ${a.district}`
  return a.isDefault ? `${base} (padrão)` : base
}

function toDraftAddress(a: BotProfileAddress): DraftAddress {
  return {
    street: a.street,
    number: a.number,
    complement: a.complement ?? undefined,
    district: a.district,
    city: a.city,
    state: a.state,
    zipCode: a.zipCode,
    reference: a.reference ?? undefined,
  }
}

/** Parse tolerante de endereço em texto livre: "Rua, número, bairro, cidade/UF, ref". */
function parseAddress(text: string): DraftAddress | null {
  const parts = text.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length < 3) return null
  const [street, number, district, cityUf, ...rest] = parts
  let city = ''
  let state = ''
  if (cityUf) {
    const m = cityUf.split('/')
    city = (m[0] ?? '').trim()
    state = (m[1] ?? '').trim()
  }
  return {
    street: street!,
    number: number!,
    district: district!,
    city,
    state,
    zipCode: '',
    reference: rest.length > 0 ? rest.join(', ') : undefined,
  }
}

/** Texto inicial da etapa de endereço (lista salvos ou pede um novo). */
export function enterAddress(profile: BotProfile | null, draft: OrderDraft): string {
  if (profile && profile.addresses.length > 0) {
    draft.addressPrompted = true
    const list = profile.addresses.map((a, i) => `${i + 1}. ${formatSaved(a)}`).join('\n')
    return `📍 Para qual endereço será a entrega?\n\n${list}\n${profile.addresses.length + 1}. Informar outro endereço\n\nResponda com o número.`
  }
  draft.addressPrompted = false
  return '📍 Qual o endereço de entrega? Envie *rua, número, bairro, cidade/UF* (e ponto de referência, se quiser).'
}

/** Aplica a taxa de entrega ao draft e avança para o pagamento (ou pede outro endereço). */
async function finalizeAddress(
  app: FastifyInstance,
  store: BotStore,
  convId: string,
  draft: OrderDraft,
): Promise<string> {
  try {
    const subtotal = computeSubtotal(draft.items)
    draft.subtotal = subtotal
    draft.deliveryFee = resolveDeliveryFee({
      areas: store.deliveryAreas,
      type: 'DELIVERY',
      district: draft.address?.district,
      subtotal,
    })
  } catch (err) {
    if (err instanceof OrderError && err.code === 'DELIVERY_UNAVAILABLE') {
      draft.address = undefined
      draft.addressId = undefined
      draft.addressPrompted = false
      await setState(app, convId, 'COLLECTING_ADDRESS', draft)
      return `😔 ${err.message}\n\nVocê pode informar outro endereço?`
    }
    throw err
  }

  await setState(app, convId, 'SELECTING_PAYMENT', draft)
  return enterPayment(store)
}

export async function handleAddress(
  app: FastifyInstance,
  store: BotStore,
  conv: { id: string },
  profile: BotProfile | null,
  draft: OrderDraft,
  text: string,
): Promise<string> {
  const trimmed = text.trim()

  // Escolha entre endereços salvos
  if (draft.addressPrompted && profile && profile.addresses.length > 0) {
    const n = parseInt(trimmed, 10)
    if (!Number.isNaN(n)) {
      if (n >= 1 && n <= profile.addresses.length) {
        const a = profile.addresses[n - 1]!
        draft.address = toDraftAddress(a)
        draft.addressId = a.id
        draft.addressPrompted = false
        return finalizeAddress(app, store, conv.id, draft)
      }
      if (n === profile.addresses.length + 1) {
        draft.addressPrompted = false
        await setState(app, conv.id, 'COLLECTING_ADDRESS', draft)
        return 'Certo! Envie o endereço completo: *rua, número, bairro, cidade/UF*.'
      }
    }
    // Não foi um número válido → tenta interpretar como endereço em texto livre
  }

  const parsed = parseAddress(trimmed)
  if (!parsed) {
    await setState(app, conv.id, 'COLLECTING_ADDRESS', draft)
    return 'Não consegui entender o endereço 😅. Envie assim: *Rua das Flores, 123, Centro, São Paulo/SP*.'
  }

  draft.address = parsed
  draft.addressId = undefined
  draft.addressPrompted = false
  return finalizeAddress(app, store, conv.id, draft)
}
