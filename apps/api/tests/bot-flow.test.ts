import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handleAddress } from '../src/lib/bot/fixed-flow/address'
import { syncCustomerName } from '../src/lib/bot/crm'
import { buildSummary } from '../src/lib/bot/fixed-flow/confirmation'
import type { BotStore, OrderDraft } from '../src/lib/bot/types'
import { closeApp, createStore, getApp, type TestStore } from './helpers'

let S: TestStore
let store: BotStore
const newConv = async () => (await (await getApp()).prisma.conversation.create({
  data: { storeId: S.storeId, customerPhone: `55319${Date.now().toString().slice(-8)}`, status: 'ACTIVE', state: 'COLLECTING_ADDRESS', stateUpdatedAt: new Date() },
}))

beforeAll(async () => {
  S = await createStore('botflow')
  store = {
    id: S.storeId, slug: S.slug, name: 'Bar Teste', description: null, customDomain: null,
    estimatedTime: 45, minOrderValue: 0, timezone: 'America/Sao_Paulo', isOpen: true, acceptOrders: true,
    evolutionApiUrl: null, evolutionApiKey: null, evolutionInstance: null, city: 'Belo Horizonte', state: 'MG',
    schedules: [], paymentMethods: [{ id: 'pix', type: 'PIX', label: 'Pix' }],
    deliveryAreas: [
      { type: 'DISTRICT', fee: 5, freeFrom: null, district: 'Centro', name: null },
      { type: 'DISTRICT', fee: 7, freeFrom: null, district: 'Dom Oscar', name: null },
    ],
    automationConfig: null,
  }
})
afterAll(closeApp)

const draft = (): OrderDraft => ({ type: 'DELIVERY', items: [{ productId: 'x', name: 'Beef 1', price: 30, quantity: 1, addons: [], notes: 'sem bacon' }] })

describe('coleta de endereço pelo bot', () => {
  it('endereço completo sem vírgulas vai direto para o pagamento', async () => {
    const conv = await newConv(); const d = draft()
    const reply = await handleAddress(await getApp(), store, conv, null, d, 'avenida são joao del rei 143 dom oscar')
    expect(reply).toContain('Como você prefere pagar')
    expect(d.address).toMatchObject({ street: 'avenida são joao del rei', number: '143', district: 'Dom Oscar', city: 'Belo Horizonte', state: 'MG' })
    expect(d.deliveryFee).toBe(7)
  })

  it('sem bairro: pergunta só o bairro com a lista; "1" escolhe e segue', async () => {
    const conv = await newConv(); const d = draft()
    const r1 = await handleAddress(await getApp(), store, conv, null, d, 'Av Brasil 500')
    expect(r1).toContain('Qual o *bairro*')
    expect(r1).toContain('1. Centro — entrega R$ 5,00')
    const r2 = await handleAddress(await getApp(), store, conv, null, d, '1')
    expect(r2).toContain('Como você prefere pagar')
    expect(d.address).toMatchObject({ street: 'Av Brasil', number: '500', district: 'Centro' })
  })

  it('sem número: pergunta só o número', async () => {
    const conv = await newConv(); const d = draft()
    const r1 = await handleAddress(await getApp(), store, conv, null, d, 'Rua das Acácias centro')
    expect(r1).toContain('Qual o *número*')
    const r2 = await handleAddress(await getApp(), store, conv, null, d, '45')
    expect(r2).toContain('Como você prefere pagar')
    expect(d.address).toMatchObject({ street: 'Rua das Acácias', number: '45', district: 'Centro' })
  })

  it('bairro não atendido: mantém rua/número e pede só o bairro', async () => {
    const conv = await newConv(); const d = draft()
    const r1 = await handleAddress(await getApp(), store, conv, null, d, 'Rua A 10 Jardim Europa')
    expect(r1).toContain('Não entregamos nesse bairro')
    const r2 = await handleAddress(await getApp(), store, conv, null, d, 'centro')
    expect(r2).toContain('Como você prefere pagar')
    expect(d.address).toMatchObject({ street: 'Rua A', number: '10', district: 'Centro' })
  })
})

describe('resumo do pedido mostra as observações', () => {
  it('"sem bacon" aparece no resumo de confirmação', async () => {
    const summary = buildSummary(store, draft())
    expect(summary).toContain('Beef 1')
    expect(summary).toContain('sem bacon')
  })
})

describe('nome do WhatsApp na aba Clientes', () => {
  it('cria o cliente com o nome do perfil e troca o genérico "Cliente"', async () => {
    const app = await getApp()
    const conv = await newConv()
    const phone = conv.customerPhone
    expect(await syncCustomerName(app, S.storeId, phone, conv.id, 'Rafael Lisboa')).toBe('Rafael Lisboa')
    expect((await app.prisma.customer.findFirst({ where: { storeId: S.storeId, phone } }))!.name).toBe('Rafael Lisboa')

    const phone2 = phone + '9'
    await app.prisma.customer.create({ data: { storeId: S.storeId, phone: phone2, name: 'Cliente' } })
    await syncCustomerName(app, S.storeId, phone2, conv.id, 'Maria Souza')
    expect((await app.prisma.customer.findFirst({ where: { storeId: S.storeId, phone: phone2 } }))!.name).toBe('Maria Souza')
  })

  it('não sobrescreve um nome que o lojista já cadastrou', async () => {
    const app = await getApp()
    const conv = await newConv()
    const phone = conv.customerPhone + '7'
    await app.prisma.customer.create({ data: { storeId: S.storeId, phone, name: 'Seu Zé da Padaria' } })
    await syncCustomerName(app, S.storeId, phone, conv.id, 'Zé')
    expect((await app.prisma.customer.findFirst({ where: { storeId: S.storeId, phone } }))!.name).toBe('Seu Zé da Padaria')
  })
})
