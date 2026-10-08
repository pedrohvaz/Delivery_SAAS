// Asaas Payment Gateway — https://asaas.com/documentacao

const SANDBOX_URL = 'https://sandbox.asaas.com/api/v3'
const PROD_URL = 'https://api.asaas.com/v3'

function baseUrl(sandbox: boolean) {
  return sandbox ? SANDBOX_URL : PROD_URL
}

function headers(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'access_token': apiKey,
  }
}

export interface AsaasCustomer {
  id: string
  name: string
}

export interface AsaasCharge {
  id: string
  status: string
  value: number
  invoiceUrl?: string
}

export interface AsaasPixQrCode {
  encodedImage: string   // base64 PNG
  payload: string        // copia-e-cola
  expirationDate: string // ISO datetime
}

export async function asaasCreateCustomer(
  apiKey: string,
  sandbox: boolean,
  data: { name: string; phone?: string; cpfCnpj?: string; email?: string },
): Promise<AsaasCustomer> {
  const r = await fetch(`${baseUrl(sandbox)}/customers`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ ...data, notificationDisabled: true }),
  })
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Asaas createCustomer ${r.status}: ${err}`)
  }
  return r.json() as Promise<AsaasCustomer>
}

export async function asaasCreatePixCharge(
  apiKey: string,
  sandbox: boolean,
  data: {
    customer: string
    value: number
    dueDate: string           // YYYY-MM-DD
    description?: string
    externalReference?: string
  },
): Promise<AsaasCharge> {
  const r = await fetch(`${baseUrl(sandbox)}/payments`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ ...data, billingType: 'PIX' }),
  })
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Asaas createPixCharge ${r.status}: ${err}`)
  }
  return r.json() as Promise<AsaasCharge>
}

export async function asaasGetPixQrCode(
  apiKey: string,
  sandbox: boolean,
  paymentId: string,
): Promise<AsaasPixQrCode> {
  const r = await fetch(`${baseUrl(sandbox)}/payments/${paymentId}/pixQrCode`, {
    headers: headers(apiKey),
  })
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Asaas getPixQrCode ${r.status}: ${err}`)
  }
  return r.json() as Promise<AsaasPixQrCode>
}

/** Consulta uma cobrança direto no Asaas (fonte confiável do status e do valor). */
export async function asaasGetPayment(apiKey: string, sandbox: boolean, paymentId: string): Promise<AsaasCharge> {
  const res = await fetch(`${baseUrl(sandbox)}/payments/${encodeURIComponent(paymentId)}`, { headers: headers(apiKey) })
  if (!res.ok) throw new Error(`Asaas getPayment: ${res.status}`)
  return res.json() as Promise<AsaasCharge>
}
