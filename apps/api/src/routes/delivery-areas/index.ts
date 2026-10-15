import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'
import { invalidateStorePublicCache } from '../../lib/cache.js'
import { geocodeAddress, isValidPoint } from '../../lib/geocode.js'
import { OrderError, deliveryDistance, resolveDelivery } from '../../lib/order-service.js'

const money = z.number().min(0).max(100000)

const areaSchema = z.object({
  name: z.string().trim().max(60).optional().nullable(),
  type: z.enum(['DISTRICT', 'RADIUS', 'DISTANCE']),
  fee: money,
  minOrder: money.default(0),
  freeFrom: money.optional().nullable(),
  district: z.string().trim().min(1).max(120).optional().nullable(),
  radiusKm: z.number().min(0.1).max(300).optional().nullable(),
  baseKm: z.number().min(0).max(300).optional().nullable(),
  perKmFee: money.optional().nullable(),
  isActive: z.boolean().default(true),
})

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

const bad = (reply: FastifyReply, message: string, status = 400) =>
  reply.status(status).send({ error: status === 409 ? 'Conflict' : 'Validation Error', message, statusCode: status })

const deliveryAreaRoutes: FastifyPluginAsync = async (app) => {
  // Mudou área ou localização: a vitrine mostra na hora (cache público limpo antes da resposta sair)
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.method !== 'GET' && reply.statusCode < 400 && request.user?.storeId) {
      await invalidateStorePublicCache(app.prisma, request.user.storeId)
    }
    return payload
  })

  /** Regras que dependem das outras áreas da loja (bairro repetido, uma taxa fixa só...). */
  async function validar(storeId: string, d: z.infer<typeof areaSchema>, ignoreId?: string): Promise<string | null> {
    const outras = await app.prisma.deliveryArea.findMany({ where: { storeId, ...(ignoreId ? { id: { not: ignoreId } } : {}) } })
    if (d.type === 'DISTRICT') {
      if (!d.district) return 'Informe o nome do bairro'
      if (outras.some((a) => a.type === 'DISTRICT' && a.district && norm(a.district) === norm(d.district!))) {
        return `O bairro "${d.district}" já está cadastrado`
      }
    }
    if (d.type === 'RADIUS' && outras.some((a) => a.type === 'RADIUS')) {
      return 'Já existe uma taxa fixa. Edite a que está cadastrada.'
    }
    if (d.type === 'DISTANCE') {
      if (!d.radiusKm) return 'Informe até quantos km você entrega'
      if ((d.baseKm ?? 0) > d.radiusKm) return 'Os km incluídos na taxa base não podem passar da distância máxima'
      const store = await app.prisma.store.findUnique({ where: { id: storeId }, select: { lat: true, lng: true } })
      if (!isValidPoint(store)) return 'Marque primeiro a localização da loja (no topo da página) para cobrar por distância'
    }
    return null
  }

  function dados(d: z.infer<typeof areaSchema>) {
    return {
      type: d.type,
      name: d.name || null,
      fee: d.fee,
      minOrder: d.minOrder,
      freeFrom: d.freeFrom || null,
      district: d.type === 'DISTRICT' ? d.district : null,
      radiusKm: d.type === 'DISTANCE' ? d.radiusKm : null,
      baseKm: d.type === 'DISTANCE' ? d.baseKm ?? 0 : null,
      perKmFee: d.type === 'DISTANCE' ? d.perKmFee ?? 0 : null,
      isActive: d.isActive,
    }
  }

  // ─── GET /delivery-areas ───────────────────────────────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const areas = await app.prisma.deliveryArea.findMany({
      where: { storeId: request.user.storeId },
      orderBy: [{ type: 'asc' }, { district: 'asc' }],
    })
    return { data: areas }
  })

  // ─── POST /delivery-areas ──────────────────────────────────────────
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const r = areaSchema.safeParse(request.body)
    if (!r.success) return bad(reply, r.error.issues[0]?.message ?? 'Dados inválidos')
    const erro = await validar(request.user.storeId, r.data)
    if (erro) return bad(reply, erro, erro.includes('já') ? 409 : 400)

    const area = await app.prisma.deliveryArea.create({ data: { storeId: request.user.storeId, ...dados(r.data) } })
    return reply.status(201).send({ data: area })
  })

  // ─── POST /delivery-areas/bulk (vários bairros com a mesma taxa) ───
  app.post('/bulk', { preHandler: [authenticate] }, async (request, reply) => {
    const r = z.object({
      districts: z.array(z.string().trim().min(1).max(120)).min(1).max(200),
      fee: money,
      minOrder: money.default(0),
      freeFrom: money.optional().nullable(),
    }).safeParse(request.body)
    if (!r.success) return bad(reply, 'Informe ao menos um bairro e a taxa')

    const storeId = request.user.storeId
    const existentes = new Set(
      (await app.prisma.deliveryArea.findMany({ where: { storeId, type: 'DISTRICT' }, select: { district: true } }))
        .map((a) => norm(a.district ?? '')),
    )
    const novos: string[] = []
    const repetidos: string[] = []
    for (const nome of r.data.districts) {
      const k = norm(nome)
      if (!k) continue
      if (existentes.has(k)) { repetidos.push(nome); continue }
      existentes.add(k)
      novos.push(nome)
    }
    if (novos.length) {
      await app.prisma.deliveryArea.createMany({
        data: novos.map((district) => ({
          storeId, type: 'DISTRICT' as const, district, fee: r.data.fee, minOrder: r.data.minOrder, freeFrom: r.data.freeFrom || null,
        })),
      })
    }
    return reply.status(201).send({ data: { created: novos.length, skipped: repetidos } })
  })

  // ─── PATCH /delivery-areas/:id ─────────────────────────────────────
  app.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const area = await app.prisma.deliveryArea.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!area) return reply.status(404).send({ error: 'Not Found', message: 'Área não encontrada', statusCode: 404 })

    // Junta o que veio com o que já existe e valida o resultado inteiro
    const atual = {
      name: area.name, type: area.type, fee: Number(area.fee), minOrder: Number(area.minOrder),
      freeFrom: area.freeFrom != null ? Number(area.freeFrom) : null, district: area.district,
      radiusKm: area.radiusKm, baseKm: area.baseKm, perKmFee: area.perKmFee != null ? Number(area.perKmFee) : null,
      isActive: area.isActive,
    }
    const r = areaSchema.safeParse({ ...atual, ...(request.body as object) })
    if (!r.success) return bad(reply, r.error.issues[0]?.message ?? 'Dados inválidos')
    const erro = await validar(request.user.storeId, r.data, id)
    if (erro) return bad(reply, erro, erro.includes('já') ? 409 : 400)

    const updated = await app.prisma.deliveryArea.update({ where: { id }, data: dados(r.data) })
    return { data: updated }
  })

  // ─── DELETE /delivery-areas/:id ────────────────────────────────────
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const del = await app.prisma.deliveryArea.deleteMany({ where: { id, storeId: request.user.storeId } })
    if (del.count === 0) return reply.status(404).send({ error: 'Not Found', message: 'Área não encontrada', statusCode: 404 })
    return reply.status(204).send()
  })

  // ─── Localização da loja (ponto de partida da distância) ───────────
  app.get('/store-location', { preHandler: [authenticate] }, async (request) => {
    const s = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: { lat: true, lng: true, address: true, number: true, district: true, city: true, state: true, zipCode: true },
    })
    return { data: s }
  })

  app.put('/store-location', { preHandler: [authenticate] }, async (request, reply) => {
    const r = z.union([
      z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
      z.object({ fromAddress: z.literal(true) }),
    ]).safeParse(request.body)
    if (!r.success) return bad(reply, 'Localização inválida')

    const storeId = request.user.storeId
    let ponto: { lat: number; lng: number } | null
    if ('fromAddress' in r.data) {
      const s = await app.prisma.store.findUnique({ where: { id: storeId }, select: { address: true, number: true, district: true, city: true, state: true, zipCode: true } })
      if (!s?.city || !(s.address || s.zipCode)) return bad(reply, 'Cadastre o endereço da loja em Configurações primeiro')
      ponto = await geocodeAddress({ street: s.address, number: s.number, district: s.district, city: s.city, state: s.state, zipCode: s.zipCode })
      if (!ponto) return bad(reply, 'Não achamos o endereço da loja no mapa. Use "Usar minha localização" estando na loja.', 422)
    } else {
      ponto = r.data
      if (!isValidPoint(ponto)) return bad(reply, 'Localização inválida')
    }
    const s = await app.prisma.store.update({ where: { id: storeId }, data: { lat: ponto.lat, lng: ponto.lng }, select: { lat: true, lng: true } })
    return { data: s }
  })

  // ─── POST /delivery-areas/quote (simulador do painel) ──────────────
  app.post('/quote', { preHandler: [authenticate] }, async (request, reply) => {
    const r = quoteSchema.safeParse(request.body)
    if (!r.success) return bad(reply, 'Informe o endereço e o valor do pedido')
    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: { lat: true, lng: true, city: true, state: true, deliveryAreas: { where: { isActive: true } } },
    })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })
    return { data: await cotar(store, r.data) }
  })
}

export const quoteSchema = z.object({
  street: z.string().max(200).optional(),
  number: z.string().max(20).optional(),
  district: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(40).optional(),
  zipCode: z.string().max(12).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  subtotal: z.number().min(0).max(100000).default(0),
})

/** Cotação de entrega (painel e vitrine): taxa, distância e se atende. */
export async function cotar(
  store: { lat: number | null; lng: number | null; city: string | null; state: string | null; deliveryAreas: Parameters<typeof resolveDelivery>[0]['areas'] },
  q: z.infer<typeof quoteSchema>,
) {
  const address = { ...q, city: q.city || store.city, state: q.state || store.state }
  const km = await deliveryDistance(store, address)
  const usaDistancia = store.deliveryAreas.some((a) => a.type === 'DISTANCE')
  try {
    const quote = resolveDelivery({ areas: store.deliveryAreas, type: 'DELIVERY', district: q.district, subtotal: q.subtotal, distanceKm: km })
    const minOrder = Number(quote.area?.minOrder ?? 0)
    return {
      available: true,
      fee: quote.fee,
      baseFee: quote.baseFee,
      distanceKm: km,
      minOrder,
      belowMinOrder: minOrder > 0 && q.subtotal < minOrder,
      areaType: quote.area?.type ?? null,
      areaLabel: quote.area ? (quote.area.district ?? quote.area.name ?? null) : null,
      freeFrom: quote.area?.freeFrom != null ? Number(quote.area.freeFrom) : null,
      distanceUnknown: usaDistancia && km == null,
      message: null as string | null,
    }
  } catch (err) {
    if (err instanceof OrderError) {
      return { available: false, fee: 0, baseFee: 0, distanceKm: km, minOrder: 0, belowMinOrder: false, areaType: null, areaLabel: null, freeFrom: null, distanceUnknown: usaDistancia && km == null, message: err.message }
    }
    throw err
  }
}

export default deliveryAreaRoutes
