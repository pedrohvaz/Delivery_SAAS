import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { call, closeApp, createStore, getApp, type TestStore } from './helpers'

let S: TestStore
beforeAll(async () => { S = await createStore('imagens') })
afterAll(closeApp)

async function upload(folder: string | null, width: number, height: number) {
  const img = await sharp({ create: { width, height, channels: 3, background: '#0f172a' } }).jpeg().toBuffer()
  const boundary = '----b' + Date.now()
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    img,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const app = await getApp()
  const r = await app.inject({
    method: 'POST', url: `/upload/image${folder ? `?folder=${folder}` : ''}`, payload,
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, authorization: `Bearer ${S.token}` },
  })
  return { status: r.statusCode, url: r.json().data?.url as string }
}

async function widthOf(url: string) {
  const app = await getApp()
  const r = await app.inject({ method: 'GET', url: new URL(url, 'http://x').pathname })
  return (await sharp(r.rawPayload).metadata()).width
}

describe('upload de banner e logo', () => {
  it('banner vai para /banners e mantém até 1920px de largura', async () => {
    const r = await upload('banners', 2400, 800)
    expect(r.status).toBe(201)
    expect(r.url).toContain('/banners/')
    expect(await widthOf(r.url)).toBe(1920)
  })

  it('logo vai para /logos e é reduzida para 512px', async () => {
    const r = await upload('logos', 1000, 1000)
    expect(r.url).toContain('/logos/')
    expect(await widthOf(r.url)).toBe(512)
  })

  it('pasta desconhecida cai em /products (não deixa escolher caminho)', async () => {
    const r = await upload('../../etc', 300, 300)
    expect(r.url).toContain('/products/')
  })
})

describe('salvar e remover banner e logo', () => {
  it('salva, aparece na vitrine e pode ser removido', async () => {
    const banner = (await upload('banners', 1200, 400)).url
    const logo = (await upload('logos', 300, 300)).url
    expect((await call('PATCH', '/settings', { token: S.token, body: { bannerUrl: banner, logoUrl: logo } })).status).toBe(200)

    const pub = (await call('GET', `/store/${S.slug}`)).data.data
    expect(pub.bannerUrl).toBe(banner)
    expect(pub.logoUrl).toBe(logo)
    const cfg = (await call('GET', '/settings', { token: S.token })).data.data
    expect(cfg.logoUrl).toBe(logo)

    await call('PATCH', '/settings', { token: S.token, body: { bannerUrl: '', logoUrl: '' } })
    const depois = (await call('GET', `/store/${S.slug}`)).data.data
    expect(depois.bannerUrl).toBeNull()
    expect(depois.logoUrl).toBeNull()
  })
})
