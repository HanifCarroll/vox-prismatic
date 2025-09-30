import {
  ListTimeslotsResponseSchema,
  PreferredTimeslotSchema,
  SchedulingPreferencesSchema,
  UpdateSchedulingPreferencesRequestSchema,
  UpdateTimeslotsRequestSchema,
} from '@content/shared-types'
import { Hono } from 'hono'
import { validateRequest } from '@/middleware/validation'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { createUserClient, extractSupabaseToken } from '@/services/supabase'

export const schedulingRoutes = new Hono()

schedulingRoutes.use('*', authMiddleware)

// Preferences
schedulingRoutes.get('/preferences', async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ preferences: { timezone: 'UTC', leadTimeMinutes: 30 } })
  const userClient = createUserClient(token)
  const user = c.get('user')
  const { data } = await userClient.from('user_schedule_preferences').select('timezone, lead_time_minutes').eq('user_id', user.userId).single()
  const tz = (data as any)?.timezone || 'UTC'
  const lead = Number((data as any)?.lead_time_minutes || 30)
  return c.json({ preferences: { timezone: tz, leadTimeMinutes: lead } })
})

schedulingRoutes.put(
  '/preferences',
  validateRequest('json', UpdateSchedulingPreferencesRequestSchema),
  async (c) => {
    const token = extractSupabaseToken(c)
    if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
    const userClient = createUserClient(token)
    const user = c.get('user')
    const { timezone, leadTimeMinutes } = c.req.valid('json')
    const { data } = await userClient
      .from('user_schedule_preferences')
      .upsert({ user_id: user.userId, timezone, lead_time_minutes: leadTimeMinutes }, { onConflict: 'user_id' })
      .select('timezone, lead_time_minutes')
      .single()
    return c.json({ preferences: { timezone: (data as any)?.timezone || timezone, leadTimeMinutes: Number((data as any)?.lead_time_minutes ?? leadTimeMinutes) } })
  },
)

// Timeslots (active only by default)
schedulingRoutes.get('/slots', async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ items: [] })
  const userClient = createUserClient(token)
  const user = c.get('user')
  const { data } = await userClient
    .from('user_preferred_timeslots')
    .select('iso_day_of_week, minutes_from_midnight, active')
    .eq('user_id', user.userId)
    .eq('active', true)
    .order('iso_day_of_week')
    .order('minutes_from_midnight')
  const items = (data || []).map((r: any) => ({
    isoDayOfWeek: Number(r.iso_day_of_week),
    time: `${String(Math.floor(r.minutes_from_midnight / 60)).padStart(2, '0')}:${String(r.minutes_from_midnight % 60).padStart(2, '0')}`,
    active: !!r.active,
  }))
  return c.json({ items })
})

schedulingRoutes.put('/slots', validateRequest('json', UpdateTimeslotsRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const user = c.get('user')
  const { items } = c.req.valid('json')
  // Replace strategy: delete and insert
  await userClient.from('user_preferred_timeslots').delete().eq('user_id', user.userId)
  const rows = items.map((it: any) => {
    const [hh, mm] = String(it.time).split(':').map((n: string) => Number(n))
    const minutes = (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0)
    return { user_id: user.userId, iso_day_of_week: it.isoDayOfWeek, minutes_from_midnight: minutes, active: !!it.active }
  })
  await userClient.from('user_preferred_timeslots').insert(rows)
  return c.json({ items })
})
