import Stripe from 'stripe'
import { env } from '@/config/env'
import { ValidationException } from '@/utils/errors'

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ValidationException('Stripe is not configured')
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  }
  return stripeClient
}
