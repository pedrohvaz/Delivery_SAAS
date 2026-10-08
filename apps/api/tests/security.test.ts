import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { cacheDel } from '../src/lib/cache'
import { call, closeApp, createProduct, createStore, getApp, item, openStore, orderBody, uid, type TestStore } from './helpers'

let A: TestStore
let product: { id: string }
beforeAll(async () => {
  A = await createStore('seg')
  await openStore(A)
  product = await createProduct(A, { price: 10 })
})
afterAll(closeApp)

describe('#4 dados de cliente por telefone', () => {
  it('não expõe nome nem histórico sem login', async () => {
    const phone = '11912345678'
    await call('POST', '/orders', { body: orderBody(A, [item(product.id, 10)], { customerPhone: phone, customerName: 'Maria Privada' }) })
    const r1 = await call('GET', `/store/${A.slug}/customer?phone=${phone}`)
    const r2 = await call('GET', `/store/${A.slug}/customer-orders?phone=${phone}`)
    expect(JSON.stringify(r1.data)).not.toContain('Maria Privada')
    expect(r2.status).not.toBe(200)
  })
})

describe('#5 vínculo de conta pelo telefone', () => {
  it('pedido logado com telefone de outra pessoa não dá acesso ao histórico dela', async () => {
    const vitima = '11923456789'
    await call('POST', '/orders', { body: orderBody(A, [item(product.id, 10)], { customerPhone: vitima }) })
    const cust = await call('POST', '/customer/register', { body: { name: 'Atacante', email: `atk-${uid()}@example.com`, password: 'Senha123!', phone: `1198${Date.now().toString().slice(-7)}` } })
    const tk = cust.data.data.accessToken
    await call('POST', '/orders', { token: tk, body: orderBody(A, [item(product.id, 10)], { customerPhone: vitima }) })
    const minhas = await call('GET', '/customer/orders', { token: tk })
    expect(minhas.data.data.length).toBe(0)
  })
})

describe('#6 rate limit não é burlado pelo X-Forwarded-For', () => {
  it('trocar o cabeçalho não reinicia o limite', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 12; i++) {
      const r = await call('POST', '/auth/login', {
        ip: '172.20.0.5', // proxy local (cloudflared/caddy)
        headers: { 'x-forwarded-for': `203.0.113.${i}, 198.51.100.7`, 'cf-connecting-ip': '198.51.100.7' },
        body: { email: 'ninguem@example.com', password: 'x12345' },
      })
      statuses.push(r.status)
    }
    expect(statuses).toContain(429)
  })
})

describe('#7 webhook Asaas', () => {
  it('não confirma pagamento sem conferir com o Asaas', async () => {
    const o = await call('POST', '/orders', { body: orderBody(A, [item(product.id, 10)]) })
    const app = await getApp()
    const gid = `pay_${uid()}`
    await app.prisma.payment.create({ data: { orderId: o.data.data.id, method: 'PIX', amount: 10, gatewayId: gid } })
    const r = await call('POST', '/payments/webhook/asaas', { body: { event: 'PAYMENT_CONFIRMED', payment: { id: gid, value: 0.01 } } })
    expect(r.status).toBeLessThan(500)
    const order = await app.prisma.order.findUnique({ where: { id: o.data.data.id } })
    expect(order!.paymentStatus).not.toBe('PAID')
  })

  it('confirma quando o Asaas diz que a cobrança foi paga no valor certo', async () => {
    const app = await getApp()
    await app.prisma.store.update({ where: { id: A.storeId }, data: { asaasApiKey: 'chave_teste', asaasSandbox: true } })
    const o = await call('POST', '/orders', { body: orderBody(A, [item(product.id, 10)], { paymentMethod: 'CASH' }) })
    const gid = `pay_${uid()}`
    await app.prisma.payment.create({ data: { orderId: o.data.data.id, method: 'PIX', amount: 10, gatewayId: gid } })
    const realFetch = globalThis.fetch
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).includes(`/payments/${gid}`)) return new Response(JSON.stringify({ id: gid, status: 'RECEIVED', value: 10 }), { status: 200 })
      return realFetch(url as string, init)
    })
    await call('POST', '/payments/webhook/asaas', { body: { event: 'PAYMENT_RECEIVED', payment: { id: gid } } })
    spy.mockRestore()
    await app.prisma.store.update({ where: { id: A.storeId }, data: { asaasApiKey: null } })
    const order = await app.prisma.order.findUnique({ where: { id: o.data.data.id } })
    expect(order!.paymentStatus).toBe('PAID')
  })
})

describe('#8 webhook Stripe', () => {
  it('aceita evento com assinatura válida', async () => {
    const stripe = new Stripe('sk_test_dummy_for_tests')
    const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'ping.test', data: { object: {} } }, null, 2)
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test_secret_for_tests' })
    const app = await getApp()
    const r = await app.inject({ method: 'POST', url: '/stripe/webhook', payload, headers: { 'content-type': 'application/json', 'stripe-signature': header } })
    expect(r.statusCode).toBe(200)
  })

  it('recusa assinatura inválida', async () => {
    const app = await getApp()
    const r = await app.inject({ method: 'POST', url: '/stripe/webhook', payload: '{"id":"x"}', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=abc' } })
    expect(r.statusCode).toBe(400)
  })
})

describe('#11 e #17 tokens', () => {
  it('usuário desativado perde o acesso imediatamente', async () => {
    const s = await createStore('desativado')
    const app = await getApp()
    await app.prisma.user.update({ where: { id: s.userId }, data: { isActive: false } })
    const r = await call('GET', '/orders', { token: s.token })
    expect(r.status).toBe(401)
  })

  it('access token não serve como refresh token', async () => {
    const r = await call('POST', '/auth/refresh', { body: { refreshToken: A.token } })
    expect(r.status).toBe(401)
    const ok = await call('POST', '/auth/refresh', { body: { refreshToken: A.refreshToken } })
    expect(ok.status).toBe(200)
  })
})

describe('#14 loja suspensa', () => {
  it('some da vitrine, da página pública e não pode ser reaberta pelo dono', async () => {
    const s = await createStore('suspensa')
    const app = await getApp()
    await app.prisma.store.update({ where: { id: s.storeId }, data: { status: 'SUSPENDED', isOpen: false, acceptOrders: false } })
    await cacheDel('stores:list', `store:${s.slug}`)
    const list = await call('GET', '/store')
    expect(list.data.data.some((x: { slug: string }) => x.slug === s.slug)).toBe(false)
    expect((await call('GET', `/store/${s.slug}`)).status).toBe(404)
    expect((await call('PATCH', '/schedules/toggle', { token: s.token, body: {} })).status).toBe(403)
  })
})

describe('#19 paginação de pedidos', () => {
  it('respeita o limit', async () => {
    for (let i = 0; i < 3; i++) await call('POST', '/orders', { body: orderBody(A, [item(product.id, 10)]) })
    const r = await call('GET', '/orders?limit=2', { token: A.token })
    expect(r.data.data.length).toBe(2)
  })
})
