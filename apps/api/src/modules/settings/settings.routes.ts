import { UpdatePasswordRequestSchema, UpdateProfileRequestSchema, UpdateStyleRequestSchema, GetStyleResponseSchema } from '@content/shared-types'
import { Hono } from 'hono'
import { validateRequest } from '@/middleware/validation'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { extractSupabaseToken, createUserClient } from '@/services/supabase'
import { supabaseService } from '@/services/supabase'

export const settingsRoutes = new Hono()

settingsRoutes.use('*', authMiddleware)

// GET profile
settingsRoutes.get('/profile', async (c) => {
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

// PATCH profile (name/email)
settingsRoutes.patch('/profile', validateRequest('json', UpdateProfileRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const payload = c.get('user')
  const body = c.req.valid('json')
  if (typeof body.name !== 'undefined') {
    await userClient.from('profiles').update({ name: body.name }).eq('id', payload.userId)
  }
  if (typeof body.email !== 'undefined') {
    // Triggers email confirmation per Supabase settings
    await userClient.auth.updateUser({ email: body.email })
  }
  const { data: profile } = await supabaseService.from('profiles').select('*').eq('id', payload.userId).single()
  const result = {
    id: payload.userId,
    email: body.email || payload.email,
    name: body.name || payload.name,
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

// PATCH password
settingsRoutes.patch('/password', validateRequest('json', UpdatePasswordRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const payload = c.get('user')
  const body = c.req.valid('json')
  await userClient.auth.updateUser({ password: body.newPassword })
  const { data: profile } = await supabaseService.from('profiles').select('*').eq('id', payload.userId).single()
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

// Style profile
settingsRoutes.get('/style', async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ style: null })
  const userClient = createUserClient(token)
  const payload = c.get('user')
  const { data } = await userClient.from('user_style_profiles').select('style').eq('user_id', payload.userId).single()
  return c.json({ style: (data as any)?.style ?? null })
})

settingsRoutes.put('/style', validateRequest('json', UpdateStyleRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const payload = c.get('user')
  const body = c.req.valid('json')
  // Basic sanitization (re-using FE limits is sufficient here)
  const { data: existing } = await userClient
    .from('user_style_profiles')
    .select('user_id')
    .eq('user_id', payload.userId)
    .single()
  if (existing) {
    const { data } = await userClient
      .from('user_style_profiles')
      .update({ style: body as any, updated_at: new Date().toISOString() })
      .eq('user_id', payload.userId)
      .select('style')
      .single()
    return c.json({ style: (data as any)?.style ?? body })
  }
  const { data } = await userClient
    .from('user_style_profiles')
    .insert({ user_id: payload.userId, style: body as any })
    .select('style')
    .single()
  return c.json({ style: (data as any)?.style ?? body })
})
