import Redis from 'ioredis'

let client: Redis | null = null

export function getCache(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (!client) {
    client = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 })
    client.on('error', () => { /* silencia erros de cache — não deve derrubar a API */ })
  }
  return client
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const cache = getCache()
    if (!cache) return null
    const val = await cache.get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  try {
    const cache = getCache()
    if (!cache) return
    await cache.setex(key, ttlSeconds, JSON.stringify(value))
  } catch { /* silencia */ }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    const cache = getCache()
    if (!cache) return
    await cache.del(...keys)
  } catch { /* silencia */ }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const cache = getCache()
    if (!cache) return
    const keys = await cache.keys(pattern)
    if (keys.length > 0) await cache.del(...keys)
  } catch { /* silencia */ }
}

/**
 * Limpa o cache público de uma loja (página, cardápio e lista da vitrine).
 * Chamar sempre que algo visível ao cliente mudar — ex.: loja abriu/fechou —
 * senão o site mostra o estado antigo por até 2 minutos.
 */
export async function invalidateStorePublicCache(
  prisma: { store: { findUnique: (args: { where: { id: string }; select: { slug: true } }) => Promise<{ slug: string } | null> } },
  storeId: string,
): Promise<void> {
  try {
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { slug: true } })
    await cacheDel('stores:list', ...(store ? [`store:${store.slug}`, `menu:${store.slug}`] : []))
  } catch {
    /* cache é best-effort */
  }
}
