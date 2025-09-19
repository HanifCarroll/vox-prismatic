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
import {
  getPreferencesForUser,
  listActiveTimeslotsForUser,
  replaceTimeslotsForUser,
  upsertPreferencesForUser,
} from './scheduling'

export const schedulingRoutes = new Hono()

schedulingRoutes.use('*', authMiddleware)

// Preferences
schedulingRoutes.get('/preferences', async (c) => {
  const user = c.get('user')
  const pref = await getPreferencesForUser(user.userId)
  return c.json({ preferences: { timezone: pref.timezone, leadTimeMinutes: pref.leadTimeMinutes } })
})

schedulingRoutes.put(
  '/preferences',
  validateRequest('json', UpdateSchedulingPreferencesRequestSchema),
  async (c) => {
    const user = c.get('user')
    const { timezone, leadTimeMinutes } = c.req.valid('json')
    const pref = await upsertPreferencesForUser({
      userId: user.userId,
      timezone,
      leadTimeMinutes,
    })
    return c.json({ preferences: { timezone: pref.timezone, leadTimeMinutes: pref.leadTimeMinutes } })
  },
)

// Timeslots (active only by default)
schedulingRoutes.get('/slots', async (c) => {
  const user = c.get('user')
  const items = await listActiveTimeslotsForUser(user.userId)
  return c.json({ items })
})

schedulingRoutes.put('/slots', validateRequest('json', UpdateTimeslotsRequestSchema), async (c) => {
  const user = c.get('user')
  const { items } = c.req.valid('json')
  const updated = await replaceTimeslotsForUser({ userId: user.userId, items })
  return c.json({ items: updated })
})

