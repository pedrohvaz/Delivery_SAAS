import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { io as ioClient } from 'socket.io-client'
import { call, closeApp, createStore, getApp, type TestStore } from './helpers'

// Cobre as partes que dependem dos plugins do Fastify (upload, arquivos estáticos,
// CORS, cabeçalhos de segurança, socket). Servem de rede de segurança em upgrades.
let A: TestStore
beforeAll(async () => { A = await createStore('plataforma') })
afterAll(closeApp)

function multipartBody(filename: string, contentType: string, data: Buffer) {
  const boundary = '----teste' + Date.now()
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`)
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
  return { payload: Buffer.concat([head, data, tail]), contentType: `multipart/form-data; boundary=${boundary}` }
}

describe('upload e arquivos estáticos', () => {
  it('aceita PNG, converte e serve em /uploads', async () => {
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#f97316' } }).png().toBuffer()
    const { payload, contentType } = multipartBody('logo.png', 'image/png', png)
    const app = await getApp()
    const r = await app.inject({ method: 'POST', url: '/upload/image', payload, headers: { 'content-type': contentType, authorization: `Bearer ${A.token}` } })
    expect(r.statusCode).toBe(201)
    const url: string = r.json().data.url
    const path = new URL(url, 'http://x').pathname
    const file = await app.inject({ method: 'GET', url: path })
    expect(file.statusCode).toBe(200)
  })

  it('recusa arquivo que não é imagem', async () => {
    const { payload, contentType } = multipartBody('x.png', 'image/png', Buffer.from('<script>alert(1)</script>'))
    const app = await getApp()
    const r = await app.inject({ method: 'POST', url: '/upload/image', payload, headers: { 'content-type': contentType, authorization: `Bearer ${A.token}` } })
    expect(r.statusCode).toBe(400)
  })

  it('não permite sair da pasta de uploads', async () => {
    const r = await call('GET', '/uploads/..%2f..%2fpackage.json')
    expect(r.status).not.toBe(200)
  })
})

describe('cabeçalhos', () => {
  it('CORS libera só as origens configuradas', async () => {
    const ok = await call('OPTIONS', '/store', { headers: { origin: 'http://localhost:3001', 'access-control-request-method': 'GET' } })
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3001')
    const bad = await call('OPTIONS', '/store', { headers: { origin: 'https://site-malicioso.com', 'access-control-request-method': 'GET' } })
    expect(bad.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('CORS libera PATCH/PUT/DELETE para o painel (preflight)', async () => {
    for (const method of ['PATCH', 'PUT', 'DELETE']) {
      const r = await call('OPTIONS', '/orders/x/status', { headers: { origin: 'http://localhost:3001', 'access-control-request-method': method } })
      expect(String(r.headers['access-control-allow-methods'])).toContain(method)
    }
  })

  it('envia cabeçalhos de segurança (helmet)', async () => {
    const r = await call('GET', '/health')
    expect(r.headers['x-content-type-options']).toBe('nosniff')
  })

  it('erro de rota desconhecida responde 404 em JSON', async () => {
    const r = await call('GET', '/rota-que-nao-existe')
    expect(r.status).toBe(404)
    expect(r.data.statusCode).toBe(404)
  })
})

describe('socket do painel', () => {
  it('conecta com token de loja e recusa sem token', async () => {
    const app = await getApp()
    await app.listen({ port: 0, host: '127.0.0.1' })
    const { port } = app.server.address() as { port: number }
    const connect = (token?: string) => new Promise<string>((resolve) => {
      const s = ioClient(`http://127.0.0.1:${port}`, { auth: token ? { token } : {}, transports: ['websocket'], reconnection: false })
      s.on('connect', () => { s.close(); resolve('ok') })
      s.on('connect_error', () => { s.close(); resolve('recusado') })
    })
    expect(await connect(A.token)).toBe('ok')
    expect(await connect()).toBe('recusado')
    expect(await connect(A.refreshToken)).toBe('recusado')
  })
})
