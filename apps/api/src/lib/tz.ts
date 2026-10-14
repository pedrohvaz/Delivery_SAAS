// Datas no fuso da loja. O servidor roda em UTC: sem isso, "hoje" começava às 21h do dia
// anterior (horário de Brasília) e as vendas depois das 21h caíam no dia seguinte.

const DAY_MS = 24 * 60 * 60 * 1000

/** Diferença (ms) entre o relógio local do fuso e o UTC naquele instante. */
function offsetMs(tz: string, at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(at).map((x) => [x.type, x.value]),
  )
  return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!) - Math.floor(at.getTime() / 1000) * 1000
}

/** Instante (UTC) da meia-noite de `day` (AAAA-MM-DD) no fuso `tz`. */
export function startOfLocalDay(day: string, tz: string): Date {
  const guess = new Date(`${day}T00:00:00Z`)
  return new Date(guess.getTime() - offsetMs(tz, guess))
}

/** Último instante de `day` no fuso `tz`. */
export function endOfLocalDay(day: string, tz: string): Date {
  return new Date(startOfLocalDay(addDays(day, 1), tz).getTime() - 1)
}

/** Dia (AAAA-MM-DD) de um instante, no fuso `tz`. */
export function localDayKey(at: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}

/** Soma dias a uma data AAAA-MM-DD (aritmética de calendário, sem fuso). */
export function addDays(day: string, n: number): string {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10)
}

/** Quantidade de dias entre duas datas AAAA-MM-DD, contando as duas pontas. */
export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY_MS) + 1
}

export const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
