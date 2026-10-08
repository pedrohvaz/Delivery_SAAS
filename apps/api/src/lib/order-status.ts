import type { PrismaClient } from '@prisma/client'

// Ordem das etapas. O pedido só anda para frente (pode pular etapas);
// CANCELLED é permitido de qualquer etapa não final. DELIVERED e CANCELLED são finais.
const RANK: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  IN_PRODUCTION: 2,
  OUT_FOR_DELIVERY: 3,
  READY_FOR_PICKUP: 3,
  DELIVERED: 4,
}
const FINAL = new Set(['DELIVERED', 'CANCELLED'])

export const ORDER_STATUSES = ['CONFIRMED', 'IN_PRODUCTION', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'] as const

export class OrderStatusError extends Error {
  constructor(public code: 'NOT_FOUND' | 'INVALID_TRANSITION' | 'CONFLICT' | 'OUT_OF_STOCK', message: string, public httpStatus: number) {
    super(message)
    this.name = 'OrderStatusError'
  }
}

/**
 * Muda o status de um pedido de forma atômica:
 * - valida a transição (sem voltar etapas, sem sair de DELIVERED/CANCELLED);
 * - "reivindica" a mudança com UPDATE condicional (`where status = atual`): duas
 *   requisições simultâneas (duplo clique) não aplicam os efeitos duas vezes;
 * - ao sair de PENDING baixa o estoque, recusando se não houver saldo;
 * - ao cancelar devolve estoque (se já tinha baixado) e o uso do cupom — uma vez só,
 *   porque CANCELLED é final.
 */
export async function changeOrderStatus(
  prisma: PrismaClient,
  params: { orderId: string; storeId: string; to: string; cancelReason?: string },
) {
  const { orderId, storeId, to, cancelReason } = params

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, storeId },
      select: { id: true, status: true, couponId: true, paymentMethod: true, paymentStatus: true, items: { select: { productId: true, quantity: true } } },
    })
    if (!order) throw new OrderStatusError('NOT_FOUND', 'Pedido não encontrado', 404)

    const from = order.status
    const allowed = !FINAL.has(from) && (to === 'CANCELLED' || (RANK[to] ?? -1) > (RANK[from] ?? 99))
    if (!allowed) {
      throw new OrderStatusError('INVALID_TRANSITION', `Não é possível mudar o pedido de ${from} para ${to}`, 409)
    }

    // Ao entregar um pedido em DINHEIRO, marca como PAGO (o dinheiro entrou na gaveta).
    const autoPayCash = to === 'DELIVERED' && order.paymentMethod === 'CASH' && order.paymentStatus !== 'PAID'

    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: from },
      data: {
        status: to as never,
        ...(to === 'CANCELLED' && cancelReason ? { cancelReason } : {}),
        ...(autoPayCash ? { paymentStatus: 'PAID' as never } : {}),
      },
    })
    if (claimed.count === 0) {
      throw new OrderStatusError('CONFLICT', 'O pedido foi alterado por outra ação. Atualize a tela.', 409)
    }

    const qtyByProduct = new Map<string, number>()
    for (const it of order.items) {
      if (it.productId) qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) ?? 0) + it.quantity)
    }

    // Saiu de PENDING (para qualquer etapa que não seja cancelamento) → baixa estoque
    if (from === 'PENDING' && to !== 'CANCELLED') {
      for (const [productId, qty] of qtyByProduct) {
        const product = await tx.product.findFirst({ where: { id: productId, storeId }, select: { stockControl: true, name: true } })
        if (!product?.stockControl) continue
        const dec = await tx.product.updateMany({
          where: { id: productId, storeId, stockControl: true, stockQty: { gte: qty } },
          data: { stockQty: { decrement: qty } },
        })
        if (dec.count === 0) {
          throw new OrderStatusError('OUT_OF_STOCK', `Estoque insuficiente de "${product.name}" para confirmar este pedido`, 409)
        }
        await tx.product.updateMany({
          where: { id: productId, storeId, stockControl: true, stockQty: { lte: 0 } },
          data: { isActive: false },
        })
      }
    }

    if (to === 'CANCELLED') {
      // Estoque só foi baixado se o pedido já tinha saído de PENDING
      if (from !== 'PENDING') {
        for (const [productId, qty] of qtyByProduct) {
          await tx.product.updateMany({
            where: { id: productId, storeId, stockControl: true },
            data: { stockQty: { increment: qty }, isActive: true },
          })
        }
      }
      if (order.couponId) {
        await tx.coupon.updateMany({
          where: { id: order.couponId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        })
      }
    }

    return { id: order.id, from, status: to }
  })
}
