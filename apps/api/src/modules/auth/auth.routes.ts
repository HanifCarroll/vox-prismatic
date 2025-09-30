import { Hono } from 'hono'
import { UnauthorizedException } from '@/utils/errors'
import { authMiddleware } from './auth.middleware'
import { supabaseService } from '@/services/supabase'

// Validation schemas now sourced from shared package for FE/BE parity

// Create the auth routes
export const authRoutes = new Hono()

/**
 * GET /auth/me
 * Get current user information (session cookie required)
 */
authRoutes.get('/me', authMiddleware, async (c) => {
  const payload = c.get('user')
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('*')
    .eq('id', payload.userId)
    .single()
  const result = {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    createdAt: profile?.created_at ?? undefined,
    isAdmin: !!profile?.is_admin,
    stripeCustomerId: profile?.stripe_customer_id ?? null,
    stripeSubscriptionId: profile?.stripe_subscription_id ?? null,
    subscriptionStatus: profile?.subscription_status ?? 'inactive',
    subscriptionPlan: profile?.subscription_plan ?? 'pro',
    subscriptionCurrentPeriodEnd: profile?.subscription_current_period_end ?? null,
    cancelAtPeriodEnd: !!profile?.cancel_at_period_end,
    trialEndsAt: profile?.trial_ends_at ?? null,
    trialNotes: profile?.trial_notes ?? null,
  }
  return c.json({ user: result })
})

/**
 * POST /auth/logout
 * No-op for Supabase—client signs itself out; this exists for API compatibility
 */
authRoutes.post('/logout', async (c) => {
  return c.json({ ok: true })
})
