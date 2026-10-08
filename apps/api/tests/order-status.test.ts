import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { call, closeApp, createProduct, createStore, getApp, item, openStore, orderBody, type TestStore } from './helpers'

let A: TestStore
beforeAll(async () => {
  A = await createStore('status')
  await openStore(A)
})
afterAll(closeApp)

const stock = async (id: string) => (await (await getApp()).prisma.product.findUnique({ where: { id } }))!.stockQty
const setStatus = (id: string, status: string) => call('PATCH', `/orders/${id}/status`, { token: A.token, body: { status } })

describe('#9 estoque e transições de status', () => {
  it('duplo clique em confirmar baixa o estoque só uma vez', async () => {
    const p = await createProduct(A, { price: 10, stockControl: true, stockQty: 6 })
    const o = await call('POST', '/orders', { body: orderBody(A, [item(p.id, 10)]) })
    const rs = await Promise.all([setStatus(o.data.data.id, 'CONFIRMED'), setStatus(o.data.data.id, 'CONFIRMED')])
    expect(rs.filter((r) => r.status === 200).length).toBe(1)
    expect(await stock(p.id)).toBe(5)
  })

  it('não permite voltar de CANCELLED e não infla o estoque', async () => {
    const p = await createProduct(A, { price: 10, stockControl: true, stockQty: 5 })
    const o = await call('POST', '/orders', { body: orderBody(A, [item(p.id, 10)]) })
    const id = o.data.data.id
    expect((await setStatus(id, 'CONFIRMED')).status).toBe(200)
    expect(await stock(p.id)).toBe(4)
    expect((await setStatus(id, 'CANCELLED')).status).toBe(200)
    expect(await stock(p.id)).toBe(5)
    expect((await setStatus(id, 'CONFIRMED')).status).toBe(409)
    expect((await setStatus(id, 'CANCELLED')).status).toBe(409)
    expect(await stock(p.id)).toBe(5)
  })

  it('não permite andar para trás', async () => {
    const p = await createProduct(A, { price: 10 })
    const o = await call('POST', '/orders', { body: orderBody(A, [item(p.id, 10)]) })
    const id = o.data.data.id
    expect((await setStatus(id, 'IN_PRODUCTION')).status).toBe(200)
    expect((await setStatus(id, 'CONFIRMED')).status).toBe(409)
    expect((await setStatus(id, 'DELIVERED')).status).toBe(200)
    expect((await setStatus(id, 'CANCELLED')).status).toBe(409)
  })

  it('pular CONFIRMED também baixa o estoque', async () => {
    const p = await createProduct(A, { price: 10, stockControl: true, stockQty: 3 })
    const o = await call('POST', '/orders', { body: orderBody(A, [item(p.id, 10, 2)]) })
    expect((await setStatus(o.data.data.id, 'IN_PRODUCTION')).status).toBe(200)
    expect(await stock(p.id)).toBe(1)
  })

  it('não vende acima do estoque: o segundo pedido não pode ser confirmado', async () => {
    const p = await createProduct(A, { price: 10, stockControl: true, stockQty: 2 })
    const o1 = await call('POST', '/orders', { body: orderBody(A, [item(p.id, 10, 2)]) })
    const o2 = await call('POST', '/orders', { body: orderBody(A, [item(p.id, 10, 2)]) })
    expect((await setStatus(o1.data.data.id, 'CONFIRMED')).status).toBe(200)
    expect((await setStatus(o2.data.data.id, 'CONFIRMED')).status).toBe(409)
    expect(await stock(p.id)).toBe(0)
  })
})

describe('#10 cupom devolvido uma única vez', () => {
  it('cancelar várias vezes não deixa usedCount negativo', async () => {
    const p = await createProduct(A, { price: 10 })
    await call('POST', '/coupons', { token: A.token, body: { code: 'VOLTA1', type: 'FIXED_DISCOUNT', value: 1 } })
    const o = await call('POST', '/orders', { body: orderBody(A, [item(p.id, 10)], { couponCode: 'VOLTA1' }) })
    for (const st of ['CANCELLED', 'CANCELLED', 'CANCELLED']) await setStatus(o.data.data.id, st)
    const c = await (await getApp()).prisma.coupon.findFirst({ where: { storeId: A.storeId, code: 'VOLTA1' } })
    expect(c!.usedCount).toBe(0)
  })
})
