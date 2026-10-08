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

/** Minúsculas, sem acento e com espaços normalizados — para comparar bairros/palavras. */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

const NUMBER_PREFIX = new Set(['n', 'no', 'nº', 'n°', 'num', 'numero', 'número', 'nro'])
const COMPLEMENT_WORDS = new Set(['apto', 'ap', 'apt', 'apartamento', 'bloco', 'bl', 'casa', 'fundos', 'lote', 'lt', 'quadra', 'qd', 'sala', 'loja', 'andar', 'torre'])
const REFERENCE_WORDS = new Set(['perto', 'proximo', 'próximo', 'ao', 'em', 'frente', 'referencia', 'referência', 'ref'])
const isNumberToken = (t: string) => /^\d{1,5}[a-z]?$/i.test(t) || /^s\/?n$/i.test(t)

/**
 * Lê um endereço escrito do jeito que o cliente quiser, sem exigir vírgulas:
 * "avenida são joão del rei 143 dom oscar", "av x centro 167", "Rua A, 10, Centro".
 * Usa os bairros atendidos pela loja (quando houver) para achar o bairro em
 * qualquer posição. Devolve o que conseguiu identificar — o bot pergunta o resto.
 */
export function parseAddressText(text: string, knownDistricts: string[] = []): Partial<DraftAddress> {
  const out: Partial<DraftAddress> = {}
  let t = text.replace(/\s+/g, ' ').trim()

  // CEP (opcional)
  const cep = t.match(/\b(\d{5})-?(\d{3})\b/)
  if (cep) {
    out.zipCode = `${cep[1]}${cep[2]}`
    t = t.replace(cep[0], ' ')
  }
  // "Cidade/UF" (opcional)
  const cityUf = t.match(/,?\s*([\p{L} ]{3,})\/([A-Za-z]{2})\b/u)
  if (cityUf) {
    out.city = cityUf[1]!.trim()
    out.state = cityUf[2]!.toUpperCase()
    t = t.replace(cityUf[0], ' ')
  }

  let tokens = t.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)

  // Bairro atendido em qualquer posição (o mais longo primeiro: "Dom Oscar" antes de "Oscar")
  const districts = [...knownDistricts].filter(Boolean).sort((a, b) => b.length - a.length)
  for (const d of districts) {
    const dt = normalizeText(d).split(' ')
    const nt = tokens.map(normalizeText)
    for (let i = 0; i + dt.length <= nt.length; i++) {
      if (dt.every((w, k) => nt[i + k] === w)) {
        out.district = d
        tokens = [...tokens.slice(0, i), ...tokens.slice(i + dt.length)]
        break
      }
    }
    if (out.district) break
  }

  // Complemento: a partir de "apto/bloco/casa…" até o fim
  const compIdx = tokens.findIndex((tk) => COMPLEMENT_WORDS.has(normalizeText(tk).replace(/\.$/, '')))
  let complementTokens: string[] = []
  if (compIdx > 0) {
    complementTokens = tokens.slice(compIdx)
    tokens = tokens.slice(0, compIdx)
  }

  // Número: o último token numérico (ruas como "Rua 7 de Setembro 100" têm números no nome)
  let numIdx = -1
  for (let i = tokens.length - 1; i >= 1; i--) {
    if (isNumberToken(tokens[i]!)) { numIdx = i; break }
  }

  if (numIdx >= 1) {
    out.number = tokens[numIdx]!.toUpperCase() === 'SN' ? 'S/N' : tokens[numIdx]!
    let streetTokens = tokens.slice(0, numIdx)
    if (streetTokens.length && NUMBER_PREFIX.has(normalizeText(streetTokens[streetTokens.length - 1]!))) streetTokens = streetTokens.slice(0, -1)
    out.street = streetTokens.join(' ')
    const after = tokens.slice(numIdx + 1)
    if (after.length) {
      if (!out.district && !REFERENCE_WORDS.has(normalizeText(after[0]!))) out.district = after.join(' ')
      else out.reference = after.join(' ')
    }
  } else if (tokens.length) {
    out.street = tokens.join(' ')
  }
  if (complementTokens.length) out.complement = complementTokens.join(' ')
  if (out.street !== undefined && out.street.replace(/[^\p{L}]/gu, '').length < 3) delete out.street
  return out
}

/** Bairros atendidos (áreas por bairro configuradas pela loja). */
function storeDistricts(store: BotStore): { name: string; fee: number }[] {
  return store.deliveryAreas
    .filter((a) => a.type === 'DISTRICT' && a.district)
    .map((a) => ({ name: a.district!, fee: a.fee }))
}

const money = (v: number) => (v === 0 ? 'grátis' : `R$ ${v.toFixed(2).replace('.', ',')}`)

function askDistrict(store: BotStore, intro = '🏘️ Qual o *bairro*?'): string {
  const list = storeDistricts(store)
  if (list.length === 0 || list.length > 30) return intro
  return `${intro}\n\n${list.map((d, i) => `${i + 1}. ${d.name} — entrega ${money(d.fee)}`).join('\n')}\n\nResponda com o número ou o nome do bairro.`
}

/** Texto inicial da etapa de endereço (lista salvos ou pede um novo). */
export function enterAddress(profile: BotProfile | null, draft: OrderDraft): string {
  draft.pendingAddress = undefined
  draft.addressAsk = undefined
  if (profile && profile.addresses.length > 0) {
    draft.addressPrompted = true
    const list = profile.addresses.map((a, i) => `${i + 1}. ${formatSaved(a)}`).join('\n')
    return `📍 Para qual endereço será a entrega?\n\n${list}\n${profile.addresses.length + 1}. Informar outro endereço\n\nResponda com o número.`
  }
  draft.addressPrompted = false
  return '📍 Qual o endereço de entrega? Pode mandar do seu jeito, ex.: *Av. São João, 143, Centro*.'
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
      // Rua/número continuam valendo: pergunta só o bairro de novo, mostrando os atendidos
      draft.pendingAddress = { ...draft.address, district: undefined }
      draft.address = undefined
      draft.addressId = undefined
      draft.addressPrompted = false
      draft.addressAsk = 'district'
      await setState(app, convId, 'COLLECTING_ADDRESS', draft)
      return askDistrict(store, '😔 Não entregamos nesse bairro. Escolha um dos bairros que atendemos:')
    }
    throw err
  }

  draft.pendingAddress = undefined
  draft.addressAsk = undefined
  await setState(app, convId, 'SELECTING_PAYMENT', draft)
  return enterPayment(store)
}

/** Preenche o campo que o bot acabou de perguntar a partir de uma resposta curta. */
function fillAsked(store: BotStore, ask: OrderDraft['addressAsk'], text: string, pending: Partial<DraftAddress>) {
  const t = text.trim()
  if (ask === 'number') {
    const m = t.match(/\d{1,5}[a-z]?|s\/?n/i)
    if (m) pending.number = /^s\/?n$/i.test(m[0]) ? 'S/N' : m[0]
    return
  }
  if (ask === 'district') {
    const list = storeDistricts(store)
    const n = parseInt(t, 10)
    if (!Number.isNaN(n) && String(n) === t && n >= 1 && n <= list.length) {
      pending.district = list[n - 1]!.name
      return
    }
    const hit = list.find((d) => normalizeText(d.name) === normalizeText(t))
    pending.district = hit ? hit.name : t
    return
  }
  if (ask === 'street') pending.street = t
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
        return 'Certo! Me manda o endereço, ex.: *Av. São João, 143, Centro*.'
      }
    }
    draft.addressPrompted = false
    // Não foi um número válido → tenta interpretar como endereço em texto livre
  }

  const pending: Partial<DraftAddress> = { ...(draft.pendingAddress ?? {}) }
  const districtNames = storeDistricts(store).map((d) => d.name)

  if (draft.addressAsk) {
    // Resposta à pergunta específica ("Qual o número?" / "Qual o bairro?")
    const before = JSON.stringify(pending)
    fillAsked(store, draft.addressAsk, trimmed, pending)
    // O cliente pode ter mandado o endereço inteiro de novo: aproveita o que vier
    if (JSON.stringify(pending) === before || trimmed.split(/\s+/).length >= 3) {
      const parsed = parseAddressText(trimmed, districtNames)
      for (const [k, v] of Object.entries(parsed)) if (v && !pending[k as keyof DraftAddress]) (pending as Record<string, string>)[k] = v
    }
  } else {
    Object.assign(pending, parseAddressText(trimmed, districtNames))
  }

  draft.pendingAddress = pending

  // Pergunta só o que falta, um campo por vez
  if (!pending.street) {
    draft.addressAsk = 'street'
    await setState(app, conv.id, 'COLLECTING_ADDRESS', draft)
    return 'Qual o nome da *rua* (ou avenida)? 🙂'
  }
  if (!pending.number) {
    draft.addressAsk = 'number'
    await setState(app, conv.id, 'COLLECTING_ADDRESS', draft)
    return `Anotei *${pending.street}*. Qual o *número*? (se não tiver, responda *s/n*)`
  }
  if (!pending.district) {
    draft.addressAsk = 'district'
    await setState(app, conv.id, 'COLLECTING_ADDRESS', draft)
    return askDistrict(store, `Anotei *${pending.street}, ${pending.number}*. Qual o *bairro*?`)
  }

  draft.address = {
    street: pending.street,
    number: pending.number,
    complement: pending.complement,
    district: pending.district,
    city: pending.city || store.city || '',
    state: pending.state || store.state || '',
    zipCode: pending.zipCode ?? '',
    reference: pending.reference,
  }
  draft.addressId = undefined
  draft.addressPrompted = false
  draft.addressAsk = undefined
  return finalizeAddress(app, store, conv.id, draft)
}
