import type { FastifyInstance } from 'fastify'
import { resolveAiKey } from '../ai-attendant.js'
import { evolutionSendText } from '../evolution.js'
import { loadMenu } from './menu.js'
import { loadProfile } from './crm.js'
import { getDraft, loadSession, resetToFree, saveMessage, setState } from './session.js'
import { buildWelcome, buildClosedMessage } from './welcome.js'
import { handleLlmFree } from './llm-flow.js'
import { isStoreOpenNow } from '../../routes/schedules/index.js'
import { MAX_MSG_CHARS, isDuplicateMessage, rateLimited, shouldNotifyRateLimit } from './limits.js'
import { handleAddress } from './fixed-flow/address.js'
import { handlePayment } from './fixed-flow/payment.js'
import { handleConfirmation } from './fixed-flow/confirmation.js'
import type { BotStore, ConversationStateValue } from './types.js'

export interface InboundMessage {
  storeSlug: string
  phone: string
  text: string
}

// Lock por conversa (storeSlug:phone) para processar mensagens em ordem.
const locks = new Map<string, Promise<unknown>>()

/** Carrega a loja com tudo que o bot precisa (Decimals convertidos em number). */
async function loadStoreForBot(app: FastifyInstance, slug: string): Promise<BotStore | null> {
  const s = await app.prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      customDomain: true,
      estimatedTime: true,
      minOrderValue: true,
      timezone: true,
      isOpen: true,
      acceptOrders: true,
      evolutionApiUrl: true,
      evolutionApiKey: true,
      evolutionInstance: true,
      schedules: { where: { isActive: true }, select: { dayOfWeek: true, openTime: true, closeTime: true } },
      paymentMethods: { where: { isActive: true }, select: { id: true, type: true, label: true } },
      deliveryAreas: {
        where: { isActive: true },
        select: { type: true, fee: true, district: true, freeFrom: true, name: true },
      },
      automationConfig: true,
    },
  })
  if (!s) return null

  return {
    ...s,
    minOrderValue: Number(s.minOrderValue),
    deliveryAreas: s.deliveryAreas.map((a) => ({
      type: a.type,
      district: a.district,
      name: a.name,
      fee: Number(a.fee),
      freeFrom: a.freeFrom != null ? Number(a.freeFrom) : null,
    })),
    automationConfig: s.automationConfig
      ? {
          isEnabled: s.automationConfig.isEnabled,
          aiProvider: s.automationConfig.aiProvider,
          aiApiKey: s.automationConfig.aiApiKey,
          aiModel: s.automationConfig.aiModel,
          systemPrompt: s.automationConfig.systemPrompt,
          closedMessage: s.automationConfig.closedMessage,
        }
      : null,
  }
}

/** A loja está aberta para pedidos agora? (mesma regra do order-service.) */
function isOpenForOrders(store: BotStore): boolean {
  if (!store.acceptOrders) return false
  if (store.isOpen) return true
  return isStoreOpenNow(store.schedules.map((s) => ({ ...s, isActive: true })), store.timezone)
}

async function sendWhatsApp(store: BotStore, phone: string, text: string): Promise<void> {
  if (store.evolutionApiUrl && store.evolutionApiKey && store.evolutionInstance) {
    await evolutionSendText(
      { url: store.evolutionApiUrl, apiKey: store.evolutionApiKey, instance: store.evolutionInstance },
      phone,
      text,
    )
  }
}

/**
 * Ponto de entrada do bot. Serializa as mensagens do mesmo cliente (lock) e
 * delega ao processamento, que roteia pelo estado da sessão.
 */
export async function handleInbound(app: FastifyInstance, msg: InboundMessage): Promise<void> {
  const key = `${msg.storeSlug}:${msg.phone}`
  const prev = locks.get(key) ?? Promise.resolve()
  const run = prev
    .catch(() => {})
    .then(() => processMessage(app, msg))
    .catch((err) => app.log.error({ err }, 'bot processMessage error'))
  locks.set(
    key,
    run.finally(() => {
      if (locks.get(key) === run) locks.delete(key)
    }),
  )
  await run
}

async function processMessage(app: FastifyInstance, { storeSlug, phone, text }: InboundMessage): Promise<void> {
  const store = await loadStoreForBot(app, storeSlug)
  if (!store || !store.automationConfig?.isEnabled) return

  const limitKey = `${store.id}:${phone}`

  // Dedupe: mensagem idêntica repetida em < 3s (duplo webhook / spam) → ignora.
  if (isDuplicateMessage(limitKey, text)) return

  // Rate-limit por cliente: protege custo de IA e evita flood.
  if (rateLimited(limitKey)) {
    app.log.warn(`bot: rate-limit atingido loja=${store.id} phone=${phone}`)
    if (shouldNotifyRateLimit(limitKey)) {
      await sendWhatsApp(store, phone, 'Recebi muitas mensagens 😅 me dá um instante e já te respondo!')
    }
    return
  }

  // Tamanho máximo da mensagem (trunca o excedente).
  if (text.length > MAX_MSG_CHARS) text = text.slice(0, MAX_MSG_CHARS)

  const conv = await loadSession(app, store.id, phone)
  // "Primeiro contato" = início de uma nova sessão: conta só mensagens ATIVAS
  // (user/assistant). Mensagens de pedidos concluídos/antigos viram 'archived'
  // (ver register/loadSession), então uma nova saudação dispara o welcome de novo.
  const isFirstContact =
    (await app.prisma.conversationMessage.count({
      where: { conversationId: conv.id, role: { in: ['user', 'assistant'] } },
    })) === 0
  await saveMessage(app, conv.id, 'user', text)

  // Loja fechada: avisa (com horários + link do cardápio) e NÃO deixa montar
  // pedido em vão. Anti-spam: repete o aviso no máximo a cada 30 min.
  if (!isOpenForOrders(store)) {
    const draft = getDraft(conv)
    const now = Date.now()
    const recentlyNotified = draft.closedNotifiedAt != null && now - draft.closedNotifiedAt < 30 * 60 * 1000
    if (!recentlyNotified) {
      const msg = buildClosedMessage(store)
      await saveMessage(app, conv.id, 'system', msg)
      await sendWhatsApp(store, phone, msg)
      draft.closedNotifiedAt = now
      await setState(app, conv.id, conv.state as ConversationStateValue, draft)
    }
    return
  }

  // Primeiro contato: boas-vindas determinísticas (nome da loja + link do cardápio),
  // sem chamar o LLM. Funciona mesmo sem chave de IA (modo "só link").
  if (isFirstContact) {
    const welcome = buildWelcome(store)
    await saveMessage(app, conv.id, 'system', welcome)
    await sendWhatsApp(store, phone, welcome)
    return
  }

  // Demais mensagens precisam de uma chave de IA utilizável (da loja ou da plataforma)
  try {
    resolveAiKey({ aiProvider: store.automationConfig.aiProvider, aiApiKey: store.automationConfig.aiApiKey })
  } catch {
    app.log.warn(`bot: sem chave de IA configurada para a loja ${storeSlug}`)
    return
  }

  const draft = getDraft(conv)
  const lower = text.trim().toLowerCase()

  let reply: string

  // Comando global de cancelamento (apenas dentro do fluxo fixo)
  if (conv.state !== 'LLM_FREE' && /^(cancelar|cancela)\b/.test(lower)) {
    await resetToFree(app, conv.id)
    reply = 'Tudo bem, cancelei o pedido. Quando quiser pedir de novo, é só me chamar! 🙂'
  } else {
    switch (conv.state) {
      case 'COLLECTING_ADDRESS': {
        const profile = await loadProfile(app, store.id, phone)
        reply = await handleAddress(app, store, conv, profile, draft, text)
        break
      }
      case 'SELECTING_PAYMENT':
        reply = await handlePayment(app, store, conv, draft, text)
        break
      case 'AWAITING_CONFIRMATION': {
        const profile = await loadProfile(app, store.id, phone)
        reply = await handleConfirmation(app, store, conv, profile, draft, text)
        break
      }
      default: {
        const [menu, profile] = await Promise.all([loadMenu(app, store.id), loadProfile(app, store.id, phone)])
        reply = await handleLlmFree(app, store, conv, profile, menu, draft, text)
      }
    }
  }

  await saveMessage(app, conv.id, 'assistant', reply)
  await sendWhatsApp(store, phone, reply)
}
