import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { call, closeApp, createProduct, createStore, getApp, item, openStore, orderBody, uid, type TestStore } from './helpers'

// Isolamento entre lojas: com o próprio login, o dono da loja A não pode ler,
// alterar nem apagar nada da loja B (passando o id do registro dela na URL).
let A: TestStore
let B: TestStore
const ids: Record<string, string> = {}

const created = (r: { status: number; data: any }, what: string) => {
  if (r.status >= 300) throw new Error(`criar ${what} na loja B falhou: ${r.status} ${JSON.stringify(r.data)}`)
  return r.data.data.id as string
}

beforeAll(async () => {
  A = await createStore('iso-a')
  B = await createStore('iso-b')
  await openStore(B)
  const t = B.token
  const prod = await createProduct(B, { price: 20, name: 'Produto da B' })
  ids.product = prod.id
  ids.category = (await (await getApp()).prisma.product.findUniqueOrThrow({ where: { id: prod.id } })).categoryId
  ids.addonGroup = created(await call('POST', `/addons/${prod.id}/groups`, { token: t, body: { name: 'Extras B', min: 0, max: 2, required: false } }), 'grupo')
  ids.addonOption = created(await call('POST', `/addons/groups/${ids.addonGroup}/options`, { token: t, body: { name: 'Opção B', price: 2 } }), 'opção')
  ids.coupon = created(await call('POST', '/coupons', { token: t, body: { code: `B${uid()}`.toUpperCase(), type: 'PERCENT_DISCOUNT', value: 10 } }), 'cupom')
  ids.area = created(await call('POST', '/delivery-areas', { token: t, body: { type: 'DISTRICT', district: `Bairro ${uid()}`, fee: 5 } }), 'área')
  ids.table = created(await call('POST', '/tables', { token: t, body: { number: 7, label: 'Mesa B', capacity: 4 } }), 'mesa')
  ids.deliveryman = created(await call('POST', '/deliverymen', { token: t, body: { name: 'Entregador B', phone: '31999998888' } }), 'entregador')
  ids.raffle = created(await call('POST', '/raffles', { token: t, body: { title: 'Sorteio B', prize: 'Pizza' } }), 'sorteio')
  ids.notice = created(await call('POST', '/notices', { token: t, body: { message: 'Aviso B' } }), 'aviso')
  const order = await call('POST', '/orders', { body: orderBody(B, [item(prod.id, 20)], { customerName: 'Cliente da B' }) })
  ids.order = created(order, 'pedido')
  const app = await getApp()
  ids.customer = (await app.prisma.order.findUniqueOrThrow({ where: { id: ids.order } })).customerId!
})
afterAll(closeApp)

const blocked = (status: number) => status === 401 || status === 403 || status === 404

describe('loja A não acessa dados da loja B', () => {
  const cases: [string, string, () => string, Record<string, unknown>?][] = [
    ['GET', 'produto', () => `/products/${ids.product}`],
    ['PATCH', 'produto', () => `/products/${ids.product}`, { price: 1 }],
    ['PATCH', 'estoque do produto', () => `/products/${ids.product}/stock`, { stockQty: 0 }],
    ['DELETE', 'produto', () => `/products/${ids.product}`],
    ['GET', 'adicionais do produto', () => `/addons/${ids.product}/groups`],
    ['POST', 'grupo de adicional no produto', () => `/addons/${ids.product}/groups`, { name: 'Invasor', min: 0, max: 1, required: false }],
    ['PATCH', 'grupo de adicional', () => `/addons/groups/${ids.addonGroup}`, { name: 'Invadido' }],
    ['POST', 'opção no grupo', () => `/addons/groups/${ids.addonGroup}/options`, { name: 'Invasor', price: 0 }],
    ['PATCH', 'opção de adicional', () => `/addons/options/${ids.addonOption}`, { price: 0 }],
    ['DELETE', 'opção de adicional', () => `/addons/options/${ids.addonOption}`],
    ['DELETE', 'grupo de adicional', () => `/addons/groups/${ids.addonGroup}`],
    ['PATCH', 'categoria', () => `/categories/${ids.category}`, { name: 'Invadida' }],
    ['DELETE', 'categoria', () => `/categories/${ids.category}`],
    ['PATCH', 'cupom', () => `/coupons/${ids.coupon}`, { value: 99 }],
    ['DELETE', 'cupom', () => `/coupons/${ids.coupon}`],
    ['PATCH', 'área de entrega', () => `/delivery-areas/${ids.area}`, { fee: 0 }],
    ['DELETE', 'área de entrega', () => `/delivery-areas/${ids.area}`],
    ['PATCH', 'mesa', () => `/tables/${ids.table}`, { label: 'Invadida' }],
    ['DELETE', 'mesa', () => `/tables/${ids.table}`],
    ['PATCH', 'entregador', () => `/deliverymen/${ids.deliveryman}`, { name: 'Invadido' }],
    ['DELETE', 'entregador', () => `/deliverymen/${ids.deliveryman}`],
    ['PATCH', 'sorteio', () => `/raffles/${ids.raffle}`, { title: 'Invadido' }],
    ['GET', 'participantes do sorteio', () => `/raffles/${ids.raffle}/entries`],
    ['DELETE', 'sorteio', () => `/raffles/${ids.raffle}`],
    ['DELETE', 'aviso', () => `/notices/${ids.notice}`],
    ['GET', 'cliente', () => `/customers/${ids.customer}`],
    ['PATCH', 'cliente', () => `/customers/${ids.customer}`, { name: 'Invadido' }],
    ['DELETE', 'cliente', () => `/customers/${ids.customer}`],
    ['PATCH', 'status do pedido', () => `/orders/${ids.order}/status`, { status: 'CANCELLED' }],
    ['PATCH', 'pagamento do pedido', () => `/orders/${ids.order}/payment-status`, { paymentStatus: 'PAID' }],
    ['PATCH', 'entregador do pedido', () => `/orders/${ids.order}/deliveryman`, { deliverymanId: null }],
  ]

  for (const [method, what, url, body] of cases) {
    it(`${method} ${what}`, async () => {
      const r = await call(method, url(), { token: A.token, body })
      expect(blocked(r.status), `${method} ${url()} respondeu ${r.status}: ${JSON.stringify(r.data).slice(0, 160)}`).toBe(true)
    })
  }

  it('listagens da loja A não trazem nada da loja B', async () => {
    const lists = ['/orders', '/products', '/customers', '/coupons', '/delivery-areas', '/tables', '/deliverymen', '/raffles']
    for (const path of lists) {
      const r = await call('GET', path, { token: A.token })
      expect(JSON.stringify(r.data)).not.toMatch(/Produto da B|Cliente da B|Mesa B|Entregador B|Sorteio B/)
    }
  })

  it('nada da loja B foi alterado nem apagado', async () => {
    const app = await getApp()
    const p = await app.prisma.product.findUnique({ where: { id: ids.product } })
    const o = await app.prisma.order.findUnique({ where: { id: ids.order } })
    expect(p && Number(p.price)).toBe(20)
    expect(o?.status).toBe('PENDING')
    expect(o?.paymentStatus).not.toBe('PAID')
    expect(await app.prisma.coupon.findUnique({ where: { id: ids.coupon } })).not.toBeNull()
    expect(await app.prisma.addonOption.findUnique({ where: { id: ids.addonOption } })).not.toBeNull()
    expect(await app.prisma.customer.findUnique({ where: { id: ids.customer } })).not.toBeNull()
    expect(await app.prisma.internalNotice.findUnique({ where: { id: ids.notice } })).not.toBeNull()
  })
})
