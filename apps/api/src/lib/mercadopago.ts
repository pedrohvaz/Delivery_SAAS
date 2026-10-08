/**
 * Integração com Mercado Pago
 * Docs: https://www.mercadopago.com.br/developers
 */

const MP_BASE = 'https://api.mercadopago.com'

interface MPConfig {
  accessToken: string
  sandbox: boolean
}

interface MPPreference {
  title: string
  quantity: number
  unitPrice: number
  externalReference: string
  notificationUrl?: string
}

// Campos da resposta de /v1/payments que usamos
interface MPPaymentResponse {
  id: number | string
  status: string
  date_of_expiration: string // enviada na criação; o MP devolve a mesma
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } }
}

export async function mpCreatePixCharge(config: MPConfig, params: {
  orderId: string
  amount: number
  description: string
  payerEmail?: string
  payerName?: string
  payerCpf?: string
}): Promise<{ id: string; qrCode: string; qrCodeBase64: string; expiresAt: string }> {
  const res = await fetch(`${MP_BASE}/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.accessToken}`,
      'X-Idempotency-Key': params.orderId,
    },
    body: JSON.stringify({
      transaction_amount: params.amount,
      description: params.description,
      payment_method_id: 'pix',
      external_reference: params.orderId,
      payer: {
        email: params.payerEmail ?? 'cliente@delivery.com',
        first_name: params.payerName ?? 'Cliente',
        identification: params.payerCpf ? { type: 'CPF', number: params.payerCpf } : undefined,
      },
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Mercado Pago erro ${res.status}: ${err}`)
  }

  const data = (await res.json()) as MPPaymentResponse
  return {
    id: String(data.id),
    qrCode: data.point_of_interaction?.transaction_data?.qr_code ?? '',
    qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64 ?? '',
    expiresAt: data.date_of_expiration,
  }
}

export async function mpGetPaymentStatus(config: MPConfig, paymentId: string): Promise<string> {
  const res = await fetch(`${MP_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
  })
  if (!res.ok) throw new Error('Erro ao consultar pagamento MP')
  const data = (await res.json()) as Pick<MPPaymentResponse, 'status'>
  return data.status // 'approved' | 'pending' | 'cancelled' | 'rejected'
}
