import type { Context, Next } from 'hono'
import { ErrorCode, UnauthorizedException } from '@/utils/errors'
import { createUserClient, extractSupabaseToken, supabaseService } from '@/services/supabase'

// Extend Hono's context type to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      userId: string
      email: string
      name?: string
      isAdmin: boolean
      subscriptionStatus: string
      subscriptionPlan: string
      subscriptionCurrentPeriodEnd: Date | null
      cancelAtPeriodEnd: boolean
      trialEndsAt: Date | null
    }
  }
}

/**
 * Authentication middleware for protecting routes
 * Validates session cookie and adds user payload to context
 */
export async function authMiddleware(c: Context, next: Next): Promise<void> {
  const token = extractSupabaseToken(c)
  if (!token) {
    throw new UnauthorizedException('Authentication required', ErrorCode.UNAUTHORIZED)
  }

  const userClient = createUserClient(token)
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData?.user) {
    throw new UnauthorizedException('Invalid token', ErrorCode.UNAUTHORIZED)
  }

  const supabaseId = authData.user.id
  const email = authData.user.email?.toLowerCase() || ''
  const name = (authData.user.user_metadata?.name as string | undefined) || email.split('@')[0] || 'User'

  // Ensure profile exists (service role bypasses RLS to provision on first login)
  const { data: profile, error: profErr } = await supabaseService
    .from('profiles')
    .select('*')
    .eq('id', supabaseId)
    .single()
  if (profErr && profErr.code !== 'PGRST116') {
    throw new UnauthorizedException('Profile lookup failed')
  }
  if (!profile) {
    const { error: insErr } = await supabaseService.from('profiles').insert({ id: supabaseId, name })
    if (insErr) {
      throw new UnauthorizedException('Failed to create profile')
    }
  }

  const payload = {
    userId: supabaseId,
    email,
    name,
    isAdmin: !!profile?.is_admin,
    subscriptionStatus: profile?.subscription_status ?? 'inactive',
    subscriptionPlan: profile?.subscription_plan ?? 'pro',
    subscriptionCurrentPeriodEnd: profile?.subscription_current_period_end ?? null,
    cancelAtPeriodEnd: !!profile?.cancel_at_period_end,
    trialEndsAt: profile?.trial_ends_at ?? null,
  }
  c.set('user', payload)

  await next()
}
