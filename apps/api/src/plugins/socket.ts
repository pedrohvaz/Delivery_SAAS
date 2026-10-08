import fp from 'fastify-plugin'
import { Server as SocketServer } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import type { JwtPayload } from '@delivery/types'

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketServer
  }
}

export const socketPlugin = fp(async (app: FastifyInstance) => {
  const io = new SocketServer(app.server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  })

  // Middleware de autenticação via JWT
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token as string
      if (!token) return next(new Error('Token não informado'))
      const payload = app.jwt.verify(token) as JwtPayload & { type?: string }
      // Só o painel do lojista entra na sala da loja (token de cliente/refresh não tem storeId)
      if (!payload.storeId || payload.type === 'refresh' || payload.type === 'customer') return next(new Error('Token inválido'))
      socket.data.storeId = payload.storeId
      socket.data.userId = payload.sub
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket) => {
    const { storeId } = socket.data as { storeId: string }
    // Cada loja tem sua própria sala
    socket.join(`store:${storeId}`)
    app.log.info({ storeId }, 'Admin conectado via Socket.io')

    socket.on('disconnect', () => {
      app.log.info({ storeId }, 'Admin desconectado')
    })
  })

  app.decorate('io', io)

  app.addHook('onClose', async () => {
    await io.close()
  })
})
