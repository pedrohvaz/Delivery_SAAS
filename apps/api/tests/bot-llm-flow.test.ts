import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// A IA é simulada: cada teste define o que o "modelo" devolve.
const aiMock = vi.hoisted(() => ({ impl: async (): Promise<string> => '' }))
vi.mock('../src/lib/ai-attendant', async (orig) => ({
  ...(await orig<typeof import('../src/lib/ai-attendant')>()),
  callAI: () => aiMock.impl(),
}))

import { handleLlmFree } from '../src/lib/bot/llm-flow'
import type { BotStore, OrderDraft } from '../src/lib/bot/types'
import { closeApp, createStore, getApp, type TestStore } from './helpers'

let S: TestStore
let convId: string
let store: BotStore
beforeAll(async () => {
  S = await createStore('bot')
  const app = await getApp()
  const conv = await app.prisma.conversation.create({
    data: { storeId: S.storeId, customerPhone: '5531999990000', status: 'ACTIVE', state: 'LLM_FREE', stateUpdatedAt: new Date() },
  })
  convId = conv.id
  store = {
    id: S.storeId, slug: S.slug, name: 'Bar Teste', description: null, customDomain: null,
    estimatedTime: 45, minOrderValue: 0, timezone: 'America/Sao_Paulo', isOpen: true, acceptOrders: true,
    evolutionApiUrl: null, evolutionApiKey: null, evolutionInstance: null,
    schedules: [], paymentMethods: [], deliveryAreas: [],
    automationConfig: { isEnabled: true, aiProvider: 'openrouter', aiApiKey: 'x', aiModel: 'openai/gpt-4o-mini', systemPrompt: null, closedMessage: null },
  }
})
afterAll(closeApp)

const run = () => {
  const draft: OrderDraft = { type: 'DELIVERY', items: [] }
  return getApp().then((app) => handleLlmFree(app, store, { id: convId }, null, { categories: [], productsById: new Map() }, draft, 'Quais hambúrgueres vocês têm?'))
}

describe('bot: o cliente sempre recebe uma resposta legível', () => {
  it('JSON corrompido com lixo: manda só o texto do reply', async () => {
    aiMock.impl = async () => '{"reply":"Temos Beef 1, Beef 2 e Beef 3! 🍔","cart":[],"intent":"browsing","orderType":"DELIVERY","customerName":"","}  PMPL이 확인할 수 없습니다. PMPL이 확인할 수 없습니다.'
    const reply = await run()
    expect(reply).toBe('Temos Beef 1, Beef 2 e Beef 3! 🍔')
  })

  it('resposta inutilizável: mensagem padrão com o link do cardápio', async () => {
    aiMock.impl = async () => Array(40).fill('PMPL이 확인할 수 없습니다.').join(' ')
    const reply = await run()
    expect(reply).toContain('Pode repetir')
    expect(reply).toContain(`/${S.slug}`)
    expect(reply).not.toMatch(/[\uac00-\ud7af]/)
  })

  it('IA fora do ar: mensagem padrão em vez de silêncio', async () => {
    aiMock.impl = async () => { throw new Error('503 Service Unavailable') }
    const reply = await run()
    expect(reply).toContain('Pode repetir')
  })
})
