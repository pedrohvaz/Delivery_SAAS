import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { assertAreaMinOrder, distanceFee, resolveDelivery } from '../src/lib/order-service'
import { distanceKm } from '../src/lib/geocode'
import { call, closeApp, createStore, type TestStore } from './helpers'

const bairro = (district: string, fee: number, extra: object = {}) => ({ type: 'DISTRICT', district, fee, freeFrom: null, ...extra })
const fixa = (fee: number) => ({ type: 'RADIUS', district: null, fee, freeFrom: null })
const km = (fee: number, baseKm: number, perKmFee: number, radiusKm: number, extra: object = {}) =>
  ({ type: 'DISTANCE', district: null, fee, freeFrom: null, baseKm, perKmFee, radiusKm, ...extra })

describe('regra da taxa de entrega', () => {
  it('por distância: base até X km e R$ por km (ou fração) acima', () => {
    const a = km(5, 3, 2, 10)
    expect(distanceFee(a, 2.5)).toBe(5)
    expect(distanceFee(a, 3)).toBe(5)
    expect(distanceFee(a, 3.2)).toBe(7) // 1 km começado
    expect(distanceFee(a, 6)).toBe(11)
  })

  it('bairro cadastrado vale antes da distância; acima do máximo não entrega', () => {
    const areas = [bairro('Centro', 4), km(5, 3, 2, 8)]
    expect(resolveDelivery({ areas, type: 'DELIVERY', district: 'centro', subtotal: 50, distanceKm: 7 }).fee).toBe(4)
    expect(resolveDelivery({ areas, type: 'DELIVERY', district: 'Vila Nova', subtotal: 50, distanceKm: 4.5 }).fee).toBe(9)
    expect(() => resolveDelivery({ areas, type: 'DELIVERY', district: 'Longe', subtotal: 50, distanceKm: 12 })).toThrow(/entregamos até 8 km/)
  })

  it('sem distância conhecida: usa a taxa fixa; sem taxa fixa, pede o endereço certo', () => {
    expect(resolveDelivery({ areas: [km(5, 3, 2, 8), fixa(10)], type: 'DELIVERY', subtotal: 20, distanceKm: null }).fee).toBe(10)
    expect(() => resolveDelivery({ areas: [km(5, 3, 2, 8)], type: 'DELIVERY', subtotal: 20, distanceKm: null })).toThrow(/mapa/)
  })

  it('grátis a partir de, área desativada e pedido mínimo da área', () => {
    expect(resolveDelivery({ areas: [km(5, 3, 2, 8, { freeFrom: 80 })], type: 'DELIVERY', subtotal: 90, distanceKm: 5 }).fee).toBe(0)
    expect(resolveDelivery({ areas: [bairro('Centro', 4, { isActive: false }), fixa(7)], type: 'DELIVERY', district: 'Centro', subtotal: 10 }).fee).toBe(7)
    const q = resolveDelivery({ areas: [bairro('Centro', 4, { minOrder: 30 })], type: 'DELIVERY', district: 'Centro', subtotal: 20 })
    expect(() => assertAreaMinOrder(q, 20)).toThrow(/Pedido mínimo para Centro/)
    expect(() => assertAreaMinOrder(q, 30)).not.toThrow()
  })

  it('distância em linha reta', () => {
    // Praça da Sé → Av. Paulista/MASP (SP): ~2,7 km
    const d = distanceKm({ lat: -23.5503, lng: -46.6339 }, { lat: -23.5614, lng: -46.6559 })
    expect(d).toBeGreaterThan(2.3)
    expect(d).toBeLessThan(3)
  })
})

describe('áreas de entrega pela API', () => {
  let s: TestStore
  beforeAll(async () => { s = await createStore('areas') })
  afterAll(closeApp)

  it('cadastra vários bairros de uma vez e não repete', async () => {
    const r = await call('POST', '/delivery-areas/bulk', { token: s.token, body: { districts: ['Centro', 'São José', 'sao jose', 'Vila Nova'], fee: 6 } })
    expect(r.status).toBe(201)
    expect(r.data.data.created).toBe(3)
    const dup = await call('POST', '/delivery-areas', { token: s.token, body: { type: 'DISTRICT', district: 'centro', fee: 5 } })
    expect(dup.status).toBe(409)
  })

  it('por distância exige a localização da loja; depois cota pelo simulador', async () => {
    const semLocal = await call('POST', '/delivery-areas', { token: s.token, body: { type: 'DISTANCE', fee: 5, baseKm: 2, perKmFee: 1.5, radiusKm: 10 } })
    expect(semLocal.status).toBe(400)

    const loc = await call('PUT', '/delivery-areas/store-location', { token: s.token, body: { lat: -23.5503, lng: -46.6339 } })
    expect(loc.status).toBe(200)
    const ok = await call('POST', '/delivery-areas', { token: s.token, body: { type: 'DISTANCE', fee: 5, baseKm: 2, perKmFee: 1.5, radiusKm: 10 } })
    expect(ok.status).toBe(201)

    // Bairro cadastrado continua com taxa própria
    const centro = await call('POST', '/delivery-areas/quote', { token: s.token, body: { district: 'Centro', subtotal: 40 } })
    expect(centro.data.data).toMatchObject({ available: true, fee: 6 })

    // Fora dos bairros, com GPS (busca no mapa fica desligada nos testes): ~2,7 km → 5 + 1 × 1,50
    const gps = await call('POST', '/delivery-areas/quote', { token: s.token, body: { district: 'Bela Vista', lat: -23.5614, lng: -46.6559, street: 'Av Paulista', city: 'São Paulo', subtotal: 40 } })
    expect(gps.data.data).toMatchObject({ available: true, fee: 6.5, areaType: 'DISTANCE' })
    expect(gps.data.data.distanceKm).toBeCloseTo(2.7, 0)
  })
})
