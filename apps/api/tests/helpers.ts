import { randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'

let app: FastifyInstance | null = null

export async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = buildApp()
    await app.ready()
  }
  return app
}

export async function closeApp() {
  if (app) await app.close()
  app = null
}

// IP aleatório por requisição: evita que o rate limit de /auth atrapalhe os testes
export const randomIp = () => `10.${rnd(255)}.${rnd(255)}.${rnd(254) + 1}`
const rnd = (n: number) => Math.floor(Math.random() * n)
export const uid = () => randomBytes(4).toString('hex')

type Json = Record<string, unknown> | unknown[]

export async function call(method: string, url: string, opts: { body?: Json; token?: string; headers?: Record<string, string>; ip?: string } = {}) {
  const a = await getApp()
  const res = await a.inject({
    method: method as 'GET',
    url,
    payload: opts.body as Record<string, unknown> | undefined,
    remoteAddress: opts.ip ?? randomIp(),
    headers: { ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}), ...(opts.headers ?? {}) },
  })
  let data: any
  try { data = res.json() } catch { data = res.body }
  return { status: res.statusCode, data, headers: res.headers }
}

export interface TestStore {
  token: string
  refreshToken: string
  storeId: string
  slug: string
  userId: string
  email: string
  password: string
}

export async function createStore(tag = 'loja'): Promise<TestStore> {
  const u = uid()
  const email = `test-${tag}-${u}@example.com`
  const password = 'Senha123!'
  const r = await call('POST', '/auth/register', {
    body: { storeName: `Teste ${tag}`, storeSlug: `test-${tag}-${u}`, name: `Dono ${tag}`, email, password },
  })
  if (r.status !== 201) throw new Error(`register falhou: ${r.status} ${JSON.stringify(r.data)}`)
  const d = r.data.data
  return { token: d.accessToken, refreshToken: d.refreshToken, storeId: d.store.id, slug: d.store.slug, userId: d.user.id, email, password }
}

export async function openStore(store: TestStore) {
  const a = await getApp()
  await a.prisma.store.update({ where: { id: store.storeId }, data: { isOpen: true, acceptOrders: true } })
}

export async function createProduct(store: TestStore, data: { name?: string; price: number; stockControl?: boolean; stockQty?: number }) {
  const cat = await call('POST', '/categories', { token: store.token, body: { name: `Cat ${uid()}` } })
  const p = await call('POST', '/products', {
    token: store.token,
    body: { categoryId: cat.data.data.id, name: data.name ?? 'Produto', price: data.price, stockControl: data.stockControl ?? false, stockQty: data.stockQty },
  })
  if (p.status !== 201) throw new Error(`produto falhou: ${p.status} ${JSON.stringify(p.data)}`)
  return p.data.data as { id: string; name: string; price: number }
}

export async function createAddon(store: TestStore, productId: string, price: number, group: { min?: number; max?: number; required?: boolean } = {}) {
  const g = await call('POST', `/addons/${productId}/groups`, { token: store.token, body: { name: 'Extras', min: group.min ?? 0, max: group.max ?? 3, required: group.required ?? false } })
  const o = await call('POST', `/addons/groups/${g.data.data.id}/options`, { token: store.token, body: { name: 'Bacon', price } })
  return { groupId: g.data.data.id as string, optionId: o.data.data.id as string }
}

export function orderBody(store: TestStore, items: unknown[], over: Record<string, unknown> = {}) {
  return {
    storeSlug: store.slug,
    type: 'PICKUP',
    customerName: 'Cliente Teste',
    customerPhone: `119${Math.floor(10000000 + Math.random() * 89999999)}`,
    paymentMethod: 'CASH',
    items,
    ...over,
  }
}

export const item = (productId: string, price: number, quantity = 1, addons: unknown[] = []) =>
  ({ productId, name: 'Produto', price, quantity, addons })
