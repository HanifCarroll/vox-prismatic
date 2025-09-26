import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'

import { env } from '@/config/env'
import { db } from '@/db'
import { users } from '@/db/schema'
import { NotFoundException, ValidationException } from '@/utils/errors'
import { logger } from '@/utils/logger'

import { getStripeClient } from './stripe'

function assertStripeConfigured() {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID || !env.STRIPE_SUCCESS_URL || !env.STRIPE_CANCEL_URL) {
    throw new ValidationException('Stripe billing is not fully configured')
  }
}

async function ensureStripeCustomer(user: typeof users.$inferSelect): Promise<string> {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId
  }
  const stripe = getStripeClient()
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: String(user.id) },
  })
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, user.id))
  return customer.id
}

function toDateFromUnix(unix?: number | null): Date | null {
  if (!unix) return null
  if (!Number.isFinite(unix)) return null
  return new Date(unix * 1000)
}

async function findUserByStripeIdentifiers(
  subscriptionId?: string | null,
  customerId?: string | null,
  explicitUserId?: number | null,
) {
  if (explicitUserId) {
    const byId = await db.query.users.findFirst({ where: eq(users.id, explicitUserId) })
    if (byId) return byId
  }
  if (subscriptionId) {
    const bySubscription = await db.query.users.findFirst({ where: eq(users.stripeSubscriptionId, subscriptionId) })
    if (bySubscription) return bySubscription
  }
  if (customerId) {
    return db.query.users.findFirst({ where: eq(users.stripeCustomerId, customerId) })
  }
  return null
}

async function applySubscriptionUpdate(
  user: typeof users.$inferSelect,
  update: {
    stripeCustomerId?: string | null
    stripeSubscriptionId?: string | null
    status?: string | null
    currentPeriodEnd?: Date | null
    cancelAtPeriodEnd?: boolean | null
    trialEndsAt?: Date | null | undefined
  },
) {
  const payload: Partial<typeof users.$inferInsert> = { updatedAt: new Date() }

  if (typeof update.stripeCustomerId === 'string') {
    payload.stripeCustomerId = update.stripeCustomerId
  }
  if (typeof update.stripeSubscriptionId === 'string') {
    payload.stripeSubscriptionId = update.stripeSubscriptionId
  }
  if (typeof update.status === 'string') {
    payload.subscriptionStatus = update.status
  }
  if (typeof update.cancelAtPeriodEnd === 'boolean') {
    payload.cancelAtPeriodEnd = update.cancelAtPeriodEnd
  }
  if (update.currentPeriodEnd !== undefined) {
    payload.subscriptionCurrentPeriodEnd = update.currentPeriodEnd ?? null
  }
  if (update.trialEndsAt !== undefined) {
    payload.trialEndsAt = update.trialEndsAt
  }
  if (update.status === 'active') {
    payload.trialEndsAt = null
  }
  if (typeof update.stripeSubscriptionId === 'string' || typeof update.status === 'string') {
    payload.subscriptionPlan = 'pro'
  }

  if (Object.keys(payload).length > 1) {
    await db.update(users).set(payload).where(eq(users.id, user.id))
  }
}

export async function createCheckoutSessionForUser(userId: number) {
  assertStripeConfigured()
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) {
    throw new NotFoundException('User not found')
  }
  const stripe = getStripeClient()
  const customerId = await ensureStripeCustomer(user)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    billing_address_collection: 'required',
    allow_promotion_codes: false,
    metadata: { userId: String(user.id) },
    subscription_data: {
      trial_period_days: 0,
      metadata: { userId: String(user.id) },
    },
    line_items: [
      {
        price: env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: env.STRIPE_SUCCESS_URL!,
    cancel_url: env.STRIPE_CANCEL_URL!,
  })

  if (!session.url) {
    throw new ValidationException('Unable to create Stripe checkout session')
  }

  return { url: session.url }
}

export async function createBillingPortalSessionForUser(userId: number) {
  assertStripeConfigured()
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) {
    throw new NotFoundException('User not found')
  }
  if (!user.stripeCustomerId) {
    throw new ValidationException('No Stripe customer found for user')
  }
  const stripe = getStripeClient()
  const returnUrl = env.STRIPE_BILLING_PORTAL_RETURN_URL || env.STRIPE_SUCCESS_URL
  if (!returnUrl) {
    throw new ValidationException('Billing portal return URL is not configured')
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  })
  if (!session.url) {
    throw new ValidationException('Unable to create billing portal session')
  }
  return { url: session.url }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  const userIdMetadata = session.metadata?.userId
  const explicitUserId = userIdMetadata ? Number(userIdMetadata) : null

  const user = await findUserByStripeIdentifiers(subscriptionId, customerId, explicitUserId)
  if (!user) {
    logger.warn({ msg: 'stripe_checkout_user_not_found', customerId, subscriptionId, explicitUserId })
    return
  }

  await applySubscriptionUpdate(user, {
    stripeCustomerId: customerId ?? undefined,
    stripeSubscriptionId: subscriptionId ?? undefined,
    status: 'active',
    cancelAtPeriodEnd: false,
  })
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  const subscriptionId = subscription.id
  const userIdMetadata = subscription.metadata?.userId
  const explicitUserId = userIdMetadata ? Number(userIdMetadata) : null

  const user = await findUserByStripeIdentifiers(subscriptionId, customerId, explicitUserId)
  if (!user) {
    logger.warn({ msg: 'stripe_subscription_user_not_found', customerId, subscriptionId })
    return
  }

  await applySubscriptionUpdate(user, {
    stripeCustomerId: customerId ?? undefined,
    stripeSubscriptionId: subscriptionId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    currentPeriodEnd: toDateFromUnix(subscription.current_period_end),
    trialEndsAt: subscription.trial_end ? toDateFromUnix(subscription.trial_end) : undefined,
  })
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription)
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      const user = await findUserByStripeIdentifiers(subscriptionId, customerId, null)
      if (!user) {
        logger.warn({ msg: 'stripe_invoice_user_not_found', subscriptionId, customerId })
        break
      }
      await applySubscriptionUpdate(user, {
        status: 'past_due',
        stripeSubscriptionId: subscriptionId ?? undefined,
        stripeCustomerId: customerId ?? undefined,
      })
      break
    }
    default: {
      logger.debug({ eventType: event.type }, 'Unhandled Stripe event')
    }
  }
}
