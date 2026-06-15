import { z } from 'zod'
import type { OrderItemInput } from '../order-service.js'

export type ConversationStateValue =
  | 'LLM_FREE'
  | 'COLLECTING_ADDRESS'
  | 'SELECTING_PAYMENT'
  | 'AWAITING_CONFIRMATION'
  | 'FINALIZED'

export interface DraftAddress {
  street: string
  number: string
  complement?: string
  district: string
  city: string
  state: string
  zipCode: string
  reference?: string
}

/** Rascunho do pedido mantido na coluna Conversation.draft (Json). */
export interface OrderDraft {
  type: 'DELIVERY' | 'PICKUP'
  items: OrderItemInput[] // já revalidados contra o cardápio
  customerName?: string
  address?: DraftAddress
  addressId?: string
  paymentMethod?: string
  changeFor?: number
  // totais (apenas para exibição; createOrder recalcula de forma autoritativa)
  subtotal?: number
  deliveryFee?: number
  total?: number
  // flags de UX do fluxo fixo
  addressPrompted?: boolean
  changeAsked?: boolean
  // cliente já confirmou que quer mesmo um pedido idêntico recente (anti-duplicado)
  dupAck?: boolean
  // timestamp (ms) do último aviso de "loja fechada" enviado (anti-spam)
  closedNotifiedAt?: number
}

export const EMPTY_DRAFT: OrderDraft = { type: 'DELIVERY', items: [] }

/** Perfil de CRM injetado no prompt e usado pelo fluxo fixo. */
export interface BotProfileAddress {
  id: string
  street: string
  number: string
  complement?: string | null
  district: string
  city: string
  state: string
  zipCode: string
  reference?: string | null
  isDefault: boolean
}

export interface BotProfile {
  customerId: string
  name: string
  ordersCount: number
  lastOrderSummary?: string
  addresses: BotProfileAddress[]
  notes?: string | null
}

/** Loja carregada para o bot (Decimals já convertidos em number). */
export interface BotStore {
  id: string
  slug: string
  name: string
  description: string | null
  customDomain: string | null
  estimatedTime: number
  minOrderValue: number
  timezone: string
  isOpen: boolean
  acceptOrders: boolean
  evolutionApiUrl: string | null
  evolutionApiKey: string | null
  evolutionInstance: string | null
  schedules: { dayOfWeek: number; openTime: string; closeTime: string }[]
  paymentMethods: { id: string; type: string; label: string }[]
  deliveryAreas: { type: string; fee: number; freeFrom: number | null; district: string | null; name: string | null }[]
  automationConfig: {
    isEnabled: boolean
    aiProvider: string
    aiApiKey: string | null
    aiModel: string
    systemPrompt: string | null
    closedMessage: string | null
  } | null
}

/** Bloco de controle emitido pelo LLM (cart + intent). */
// Schema tolerante: nunca derruba o carrinho inteiro por causa de um campo ruim
// (usa .catch por campo). Os TETOS (qtd máx., nº de itens) são aplicados como
// CLAMP em revalidateCart — não como rejeição aqui.
export const controlBlockSchema = z.object({
  cart: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().min(1).catch(1),
        notes: z.string().max(200).optional().catch(undefined),
        addons: z.array(z.string()).catch([]).default([]), // optionIds
      }),
    )
    .catch([])
    .default([]),
  intent: z.enum(['browsing', 'checkout']).catch('browsing').default('browsing'),
  orderType: z.enum(['DELIVERY', 'PICKUP']).catch('DELIVERY').default('DELIVERY'),
  customerName: z.string().max(80).optional().catch(undefined),
})

export type ControlBlock = z.infer<typeof controlBlockSchema>
