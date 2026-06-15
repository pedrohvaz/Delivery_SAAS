/**
 * Limites e proteção anti-abuso do bot (configuráveis por env, com defaults sensatos).
 * Rate-limiter e dedupe são em memória (por processo). Para múltiplas instâncias da
 * API, migrar as chaves para Redis no futuro.
 */

function envNum(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// Integridade do pedido
export const MAX_QTD_ITEM = envNum(process.env.BOT_MAX_QTD_ITEM, 50) // por item
export const MAX_ITENS_CARRINHO = envNum(process.env.BOT_MAX_ITENS, 40) // itens distintos
export const MAX_VALOR_PEDIDO = envNum(process.env.BOT_MAX_VALOR_PEDIDO, 1500) // R$

// Entrada / anti-abuso
export const MAX_MSG_CHARS = envNum(process.env.BOT_MAX_MSG_CHARS, 1000)
export const RATE_MAX = envNum(process.env.BOT_RATE_MAX, 20) // msgs por janela
export const RATE_WINDOW_MS = envNum(process.env.BOT_RATE_WINDOW_MS, 5 * 60 * 1000)
export const DEDUPE_MS = envNum(process.env.BOT_DEDUPE_MS, 3000)

// Pedido duplicado
export const DUP_ORDER_MIN = envNum(process.env.BOT_DUP_ORDER_MIN, 5) // minutos

const hits = new Map<string, number[]>()
const lastMsg = new Map<string, { text: string; at: number }>()
const notified = new Map<string, number>()

/** Janela deslizante por chave (storeId:phone). Retorna true se excedeu o limite. */
export function rateLimited(key: string): boolean {
  const now = Date.now()
  const arr = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (arr.length >= RATE_MAX) {
    hits.set(key, arr)
    return true
  }
  arr.push(now)
  hits.set(key, arr)
  return false
}

/** True só na primeira vez dentro da janela — evita repetir o aviso de "aguarde". */
export function shouldNotifyRateLimit(key: string): boolean {
  const now = Date.now()
  if (now - (notified.get(key) ?? 0) < RATE_WINDOW_MS) return false
  notified.set(key, now)
  return true
}

/** True se a mensagem é idêntica à anterior recebida há menos de DEDUPE_MS. */
export function isDuplicateMessage(key: string, text: string): boolean {
  const now = Date.now()
  const prev = lastMsg.get(key)
  lastMsg.set(key, { text, at: now })
  return !!prev && prev.text === text && now - prev.at < DEDUPE_MS
}
