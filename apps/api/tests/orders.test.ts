import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { call, closeApp, createAddon, createProduct, createStore, getApp, item, openStore, orderBody, type TestStore } from './helpers'

let A: TestStore
let B: TestStore
let burger: { id: string }
let refri: { id: string }
let bacon: { groupId: string; optionId: string }

beforeAll(async () => {
  A = await createStore('pedidos-a')
  B = await createStore('pedidos-b')
  await openStore(A)
  burger = await createProduct(A, { name: 'X-Burger', price: 50 })
  refri = await createProduct(A, { name: 'Refri', price: 8 })
  bacon = await createAddon(A, burger.id, 5)
})
afterAll(closeApp)

describe('#1 preço calculado no servidor', () => {
  it('ignora o preço enviado pelo cliente e usa o do cardápio', async () => {
    const addon = { groupId: bacon.groupId, groupName: 'x', optionId: bacon.optionId, optionName: 'x', price: 0 }
    const r = await call('POST', '/orders', { body: orderBody(A, [item(burger.id, 0.01, 2, [addon])]) })
    expect(r.status).toBe(201)
    expect(r.data.data.total).toBe(110) // (50 + 5) x 2
  })

  it('grava nome e preço reais nos itens do pedido', async () => {
    const r = await call('POST', '/orders', { body: orderBody(A, [{ ...item(refri.id, 1), name: 'Nome inventado' }]) })
    const app = await getApp()
    const items = await app.prisma.orderItem.findMany({ where: { orderId: r.data.data.id } })
    expect(items[0]!.name).toBe('Refri')
    expect(Number(items[0]!.price)).toBe(8)
  })
})

describe('#2 produto e adicionais precisam ser da loja', () => {
  it('recusa produto de outra loja', async () => {
    const outro = await createProduct(B, { name: 'Da loja B', price: 99 })
    const r = await call('POST', '/orders', { body: orderBody(A, [item(outro.id, 1)]) })
    expect(r.status).toBe(422)
  })

  it('recusa adicional inexistente ou de outro produto', async () => {
    const fake = { groupId: 'x', groupName: 'x', optionId: 'nao-existe', optionName: 'Brinde', price: 0 }
    const r1 = await call('POST', '/orders', { body: orderBody(A, [item(refri.id, 8, 1, [fake])]) })
    expect(r1.status).toBe(422)
    const doBurger = { groupId: bacon.groupId, groupName: 'x', optionId: bacon.optionId, optionName: 'x', price: 5 }
    const r2 = await call('POST', '/orders', { body: orderBody(A, [item(refri.id, 8, 1, [doBurger])]) })
    expect(r2.status).toBe(422)
  })

  it('respeita o máximo de opções do grupo', async () => {
    const p = await createProduct(A, { name: 'Açaí', price: 20 })
    const g = await createAddon(A, p.id, 2, { max: 1 })
    const app = await getApp()
    const extra = await app.prisma.addonOption.create({ data: { addonGroupId: g.groupId, name: 'Granola', price: 1 } })
    const sel = (optionId: string) => ({ groupId: g.groupId, groupName: 'x', optionId, optionName: 'x', price: 0 })
    const r = await call('POST', '/orders', { body: orderBody(A, [item(p.id, 20, 1, [sel(g.optionId), sel(extra.id)])]) })
    expect(r.status).toBe(422)
  })
})

describe('#3 pedidos simultâneos', () => {
  it('10 pedidos ao mesmo tempo são todos criados com números distintos', async () => {
    const rs = await Promise.all(Array.from({ length: 10 }, () => call('POST', '/orders', { body: orderBody(A, [item(refri.id, 8)]) })))
    expect(rs.map((r) => r.status)).toEqual(Array(10).fill(201))
    const nums = rs.map((r) => r.data.data.orderNumber)
    expect(new Set(nums).size).toBe(10)
  })

  it('cupom de uso único não é aplicado duas vezes em paralelo', async () => {
    await call('POST', '/coupons', { token: A.token, body: { code: 'UNICOPAR', type: 'FIXED_DISCOUNT', value: 5, maxUses: 1 } })
    const rs = await Promise.all(Array.from({ length: 5 }, () =>
      call('POST', '/orders', { body: orderBody(A, [item(refri.id, 8)], { couponCode: 'UNICOPAR' }) })))
    expect(rs.every((r) => r.status === 201)).toBe(true)
    expect(rs.filter((r) => r.data.data.total === 3).length).toBe(1)
    const app = await getApp()
    const c = await app.prisma.coupon.findFirst({ where: { storeId: A.storeId, code: 'UNICOPAR' } })
    expect(c!.usedCount).toBe(1)
  })
})

describe('#13 validação dos dados do pedido', () => {
  const ok = () => [item(refri.id, 8)]
  it.each([
    ['quantidade absurda', () => ({ items: [item(refri.id, 8, 1_000_000)] })],
    ['nome gigante', () => ({ customerName: 'A'.repeat(5000) })],
    ['observação gigante', () => ({ notes: 'A'.repeat(5000) })],
    ['forma de pagamento inexistente', () => ({ paymentMethod: 'BITCOIN' })],
    ['agendamento no passado', () => ({ scheduledTo: '2020-01-01T10:00:00.000Z' })],
    ['troco menor que o total', () => ({ changeFor: 1 })],
  ])('recusa %s', async (_nome, over) => {
    const r = await call('POST', '/orders', { body: orderBody(A, ok(), over()) })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(r.status).toBeLessThan(500)
  })

  it('aceita forma de pagamento desativada? não', async () => {
    const app = await getApp()
    await app.prisma.paymentMethod.updateMany({ where: { storeId: A.storeId, type: 'DEBIT_CARD' }, data: { isActive: false } })
    const r = await call('POST', '/orders', { body: orderBody(A, ok(), { paymentMethod: 'DEBIT_CARD' }) })
    expect(r.status).toBe(422)
  })
})

describe('#12 taxa de entrega sem áreas configuradas', () => {
  it('não cobra taxa inventada quando a loja não configurou áreas', async () => {
    const r = await call('POST', '/orders', {
      body: orderBody(A, [item(refri.id, 8)], {
        type: 'DELIVERY',
        address: { street: 'Rua A', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01000000' },
      }),
    })
    expect(r.status).toBe(201)
    expect(r.data.data.total).toBe(8)
  })
})
