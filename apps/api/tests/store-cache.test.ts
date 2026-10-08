import { afterAll, describe, expect, it } from 'vitest'
import { call, closeApp, createStore, getApp } from './helpers'

afterAll(closeApp)

describe('vitrine reflete abrir/fechar na hora', () => {
  it('após o lojista abrir a loja, página e lista já mostram "aberta" (sem esperar o cache)', async () => {
    const s = await createStore('cache')
    const app = await getApp()
    await app.prisma.store.update({ where: { id: s.storeId }, data: { isOpen: false } })

    // Aquece o cache com a loja fechada
    expect((await call('GET', `/store/${s.slug}`)).data.data.isOpen).toBe(false)
    const antes = (await call('GET', '/store')).data.data.find((x: { slug: string }) => x.slug === s.slug)
    expect(antes.isOpen).toBe(false)

    // Lojista abre manualmente
    expect((await call('PATCH', '/schedules/toggle', { token: s.token, body: {} })).data.data.isOpen).toBe(true)

    expect((await call('GET', `/store/${s.slug}`)).data.data.isOpen).toBe(true)
    const depois = (await call('GET', '/store')).data.data.find((x: { slug: string }) => x.slug === s.slug)
    expect(depois.isOpen).toBe(true)
  })
})
