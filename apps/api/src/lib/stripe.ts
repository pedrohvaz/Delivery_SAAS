import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    })
  }
  return stripeClient
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function createStripeProduct(name: string, description?: string) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe não configurado (STRIPE_SECRET_KEY ausente)')
  return stripe.products.create({ name, description })
}

export async function createStripePrice(productId: string, amountInCents: number) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe não configurado')
  return stripe.prices.create({
    product: productId,
    unit_amount: amountInCents,
    currency: 'brl',
    recurring: { interval: 'month' },
  })
}

export async function createCheckoutSession(params: {
  priceId: string
  customerId?: string
  customerEmail?: string
  storeId: string
  successUrl: string
  cancelUrl: string
  trialDays?: number
}) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe não configurado')

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: params.priceId, quantity: 1 }],
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
    client_reference_id: params.storeId,
    metadata: { storeId: params.storeId },
    subscription_data: params.trialDays ? { trial_period_days: params.trialDays } : undefined,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
  })
}

/** Cria checkout session SEM conta existente (pré-cadastro pago) */
export async function createPreSignupCheckoutSession(params: {
  priceId: string
  customerEmail: string
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
  trialDays?: number
}) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe não configurado')

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: params.priceId, quantity: 1 }],
    customer_email: params.customerEmail,
    metadata: params.metadata,
    subscription_data: {
      ...(params.trialDays ? { trial_period_days: params.trialDays } : {}),
      metadata: params.metadata,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
  })
}

/** Recupera sessão do Stripe para verificar pagamento */
export async function retrieveCheckoutSession(sessionId: string) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe não configurado')
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  })
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe não configurado')
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
