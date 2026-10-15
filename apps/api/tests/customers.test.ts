import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { call, closeApp, createStore, uid, type TestStore } from './helpers'

const ADDR = { street: 'Rua A', number: '10', district: 'Centro', city: 'Leopoldina', state: 'MG' }

describe('clientes', () => {
  let a: TestStore
  let b: TestStore
  beforeAll(async () => {
    a = await createStore('cli-a')
    b = await createStore('cli-b')
  })
  afterAll(closeApp)

  async function novo(store: TestStore, name: string, phone?: string) {
    const r = await call('POST', '/customers', { token: store.token, body: { name, ...(phone ? { phone } : {}) } })
    expect(r.status).toBe(201)
    return r.data.data.id as string
  }

  it('não deixa uma loja mexer no endereço de cliente de outra loja', async () => {
    const vitima = await novo(b, 'Cliente da B', `319${uid().replace(/\D/g, '').padEnd(8, '1').slice(0, 8)}`)
    const addr = await call('POST', `/customers/${vitima}/addresses`, { token: b.token, body: ADDR })
    expect(addr.status).toBe(201)
    const addrId = addr.data.data.id

    const meu = await novo(a, 'Cliente da A')
    const edit = await call('PATCH', `/customers/${meu}/addresses/${addrId}`, { token: a.token, body: { street: 'Invadido' } })
    expect(edit.status).toBe(404)
    const del = await call('DELETE', `/customers/${meu}/addresses/${addrId}`, { token: a.token })
    expect(del.status).toBe(404)

    const ok = await call('GET', `/customers/${vitima}`, { token: b.token })
    expect(ok.data.data.addresses[0].street).toBe('Rua A')
  })

  it('edição apaga campos e avisa telefone repetido', async () => {
    const tel = `319${Date.now().toString().slice(-8)}`
    const c1 = await novo(a, 'Maria', tel)
    const c2 = await novo(a, 'João')
    const dup = await call('PATCH', `/customers/${c2}`, { token: a.token, body: { phone: tel } })
    expect(dup.status).toBe(409)

    const limpa = await call('PATCH', `/customers/${c1}`, { token: a.token, body: { phone: null, notes: null } })
    expect(limpa.status).toBe(200)
    expect(limpa.data.data.phone).toBeNull()
  })

  it('lista com segmentos, contagens e busca por telefone com máscara', async () => {
    const tel = `319${Date.now().toString().slice(-8)}`
    await novo(a, 'Busca Telefone', tel)
    const masked = `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`
    const r = await call('GET', `/customers?search=${encodeURIComponent(masked)}`, { token: a.token })
    expect(r.status).toBe(200)
    expect(r.data.data.map((c: any) => c.name)).toContain('Busca Telefone')

    const never = await call('GET', '/customers?segment=never&sort=name', { token: a.token })
    expect(never.data.meta.counts.all).toBeGreaterThanOrEqual(3)
    expect(never.data.data.every((c: any) => c.ordersCount === 0)).toBe(true)
  })
})
