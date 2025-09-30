import { Hono } from 'hono'

import { authMiddleware } from '@/modules/auth/auth.middleware'
import { supabaseService } from '@/services/supabase'
import { env } from '@/config/env'
import { ValidationException } from '@/utils/errors'
import { logger } from '@/utils/logger'

import {
  createBillingPortalSessionForUser,
  createCheckoutSessionForUser,
  handleStripeWebhookEvent,
} from './billing.service'
import { getStripeClient } from './stripe'

export const billingRoutes = new Hono()

billingRoutes.use('*', authMiddleware)

billingRoutes.post('/checkout-session', async (c) => {
  const payload = c.get('user')
  const session = await createCheckoutSessionForUser(payload.userId, { email: payload.email, name: payload.name || '' })
  return c.json(session)
})

billingRoutes.post('/portal-session', async (c) => {
  const payload = c.get('user')
  const session = await createBillingPortalSessionForUser(payload.userId)
  return c.json(session)
})

billingRoutes.get('/status', async (c) => {
  const payload = c.get('user')
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('*')
    .eq('id', payload.userId)
    .single()
  if (!profile) throw new ValidationException('User not found')
  const result = {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    createdAt: (profile as any).created_at ?? undefined,
    isAdmin: !!(profile as any).is_admin,
    stripeCustomerId: (profile as any).stripe_customer_id ?? null,
    stripeSubscriptionId: (profile as any).stripe_subscription_id ?? null,
    subscriptionStatus: (profile as any).subscription_status ?? 'inactive',
    subscriptionPlan: (profile as any).subscription_plan ?? 'pro',
    subscriptionCurrentPeriodEnd: (profile as any).subscription_current_period_end ?? null,
    cancelAtPeriodEnd: !!(profile as any).cancel_at_period_end,
    trialEndsAt: (profile as any).trial_ends_at ?? null,
    trialNotes: (profile as any).trial_notes ?? null,
  }
  return c.json({ user: result })
})

export const stripeWebhookRoute = new Hono()

stripeWebhookRoute.post('/webhook', async (c) => {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    logger.warn({ msg: 'stripe_webhook_unconfigured' })
    return c.json({ error: 'Stripe webhook not configured' }, 503)
  }

  const signature = c.req.header('stripe-signature')
  if (!signature) {
    return c.json({ error: 'Missing Stripe signature' }, 400)
  }

  const rawBody = await c.req.arrayBuffer()
  let event
  try {
    const stripe = getStripeClient()
    event = await stripe.webhooks.constructEventAsync(
      Buffer.from(rawBody),
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (error) {
    logger.warn({ msg: 'stripe_webhook_signature_invalid', error })
    return c.json({ error: 'Invalid signature' }, 400)
  }

  try {
    await handleStripeWebhookEvent(event)
  } catch (error) {
    logger.error({ msg: 'stripe_webhook_processing_failed', error, eventType: event.type })
    return c.json({ received: false }, 500)
  }

  return c.json({ received: true })
})
