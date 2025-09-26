import { Hono } from 'hono'

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { mapUser } from '@/modules/auth'
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
  const user = c.get('user')
  const session = await createCheckoutSessionForUser(user.userId)
  return c.json(session)
})

billingRoutes.post('/portal-session', async (c) => {
  const user = c.get('user')
  const session = await createBillingPortalSessionForUser(user.userId)
  return c.json(session)
})

billingRoutes.get('/status', async (c) => {
  const user = c.get('user')
  const record = await db.query.users.findFirst({ where: eq(users.id, user.userId) })
  if (!record) {
    throw new ValidationException('User not found')
  }
  return c.json({ user: mapUser(record) })
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
