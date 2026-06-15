import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { EMPTY_DRAFT, type ConversationStateValue, type OrderDraft } from './types.js'

const SESSION_TTL_MS = 30 * 60 * 1000 // 30 min ocioso → reseta a sessão

export type ConversationRow = Awaited<ReturnType<FastifyInstance['prisma']['conversation']['findUnique']>>

/**
 * Carrega (ou cria) a conversa do cliente e aplica expiração de sessão:
 * se estiver fechada ou ociosa há muito tempo fora do estado livre, reseta.
 */
export async function loadSession(app: FastifyInstance, storeId: string, phone: string) {
  let conv = await app.prisma.conversation.upsert({
    where: { storeId_customerPhone: { storeId, customerPhone: phone } },
    create: { storeId, customerPhone: phone, status: 'ACTIVE', state: 'LLM_FREE', stateUpdatedAt: new Date() },
    update: {},
  })

  const stale = Date.now() - new Date(conv.stateUpdatedAt).getTime() > SESSION_TTL_MS
  if (conv.status === 'CLOSED' || stale) {
    conv = await app.prisma.conversation.update({
      where: { id: conv.id },
      data: { status: 'ACTIVE', state: 'LLM_FREE', draft: Prisma.JsonNull, stateUpdatedAt: new Date() },
    })
    // Sessão nova: arquiva o histórico antigo (sai do contexto do LLM e faz a
    // próxima mensagem disparar a saudação/cardápio de boas-vindas novamente).
    await app.prisma.conversationMessage.updateMany({
      where: { conversationId: conv.id, role: { in: ['user', 'assistant'] } },
      data: { role: 'archived' },
    })
  }

  return conv
}

export function getDraft(conv: { draft: unknown }): OrderDraft {
  const d = conv.draft as OrderDraft | null
  return d && typeof d === 'object' ? d : { ...EMPTY_DRAFT }
}

export async function setState(
  app: FastifyInstance,
  convId: string,
  state: ConversationStateValue,
  draft?: OrderDraft,
): Promise<void> {
  await app.prisma.conversation.update({
    where: { id: convId },
    data: {
      state,
      stateUpdatedAt: new Date(),
      ...(draft !== undefined ? { draft: draft as unknown as Prisma.InputJsonValue } : {}),
    },
  })
}

export async function resetToFree(app: FastifyInstance, convId: string): Promise<void> {
  await app.prisma.conversation.update({
    where: { id: convId },
    data: { state: 'LLM_FREE', draft: Prisma.JsonNull, stateUpdatedAt: new Date() },
  })
}

export async function saveMessage(
  app: FastifyInstance,
  convId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
): Promise<void> {
  await app.prisma.conversationMessage.create({ data: { conversationId: convId, role, content } })
}
