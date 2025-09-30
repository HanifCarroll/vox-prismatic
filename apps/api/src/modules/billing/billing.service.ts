import type Stripe from 'stripe'
import { env } from '@/config/env'
import { NotFoundException, ValidationException } from '@/utils/errors'
import { logger } from '@/utils/logger'
import { supabaseService } from '@/services/supabase'
import { getStripeClient } from './stripe'

function assertStripeConfigured() {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID || !env.STRIPE_SUCCESS_URL || !env.STRIPE_CANCEL_URL) {
    throw new ValidationException('Stripe billing is not fully configured')
  }
}

async function ensureStripeCustomer(user: { id: string; email: string; name: string }): Promise<string> {
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()
  const existing = (profile as any)?.stripe_customer_id as string | undefined
  if (existing) return existing
  const stripe = getStripeClient()
  const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } })
  await supabaseService.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', user.id)
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
  explicitUserId?: string | null,
) {
  if (explicitUserId) {
    const { data } = await supabaseService.from('profiles').select('*').eq('id', explicitUserId).single()
    if (data) return data
  }
  if (subscriptionId) {
    const { data } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single()
    if (data) return data
  }
  if (customerId) {
    const { data } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single()
    if (data) return data
  }
  return null
}

async function applySubscriptionUpdate(
  user: any,
  update: {
    stripeCustomerId?: string | null
    stripeSubscriptionId?: string | null
    status?: string | null
    currentPeriodEnd?: Date | null
    cancelAtPeriodEnd?: boolean | null
    trialEndsAt?: Date | null | undefined
  },
) {
  const payload: any = {}
  if (typeof update.stripeCustomerId === 'string') payload.stripe_customer_id = update.stripeCustomerId
  if (typeof update.stripeSubscriptionId === 'string') payload.stripe_subscription_id = update.stripeSubscriptionId
  if (typeof update.status === 'string') payload.subscription_status = update.status
  if (typeof update.cancelAtPeriodEnd === 'boolean') payload.cancel_at_period_end = update.cancelAtPeriodEnd
  if (update.currentPeriodEnd !== undefined) payload.subscription_current_period_end = update.currentPeriodEnd ?? null
  if (update.trialEndsAt !== undefined) payload.trial_ends_at = update.trialEndsAt
  if (update.status === 'active') payload.trial_ends_at = null
  if (typeof update.stripeSubscriptionId === 'string' || typeof update.status === 'string') payload.subscription_plan = 'pro'
  if (Object.keys(payload).length > 0) await supabaseService.from('profiles').update(payload).eq('id', (user as any).id)
}

export async function createCheckoutSessionForUser(userId: string, opts: { email: string; name: string }) {
  assertStripeConfigured()
  const stripe = getStripeClient()
  const customerId = await ensureStripeCustomer({ id: userId, email: opts.email, name: opts.name })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    billing_address_collection: 'required',
    allow_promotion_codes: false,
    metadata: { userId },
    subscription_data: {
      trial_period_days: 0,
      metadata: { userId },
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

export async function createBillingPortalSessionForUser(userId: string) {
  assertStripeConfigured()
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()
  if (!(profile as any)?.stripe_customer_id) {
    throw new ValidationException('No Stripe customer found for user')
  }
  const stripe = getStripeClient()
  const returnUrl = env.STRIPE_BILLING_PORTAL_RETURN_URL || env.STRIPE_SUCCESS_URL
  if (!returnUrl) {
    throw new ValidationException('Billing portal return URL is not configured')
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: (profile as any).stripe_customer_id as string,
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
  const userIdMetadata = session.metadata?.userId as string | undefined
  const explicitUserId = userIdMetadata ?? null

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
  const userIdMetadata = subscription.metadata?.userId as string | undefined
  const explicitUserId = userIdMetadata ?? null

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
