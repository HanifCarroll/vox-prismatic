import { supabaseService } from '@/services/supabase'
import { NotFoundException } from '@/utils/errors'

export async function listUsageSummaries(params: { from?: Date; to?: Date }) {
  // Load profiles
  const { data: profiles } = await supabaseService
    .from('profiles')
    .select(
      'id, name, stripe_customer_id, subscription_status, subscription_plan, subscription_current_period_end, cancel_at_period_end, trial_ends_at, trial_notes',
    )
  const byUser: Record<string, any> = {}
  for (const p of profiles || []) {
    byUser[(p as any).id] = {
      userId: (p as any).id,
      email: '',
      name: (p as any).name || '',
      totalCostUsd: 0,
      totalActions: 0,
      lastActionAt: null as Date | null,
      subscriptionStatus: (p as any).subscription_status,
      subscriptionPlan: (p as any).subscription_plan,
      subscriptionCurrentPeriodEnd: (p as any).subscription_current_period_end ?? null,
      cancelAtPeriodEnd: !!(p as any).cancel_at_period_end,
      trialEndsAt: (p as any).trial_ends_at ?? null,
      stripeCustomerId: (p as any).stripe_customer_id ?? null,
      trialNotes: (p as any).trial_notes ?? null,
    }
  }
  // Enrich with emails from auth.users via Admin API
  const ids = Object.keys(byUser)
  for (const id of ids) {
    try {
      const { data } = await supabaseService.auth.admin.getUserById(id)
      const email = data?.user?.email || ''
      if (email) byUser[id].email = email
    } catch {}
  }
  // Load usage events within range
  let qb = supabaseService.from('ai_usage_events').select('user_id, cost_usd, created_at')
  if (params.from) qb = qb.gte('created_at', params.from.toISOString())
  if (params.to) qb = qb.lte('created_at', params.to.toISOString())
  const { data: events } = await qb
  for (const e of events || []) {
    const uid = (e as any).user_id as string | null
    if (!uid) continue
    const row = byUser[uid] || (byUser[uid] = { userId: uid, email: '', name: '', totalCostUsd: 0, totalActions: 0, lastActionAt: null })
    row.totalCostUsd += Number((e as any).cost_usd || 0)
    row.totalActions += 1
    const t = new Date((e as any).created_at)
    if (!row.lastActionAt || t > row.lastActionAt) row.lastActionAt = t
  }
  // Simple name ordering
  return Object.values(byUser).sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)))
}

export async function updateUserTrial(
  userId: string,
  params: { trialEndsAt: Date | null; trialNotes?: string | null },
) {
  const { data: user } = await supabaseService
    .from('profiles')
    .select('id, subscription_status, stripe_subscription_id')
    .eq('id', userId)
    .single()
  if (!user) throw new NotFoundException('User not found')
  const now = new Date()
  const sanitizedNotes = params.trialNotes ? params.trialNotes.trim().slice(0, 500) : null
  const hasActiveSubscription = !!(user as any).stripe_subscription_id && (user as any).subscription_status === 'active'
  const trialInFuture = params.trialEndsAt ? params.trialEndsAt.getTime() > now.getTime() : false
  let nextStatus: string | undefined
  if (!hasActiveSubscription) {
    if (trialInFuture) nextStatus = 'trialing'
    else if (!(params.trialEndsAt) && (user as any).subscription_status === 'trialing') nextStatus = 'inactive'
    else if (params.trialEndsAt && params.trialEndsAt.getTime() <= now.getTime() && (user as any).subscription_status === 'trialing') nextStatus = 'inactive'
  }
  const updatePayload: any = { trial_ends_at: params.trialEndsAt ? params.trialEndsAt.toISOString() : null, trial_notes: sanitizedNotes, updated_at: now.toISOString() }
  if (nextStatus) updatePayload.subscription_status = nextStatus
  const { data: updated } = await supabaseService.from('profiles').update(updatePayload).eq('id', userId).select('*').single()
  return updated
}
