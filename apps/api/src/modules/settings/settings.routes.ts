import { UpdatePasswordRequestSchema, UpdateProfileRequestSchema, UpdateStyleRequestSchema, GetStyleResponseSchema } from '@content/shared-types'
import { Hono } from 'hono'
import { validateRequest } from '@/middleware/validation'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { getProfile, updatePassword, updateProfile, getStyleProfile, upsertStyleProfile } from './settings'

export const settingsRoutes = new Hono()

settingsRoutes.use('*', authMiddleware)

// GET profile
settingsRoutes.get('/profile', async (c) => {
  const user = c.get('user')
  const profile = await getProfile(user.userId)
  return c.json({ user: profile })
})

// PATCH profile (name/email)
settingsRoutes.patch('/profile', validateRequest('json', UpdateProfileRequestSchema), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')
  const updated = await updateProfile(user.userId, body)
  return c.json({ user: updated })
})

// PATCH password
settingsRoutes.patch(
  '/password',
  validateRequest('json', UpdatePasswordRequestSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    const updated = await updatePassword(user.userId, body)
    return c.json({ user: updated })
  },
)

// Style profile
settingsRoutes.get('/style', async (c) => {
  const user = c.get('user')
  const style = await getStyleProfile(user.userId)
  return c.json({ style })
})

settingsRoutes.put('/style', validateRequest('json', UpdateStyleRequestSchema), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')
  const style = await upsertStyleProfile(user.userId, body)
  return c.json({ style })
})
