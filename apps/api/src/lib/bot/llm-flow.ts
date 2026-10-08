import type { FastifyInstance } from 'fastify'
import { buildSystemPrompt, callAI, type PromptCustomer } from '../ai-attendant.js'
import { computeSubtotal, type OrderItemInput } from '../order-service.js'
import { MAX_ITENS_CARRINHO, MAX_QTD_ITEM, MAX_VALOR_PEDIDO } from './limits.js'
import { setState } from './session.js'
import { controlBlockSchema, type BotProfile, type BotStore, type ControlBlock, type OrderDraft } from './types.js'
import type { MenuLookup } from './menu.js'
import { enterAddress } from './fixed-flow/address.js'
import { enterPayment } from './fixed-flow/payment.js'
import { enterConfirmation } from './fixed-flow/confirmation.js'

interface ParsedResponse {
  reply: string
  control: ControlBlock | null
  /** false = a resposta da IA não é utilizável; quem chama deve mandar a mensagem padrão. */
  ok: boolean
}

const MAX_REPLY_CHARS = 1500

/**
 * A IA às vezes "degenera": entra em loop repetindo trechos ou troca de alfabeto
 * (ex.: coreano no meio de uma conversa em português). Esse texto nunca vai ao cliente.
 */
export function isSaneReply(text: string): boolean {
  const t = text.trim()
  if (!t || t.length > MAX_REPLY_CHARS) return false
  // Alfabetos que não são do português (CJK, hangul, cirílico, árabe…)
  const foreign = (t.match(/[Ѐ-ӿ؀-ۿ぀-ヿ㐀-鿿가-힯]/g) ?? []).length
  if (foreign > 3) return false
  // Mesma frase repetida muitas vezes = loop
  const parts = t.split(/[.!?\n]+/).map((x) => x.trim()).filter((x) => x.length >= 8)
  const counts = new Map<string, number>()
  for (const part of parts) counts.set(part, (counts.get(part) ?? 0) + 1)
  if ([...counts.values()].some((n) => n >= 4)) return false
  return true
}

/** Recupera o valor de "reply" de um JSON cortado/corrompido (o resto é descartado). */
function salvageReply(raw: string): string | null {
  const m = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (!m) return null
  try {
    return (JSON.parse(`"${m[1]}"`) as string).trim()
  } catch {
    return null
  }
}

/** Markdown → formatação do WhatsApp (**negrito** vira *negrito*; títulos # viram texto). */
export function toWhatsAppFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/__(.+?)__/g, '_$1_')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

/**
 * Faz parse da resposta da IA em { reply, control }. Nunca devolve JSON cru nem
 * texto degenerado como reply: nesses casos retorna ok=false e reply vazio.
 */
export function parseControl(raw: string): ParsedResponse {
  const fail: ParsedResponse = { reply: '', control: null, ok: false }
  const text = (raw ?? '').trim()
  const start = text.indexOf('{')

  // Sem JSON: texto livre (ex.: provedor que ignora o modo JSON)
  if (start === -1) return isSaneReply(text) ? { reply: toWhatsAppFormat(text), control: null, ok: true } : fail

  const end = text.lastIndexOf('}')
  if (end > start) {
    try {
      const obj = JSON.parse(text.slice(start, end + 1))
      const reply = typeof obj.reply === 'string' ? obj.reply.trim() : ''
      const parsed = controlBlockSchema.safeParse(obj) // ignora "reply", valida cart/intent/orderType/customerName
      if (!isSaneReply(reply)) return { ...fail, control: parsed.success ? parsed.data : null }
      return { reply: toWhatsAppFormat(reply), control: parsed.success ? parsed.data : null, ok: true }
    } catch {
      /* JSON inválido — tenta recuperar só o reply abaixo */
    }
  }

  // JSON cortado/corrompido: aproveita apenas o texto do "reply", se estiver inteiro e são.
  // O bloco de controle (carrinho) é descartado — não dá para confiar nele.
  const salvaged = salvageReply(text)
  if (salvaged && isSaneReply(salvaged)) return { reply: toWhatsAppFormat(salvaged), control: null, ok: true }
  return fail
}

/** Mensagem enviada quando a IA falha (resposta inutilizável ou erro de API). */
export function aiFallbackReply(storeSlug: string): string {
  const base = (process.env.STORE_URL ?? 'https://bylink.shop').replace(/\/$/, '')
  return `Desculpe, tive um probleminha para responder agora 😅. Pode repetir, por favor?\n\nSe preferir, faça seu pedido direto pelo cardápio: ${base}/${storeSlug}`
}

/**
 * Revalida o carrinho do LLM contra o cardápio real: preços/nomes vêm do banco,
 * itens inexistentes são descartados, e os TETOS de segurança são aplicados como
 * clamp (quantidade por item e nº de itens distintos).
 */
export function revalidateCart(cart: ControlBlock['cart'], menu: MenuLookup): OrderItemInput[] {
  const items: OrderItemInput[] = []
  for (const entry of cart) {
    if (items.length >= MAX_ITENS_CARRINHO) break // teto de itens distintos
    const product = menu.productsById.get(entry.productId)
    if (!product) continue // ignora itens inexistentes
    const addons = entry.addons
      .map((optId) => product.addonsById.get(optId))
      .filter((o): o is NonNullable<typeof o> => !!o)
      .map((o) => ({ groupId: o.groupId, groupName: o.groupName, optionId: o.optionId, optionName: o.optionName, price: o.price }))
    items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: Math.min(Math.max(1, entry.quantity), MAX_QTD_ITEM), // clamp 1..MAX
      notes: entry.notes,
      addons,
    })
  }
  return items
}

function toPromptCustomer(profile: BotProfile): PromptCustomer {
  const def = profile.addresses.find((a) => a.isDefault) ?? profile.addresses[0]
  return {
    name: profile.name,
    ordersCount: profile.ordersCount,
    lastOrderSummary: profile.lastOrderSummary,
    defaultAddress: def ? `${def.street}, ${def.number} — ${def.district}` : undefined,
    notes: profile.notes,
  }
}

/**
 * Parte livre da conversa: chama o LLM, atualiza o carrinho a partir do bloco
 * de controle e, no checkout, transiciona para o fluxo fixo.
 */
export async function handleLlmFree(
  app: FastifyInstance,
  store: BotStore,
  conv: { id: string },
  profile: BotProfile | null,
  menu: MenuLookup,
  draft: OrderDraft,
  _text: string,
): Promise<string> {
  // Histórico para o LLM: só turnos reais (user/assistant) — exclui mensagens
  // determinísticas (boas-vindas/loja fechada salvas como 'system') que o modelo
  // tende a ecoar. Pega as 20 mais RECENTES, em ordem cronológica.
  const history = (
    await app.prisma.conversationMessage.findMany({
      where: { conversationId: conv.id, role: { in: ['user', 'assistant'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  ).reverse()

  const systemPrompt = buildSystemPrompt({
    storeName: store.name,
    storeDescription: store.description,
    estimatedTime: store.estimatedTime,
    minOrderValue: store.minOrderValue,
    schedules: store.schedules,
    paymentMethods: store.paymentMethods,
    deliveryAreas: store.deliveryAreas,
    menu: menu.categories,
    customPrompt: store.automationConfig?.systemPrompt ?? null,
    storeSlug: store.slug,
    customer: profile ? toPromptCustomer(profile) : null,
    currentCart: draft.items.map((i) => ({ quantity: i.quantity, name: i.name, addons: i.addons })),
  })

  let aiRaw: string
  try {
    aiRaw = await callAI(
      {
        aiProvider: store.automationConfig!.aiProvider,
        aiApiKey: store.automationConfig!.aiApiKey,
        aiModel: store.automationConfig!.aiModel,
      },
      systemPrompt,
      history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { json: true },
    )
  } catch (err) {
    // IA fora do ar / chave inválida / sem crédito: o cliente não pode ficar sem resposta
    app.log.error({ err: (err as Error).message, storeId: store.id }, 'bot: falha ao chamar a IA')
    await setState(app, conv.id, 'LLM_FREE', draft)
    return aiFallbackReply(store.slug)
  }

  const parsed = parseControl(aiRaw)
  if (!parsed.ok) {
    app.log.warn({ storeId: store.id, rawLength: aiRaw?.length ?? 0 }, 'bot: resposta da IA inutilizável — enviando mensagem padrão')
    await setState(app, conv.id, 'LLM_FREE', draft)
    return aiFallbackReply(store.slug)
  }
  const { reply, control } = parsed

  if (control) {
    draft.type = control.orderType
    if (control.customerName) draft.customerName = control.customerName
    draft.items = revalidateCart(control.cart, menu)
  }

  // Checkout → entra no fluxo fixo
  if (control?.intent === 'checkout') {
    if (draft.items.length === 0) {
      await setState(app, conv.id, 'LLM_FREE', draft)
      return `${reply}\n\nVi que o carrinho está vazio 🙂. Me diga o que você gostaria de pedir.`
    }
    const subtotal = computeSubtotal(draft.items)
    if (store.minOrderValue > 0 && subtotal < store.minOrderValue) {
      await setState(app, conv.id, 'LLM_FREE', draft)
      return `${reply}\n\nO pedido mínimo é de R$ ${store.minOrderValue.toFixed(2).replace('.', ',')}. Quer adicionar mais alguma coisa?`
    }
    // Teto de valor: pedido muito alto não finaliza sozinho (evita carrinho absurdo/erro).
    if (subtotal > MAX_VALOR_PEDIDO) {
      app.log.warn(`bot: pedido acima do teto (R$ ${subtotal}) loja=${store.id} phone=${conv.id}`)
      await setState(app, conv.id, 'LLM_FREE', draft)
      return `${reply}\n\nEste pedido ficou bem alto (R$ ${subtotal.toFixed(2).replace('.', ',')}). Para pedidos grandes, peço que fale com nosso atendimento para confirmarmos tudo certinho. 🙂`
    }
    draft.subtotal = subtotal

    // Endereço/pagamento de uma tentativa anterior nesta mesma conversa (ex.:
    // pedido reaberto após falha) já ficam salvos no draft — não repete a
    // pergunta se a informação ainda está lá.
    const needsAddress = draft.type === 'DELIVERY' && !draft.address
    if (needsAddress) {
      const prompt = enterAddress(profile, draft)
      await setState(app, conv.id, 'COLLECTING_ADDRESS', draft)
      return reply ? `${reply}\n\n${prompt}` : prompt
    }
    if (!draft.paymentMethod) {
      await setState(app, conv.id, 'SELECTING_PAYMENT', draft)
      const prompt = enterPayment(store)
      return reply ? `${reply}\n\n${prompt}` : prompt
    }

    const summary = await enterConfirmation(app, store, conv.id, draft)
    return reply ? `${reply}\n\n${summary}` : summary
  }

  // Continua na conversa livre
  await setState(app, conv.id, 'LLM_FREE', draft)
  return reply || 'Como posso ajudar? 🙂'
}
