// Endereço → coordenadas (latitude/longitude), para cobrar entrega por distância.
// Usa o Nominatim (OpenStreetMap), gratuito. Regras de uso dele: no máximo 1 consulta por
// segundo e um User-Agent identificando o sistema. Por isso: fila de 1 por vez e cache no
// Redis (o mesmo endereço não é consultado de novo por 30 dias).
import { cacheGet, cacheSet } from './cache.js'

export interface GeoPoint { lat: number; lng: number }
export interface AddressLike {
  street?: string | null
  number?: string | null
  district?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
}

const UA = 'ByLink-Delivery/1.0 (+https://bylink.shop)'
const DAY = 24 * 60 * 60

let fila: Promise<unknown> = Promise.resolve()
let ultima = 0

/** Uma consulta por vez, com 1,1 s entre elas. */
function enfileirar<T>(fn: () => Promise<T>): Promise<T> {
  const run = fila.then(async () => {
    const espera = ultima + 1100 - Date.now()
    if (espera > 0) await new Promise((r) => setTimeout(r, espera))
    ultima = Date.now()
    return fn()
  })
  fila = run.catch(() => undefined)
  return run
}

async function nominatim(params: Record<string, string>): Promise<GeoPoint | null> {
  const qs = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'br', 'accept-language': 'pt-BR', ...params })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) return null
  const json = (await res.json()) as { lat: string; lon: string }[]
  const hit = json[0]
  if (!hit) return null
  const p = { lat: Number(hit.lat), lng: Number(hit.lon) }
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) ? p : null
}

const norm = (s?: string | null) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Coordenadas de um endereço brasileiro, ou null se não achar. */
export async function geocodeAddress(a: AddressLike): Promise<GeoPoint | null> {
  if (process.env.NODE_ENV === 'test' || process.env.GEOCODE_DISABLED === 'true') return null
  if (!a.city || !(a.street || a.zipCode)) return null

  const key = `geo:v1:${[a.street, a.number, a.district, a.city, a.state, (a.zipCode ?? '').replace(/\D/g, '')].map(norm).join('|')}`
  const cached = await cacheGet<GeoPoint | { miss: true }>(key)
  if (cached) return 'miss' in cached ? null : cached

  const ruaNum = [a.number, a.street].filter(Boolean).join(' ')
  const tentativas: Record<string, string>[] = [
    // 1) rua + número + cidade (o mais preciso)
    ...(a.street ? [{ street: ruaNum, city: a.city, ...(a.state ? { state: a.state } : {}) }] : []),
    // 2) texto livre com o bairro (ajuda quando a rua tem nome repetido)
    { q: [ruaNum, a.district, a.city, a.state, 'Brasil'].filter(Boolean).join(', ') },
    // 3) só o CEP (centro aproximado da rua/região)
    ...(a.zipCode && a.zipCode.replace(/\D/g, '').length === 8 ? [{ postalcode: a.zipCode.replace(/\D/g, ''), city: a.city }] : []),
  ]

  try {
    for (const t of tentativas) {
      const p = await enfileirar(() => nominatim(t))
      if (p) {
        await cacheSet(key, p, 30 * DAY)
        return p
      }
    }
    await cacheSet(key, { miss: true }, DAY)
  } catch {
    // Sem internet / serviço fora: não grava cache, tenta de novo na próxima
  }
  return null
}

/** Distância em linha reta (km) entre dois pontos. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const isValidPoint = (p: { lat?: number | null; lng?: number | null } | null | undefined): p is GeoPoint =>
  !!p && typeof p.lat === 'number' && typeof p.lng === 'number'
  && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && !(p.lat === 0 && p.lng === 0)
