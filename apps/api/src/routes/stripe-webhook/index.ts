import type { FastifyPluginAsync } from 'fastify'
import { getStripe } from '../../lib/stripe.js'

const stripeWebhookRoutes: FastifyPluginAsync = async (app) => {
  // POST /stripe/webhook
  // Recebe eventos do Stripe (assinatura criada, cancelada, pagamento falhou, etc)
  app.post('/webhook', { config: { rawBody: true } as any }, async (request, reply) => {
    const stripe = getStripe()
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!stripe || !secret) {
      return reply.status(503).send({ error: 'Stripe', message: 'Stripe não configurado' })
    }

    const signature = request.headers['stripe-signature']
    if (!signature) return reply.status(400).send({ error: 'Bad Request', message: 'Assinatura ausente' })

    let event
    try {
      const rawBody = (request as any).rawBody ?? JSON.stringify(request.body)
      event = stripe.webhooks.constructEvent(rawBody, signature as string, secret)
    } catch (err: any) {
      app.log.error({ err }, 'Webhook signature inválida')
      return reply.status(400).send({ error: 'Bad Request', message: 'Assinatura inválida' })
    }

    try {
      switch (event.type) {
        // ─── Checkout pago — pré-cadastro (signupType=paid) ──────────────────
        case 'checkout.session.completed': {
          const session = event.data.object as any
          const meta = session.metadata ?? {}

          if (meta.signupType !== 'paid') break

          // Verifica idempotência: se a conta já foi criada, sai
          const existing = await app.prisma.user.findUnique({ where: { email: meta.email } })
          if (existing) {
            app.log.info({ email: meta.email }, 'Conta já criada via webhook')
            break
          }

          const slugAlreadyUsed = await app.prisma.store.findUnique({ where: { slug: meta.storeSlug } })
          if (slugAlreadyUsed) {
            app.log.warn({ slug: meta.storeSlug }, 'Slug já em uso ao criar conta paga')
            break
          }

          // Cria store + user em transação
          const { store } = await app.prisma.$transaction(async (tx: any) => {
            const store = await tx.store.create({
              data: {
                name: meta.storeName,
                slug: meta.storeSlug,
                phone: meta.phone || null,
                stripeCustomerId: session.customer,
              },
            })
            const user = await tx.user.create({
              data: {
                storeId: store.id,
                name: meta.name,
                email: meta.email,
                password: meta.passwordHash,
                role: 'ADMIN',
              },
            })
            return { store, user }
          })

          // Métodos de pagamento padrão
          await app.prisma.paymentMethod.createMany({
            data: [
              { storeId: store.id, type: 'PIX',         label: 'Pix',               isActive: true },
              { storeId: store.id, type: 'CASH',         label: 'Dinheiro',          isActive: true },
              { storeId: store.id, type: 'CREDIT_CARD',  label: 'Cartão de Crédito', isActive: true },
              { storeId: store.id, type: 'DEBIT_CARD',   label: 'Cartão de Débito',  isActive: true },
            ],
          })

          // Vincula o storeId na assinatura via metadata da subscription
          if (session.subscription) {
            try {
              const stripe = getStripe()!
              await stripe.subscriptions.update(session.subscription, {
                metadata: { storeId: store.id },
              })
            } catch (err) {
              app.log.error({ err }, 'Erro ao atualizar metadata da subscription')
            }
          }

          app.log.info({ storeId: store.id, email: meta.email }, 'Conta criada via webhook após pagamento')
          break
        }

        // ─── Assinatura criada / atualizada ──────────────────────────────────
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as any
          // Tenta achar storeId via metadata ou via customerId da loja
          let storeId = sub.metadata?.storeId
          if (!storeId && sub.customer) {
            const store = await app.prisma.store.findFirst({
              where: { stripeCustomerId: sub.customer },
            })
            storeId = store?.id
          }
          if (!storeId) {
            app.log.warn({ subId: sub.id }, 'Subscription sem storeId — ainda não vinculada')
            break
          }

          const stripePriceId = sub.items?.data?.[0]?.price?.id
          const plan = stripePriceId
            ? await app.prisma.plan.findFirst({ where: { stripePriceId } })
            : null
          if (!plan) break

          await app.prisma.subscription.upsert({
            where: { storeId },
            create: {
              storeId,
              planId: plan.id,
              status: mapStripeStatus(sub.status),
              stripeSubscriptionId: sub.id,
              stripeCustomerId: sub.customer,
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
              currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            },
            update: {
              planId: plan.id,
              status: mapStripeStatus(sub.status),
              stripeSubscriptionId: sub.id,
              stripeCustomerId: sub.customer,
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
              currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
              canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            },
          })

          // Salva customerId na Store
          await app.prisma.store.update({
            where: { id: storeId },
            data: { stripeCustomerId: sub.customer },
          })
          break
        }

        // ─── Assinatura cancelada ────────────────────────────────────────────
        case 'customer.subscription.deleted': {
          const sub = event.data.object as any
          await app.prisma.subscription.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: { status: 'CANCELED', canceledAt: new Date() },
          })
          break
        }

        // ─── Pagamento falhou ────────────────────────────────────────────────
        case 'invoice.payment_failed': {
          const invoice = event.data.object as any
          if (invoice.subscription) {
            await app.prisma.subscription.updateMany({
              where: { stripeSubscriptionId: invoice.subscription },
              data: { status: 'PAST_DUE' },
            })
          }
          break
        }
      }

      return reply.send({ received: true })
    } catch (err) {
      app.log.error({ err, eventType: event.type }, 'Erro processando webhook')
      return reply.status(500).send({ error: 'Webhook', message: 'Erro processando evento' })
    }
  })
}

function mapStripeStatus(s: string): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'UNPAID' {
  switch (s) {
    case 'trialing':  return 'TRIALING'
    case 'active':    return 'ACTIVE'
    case 'past_due':  return 'PAST_DUE'
    case 'canceled':  return 'CANCELED'
    case 'unpaid':    return 'UNPAID'
    default:          return 'INCOMPLETE'
  }
}

export default stripeWebhookRoutes
