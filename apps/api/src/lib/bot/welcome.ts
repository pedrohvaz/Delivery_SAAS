import type { BotStore } from './types.js'

/** Monta a URL pública do cardápio da loja (domínio próprio ou STORE_URL/slug). */
export function storeMenuUrl(store: Pick<BotStore, 'slug' | 'customDomain'>): string {
  if (store.customDomain) {
    const domain = store.customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return `https://${domain}`
  }
  const base = (process.env.STORE_URL ?? process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3001').replace(/\/$/, '')
  return `${base}/${store.slug}`
}

/** Mensagem de boas-vindas do primeiro contato (nome da loja + link do cardápio). */
export function buildWelcome(store: Pick<BotStore, 'name' | 'slug' | 'customDomain'>): string {
  const url = storeMenuUrl(store)
  return (
    `Olá! 👋 Seja bem-vindo(a) à *${store.name}*!\n\n` +
    `Para agilizar, é só acessar nosso cardápio e fazer o pedido por aqui:\n${url}\n\n` +
    `Ou, se preferir, me diga por aqui mesmo o que você gostaria. 😊`
  )
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/** Lista os horários ativos da loja, um por linha (ex.: "Seg: 18:00–23:00"). */
export function formatSchedule(schedules: BotStore['schedules']): string {
  if (!schedules.length) return 'Consulte nossos horários de funcionamento.'
  return [...schedules]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((s) => `${DAY_NAMES[s.dayOfWeek] ?? '?'}: ${s.openTime}–${s.closeTime}`)
    .join('\n')
}

/** Próxima abertura: "hoje às 18:00", "amanhã às 08:00" ou "Segunda às 08:00". */
export function nextOpening(schedules: BotStore['schedules'], timezone: string): string | null {
  if (!schedules.length) return null
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  })
  const parts = f.formatToParts(new Date())
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00'
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const today = map[wd] ?? 0
  const nowTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`

  // Ainda abre hoje?
  const laterToday = schedules
    .filter((s) => s.dayOfWeek === today && s.openTime > nowTime)
    .sort((a, b) => a.openTime.localeCompare(b.openTime))[0]
  if (laterToday) return `hoje às ${laterToday.openTime}`

  // Próximos dias
  for (let i = 1; i <= 7; i++) {
    const d = (today + i) % 7
    const sc = schedules
      .filter((s) => s.dayOfWeek === d)
      .sort((a, b) => a.openTime.localeCompare(b.openTime))[0]
    if (sc) return `${i === 1 ? 'amanhã' : DAY_FULL[d]} às ${sc.openTime}`
  }
  return null
}

/**
 * Mensagem automática quando a loja está fechada (evita pedido em vão).
 * Se a loja definiu `automationConfig.closedMessage`, usa-a com placeholders:
 *   {horarios}  {proxima_abertura}  {cardapio}/{link}
 * Caso contrário, gera uma mensagem padrão com horários + próxima abertura + link.
 */
export function buildClosedMessage(store: BotStore): string {
  const url = storeMenuUrl(store)
  const horarios = formatSchedule(store.schedules)
  const proxima = nextOpening(store.schedules, store.timezone)

  const custom = store.automationConfig?.closedMessage?.trim()
  if (custom) {
    return custom
      .replace(/\{horarios\}/gi, horarios)
      .replace(/\{proxima_abertura\}/gi, proxima ?? 'em breve')
      .replace(/\{(cardapio|link)\}/gi, url)
  }

  const proximaLinha = proxima ? `📅 Voltamos a abrir *${proxima}*.\n\n` : ''
  return (
    `Olá! 👋 No momento a *${store.name}* está *fechada* 😴\n\n` +
    proximaLinha +
    `🕒 Nossos horários:\n${horarios}\n\n` +
    `Você pode ir vendo o cardápio: ${url}\n` +
    `Assim que abrirmos, é só me chamar que eu faço seu pedido! 🙂`
  )
}
