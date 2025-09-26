import { z } from 'zod'
import { UserSchema } from '@content/shared-types'

import { fetchJson, parseWith } from './base'

const SessionResponseSchema = z.object({ url: z.string().url() })
const BillingStatusResponseSchema = z.object({ user: UserSchema })

export async function createCheckoutSession() {
  const data = await fetchJson('/api/billing/checkout-session', { method: 'POST' })
  return parseWith(SessionResponseSchema, data)
}

export async function createPortalSession() {
  const data = await fetchJson('/api/billing/portal-session', { method: 'POST' })
  return parseWith(SessionResponseSchema, data)
}

export async function getBillingStatus() {
  const data = await fetchJson('/api/billing/status', { method: 'GET' })
  return parseWith(BillingStatusResponseSchema, data)
}
