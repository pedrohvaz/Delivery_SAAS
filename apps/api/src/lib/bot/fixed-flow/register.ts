import type { FastifyInstance } from 'fastify'
import { createOrder, OrderError } from '../../order-service.js'
import { resetToFree, setState } from '../session.js'
import { DUP_ORDER_MIN } from '../limits.js'
import { EMPTY_DRAFT, type BotStore, type OrderDraft } from '../types.js'

/**
 * Registra o pedido a partir do draft, chamando o order-service diretamente.
 * Em sucesso, vincula o Customer à conversa e zera o draft (volta a LLM_FREE).
 */
export async function registerOrder(
  app: FastifyInstance,
  store: BotStore,
  conv: { id: string; customerPhone: string; customerName: string | null },
  draft: OrderDraft,
): Promise<string> {
  const phone = conv.customerPhone
  const customerName = draft.customerName ?? conv.customerName ?? undefined

  // Anti-pedido-duplicado: se houver um pedido idêntico recente (mesmo total e
  // nº de itens, últimos DUP_ORDER_MIN min), pede confirmação extra antes de criar.
  if (!draft.dupAck) {
    const since = new Date(Date.now() - DUP_ORDER_MIN * 60 * 1000)
    const recent = await app.prisma.order.findFirst({
      where: { storeId: store.id, createdAt: { gte: since }, customer: { phone } },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true, total: true, _count: { select: { items: true } } },
    })
    if (
      recent &&
      draft.items.length > 0 &&
      recent._count.items === draft.items.length &&
      Number(recent.total) === (draft.total ?? 0)
    ) {
      draft.dupAck = true
      await setState(app, conv.id, 'AWAITING_CONFIRMATION', draft)
      return `Você já fez um pedido idêntico há pouco (*#${recent.orderNumber}*) 🤔.\nQuer mesmo fazer *outro igual*? Responda *sim* para confirmar.`
    }
  }

  try {
    const result = await createOrder(app, {
      storeSlug: store.slug,
      type: draft.type,
      items: draft.items,
      customerName,
      customerPhone: phone,
      address: draft.type === 'DELIVERY' ? draft.address : undefined,
      paymentMethod: draft.paymentMethod ?? 'CASH',
      changeFor: draft.changeFor,
      notifyWhatsapp: false, // o bot já manda a confirmação abaixo (evita msg duplicada)
    })

    // Vincula o Customer (criado/atualizado pelo order-service) à conversa,
    // limpa o draft e volta ao estado livre.
    const customer = await app.prisma.customer.findUnique({
      where: { storeId_phone: { storeId: store.id, phone } },
      select: { id: true },
    })
    await resetToFree(app, conv.id)
    await app.prisma.conversation.update({
      where: { id: conv.id },
      data: {
        customerName: customerName ?? conv.customerName ?? undefined,
        customerId: customer?.id ?? null,
      },
    })
    // Arquiva as mensagens deste pedido concluído: continuam visíveis no painel,
    // mas saem do histórico enviado ao LLM (senão ele recria o carrinho do pedido
    // anterior e reabre o checkout na próxima mensagem do cliente).
    await app.prisma.conversationMessage.updateMany({
      where: { conversationId: conv.id, role: { in: ['user', 'assistant'] } },
      data: { role: 'archived' },
    })

    return `✅ *Pedido #${result.orderNumber} confirmado!*\n\n⏱ Tempo estimado: *${result.estimatedTime} min*.\nObrigado por pedir na *${store.name}*! 🎉`
  } catch (err) {
    if (err instanceof OrderError) {
      // Falha recuperável (ex.: item esgotado) — o carrinho é inválido, mas o
      // que o cliente já informou (pagamento, troco, endereço, tipo, nome)
      // continua valendo, para não perguntar tudo de novo no próximo pedido.
      const kept: OrderDraft = {
        ...EMPTY_DRAFT,
        type: draft.type,
        customerName: draft.customerName,
        paymentMethod: draft.paymentMethod,
        changeFor: draft.changeFor,
        address: draft.address,
        addressId: draft.addressId,
      }
      await setState(app, conv.id, 'LLM_FREE', kept)
      return `😔 Não consegui finalizar o pedido: ${err.message}\n\nQuer tentar de novo? Me diga o que você deseja. 🙂`
    }
    await resetToFree(app, conv.id)
    app.log.error({ err }, 'bot registerOrder error')
    return '😔 Tivemos um problema ao registrar o pedido. Pode tentar novamente em instantes?'
  }
}
