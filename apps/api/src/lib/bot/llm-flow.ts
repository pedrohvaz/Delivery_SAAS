import type { FastifyInstance } from 'fastify'
import { buildSystemPrompt, callAI, type PromptCustomer } from '../ai-attendant.js'
import { computeSubtotal, type OrderItemInput } from '../order-service.js'
import { MAX_ITENS_CARRINHO, MAX_QTD_ITEM, MAX_VALOR_PEDIDO } from './limits.js'
import { setState } from './session.js'
import { controlBlockSchema, type BotProfile, type BotStore, type ControlBlock, type OrderDraft } from './types.js'
import type { MenuLookup } from './menu.js'
import { enterAddress } from './fixed-flow/address.js'
import { enterPayment } from './fixed-flow/payment.js'

interface ParsedResponse {
  reply: string
  control: ControlBlock | null
}

/** Faz parse da resposta JSON do LLM em { reply, control }. Tolerante a lixo ao redor. */
export function parseControl(raw: string): ParsedResponse {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return { reply: raw.trim(), control: null }
  try {
    const obj = JSON.parse(raw.slice(start, end + 1))
    const reply = typeof obj.reply === 'string' ? obj.reply.trim() : ''
    const parsed = controlBlockSchema.safeParse(obj) // ignora "reply", valida cart/intent/orderType/customerName
    return {
      reply: reply || 'Como posso ajudar? 🙂',
      control: parsed.success ? parsed.data : null,
    }
  } catch {
    // Não veio JSON válido: manda o texto cru como reply (fallback)
    return { reply: raw.trim(), control: null }
  }
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

  const aiRaw = await callAI(
    {
      aiProvider: store.automationConfig!.aiProvider,
      aiApiKey: store.automationConfig!.aiApiKey,
      aiModel: store.automationConfig!.aiModel,
    },
    systemPrompt,
    history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { json: true },
  )

  const { reply, control } = parseControl(aiRaw)

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

    if (draft.type === 'DELIVERY') {
      const prompt = enterAddress(profile, draft)
      await setState(app, conv.id, 'COLLECTING_ADDRESS', draft)
      return reply ? `${reply}\n\n${prompt}` : prompt
    }
    await setState(app, conv.id, 'SELECTING_PAYMENT', draft)
    const prompt = enterPayment(store)
    return reply ? `${reply}\n\n${prompt}` : prompt
  }

  // Continua na conversa livre
  await setState(app, conv.id, 'LLM_FREE', draft)
  return reply || 'Como posso ajudar? 🙂'
}
