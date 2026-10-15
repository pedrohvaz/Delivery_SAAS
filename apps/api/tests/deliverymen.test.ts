import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { commissionFor } from '../src/routes/deliverymen'
import { call, closeApp, createProduct, createStore, item, openStore, orderBody, type TestStore } from './helpers'

describe('pagamento do entregador', () => {
  it('valor fixo por entrega ou % da taxa', () => {
    expect(commissionFor({ commission: 6, commissionType: 'FIXED' }, 8)).toBe(6)
    expect(commissionFor({ commission: 100, commissionType: 'PERCENT' }, 7.5)).toBe(7.5)
    expect(commissionFor({ commission: 50, commissionType: 'PERCENT' }, 5)).toBe(2.5)
    expect(commissionFor({ commission: 0, commissionType: 'PERCENT' }, 5)).toBe(0)
  })
})

describe('entregadores pela API', () => {
  let s: TestStore
  beforeAll(async () => {
    s = await createStore('entreg')
    await openStore(s)
  })
  afterAll(closeApp)

  it('cadastra, soma entregas do dia e não deixa apagar quem tem histórico', async () => {
    const dm = await call('POST', '/deliverymen', { token: s.token, body: { name: 'João Moto', phone: '31988887777', commissionType: 'FIXED', commission: 6 } })
    expect(dm.status).toBe(201)
    const dmId = dm.data.data.id

    const dup = await call('POST', '/deliverymen', { token: s.token, body: { name: 'Outro', phone: '(31) 98888-7777' } })
    expect(dup.status).toBe(409)
    const pct = await call('POST', '/deliverymen', { token: s.token, body: { name: 'Errado', commissionType: 'PERCENT', commission: 150 } })
    expect(pct.status).toBe(400)

    // Pedido de entrega atribuído e entregue
    const p = await createProduct(s, { price: 30 })
    const o = await call('POST', '/orders', {
      body: orderBody(s, [item(p.id, 30)], { address: { street: 'Rua A', number: '1', district: 'Centro', city: 'BH', state: 'MG', zipCode: '30000000' } }),
    })
    expect(o.status).toBe(201)
    const orderId = o.data.data.id
    expect((await call('PATCH', `/orders/${orderId}/deliveryman`, { token: s.token, body: { deliverymanId: dmId } })).status).toBe(200)
    for (const st of ['CONFIRMED', 'OUT_FOR_DELIVERY']) {
      expect((await call('PATCH', `/orders/${orderId}/status`, { token: s.token, body: { status: st } })).status).toBe(200)
    }
    const rota = await call('GET', '/deliverymen/report', { token: s.token })
    expect(rota.data.meta.totals.inRoute).toBe(1)

    expect((await call('PATCH', `/orders/${orderId}/status`, { token: s.token, body: { status: 'DELIVERED' } })).status).toBe(200)
    const rep = await call('GET', '/deliverymen/report', { token: s.token })
    const linha = rep.data.data.find((r: any) => r.deliverymanId === dmId)
    expect(linha).toMatchObject({ deliveries: 1, toPay: 6, inRoute: 0 })

    const lista = await call('GET', `/deliverymen/${dmId}/deliveries`, { token: s.token })
    expect(lista.data.data[0]).toMatchObject({ district: 'Centro', toPay: 6 })

    const del = await call('DELETE', `/deliverymen/${dmId}`, { token: s.token })
    expect(del.status).toBe(409)
  })
})
