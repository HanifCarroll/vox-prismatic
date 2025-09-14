import { Hono } from 'hono'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { apiRateLimit } from '@/middleware/rate-limit'
import { createLinkedInAuthUrl, disconnectLinkedIn, getLinkedInStatus, handleLinkedInCallback } from './linkedin'

export const linkedinRoutes = new Hono()

// Require auth for initiating, status, disconnect
linkedinRoutes.use('*', authMiddleware)

// Start OAuth — returns a URL to redirect the user to
linkedinRoutes.get('/auth', apiRateLimit, async (c) => {
  const user = c.get('user')
  const { url } = await createLinkedInAuthUrl(user.userId)
  return c.json({ url })
})

// OAuth callback — expects code + state; stores token
// Note: For simplicity, we keep auth requirement here; state binds the user securely
linkedinRoutes.get('/callback', apiRateLimit, async (c) => {
  const code = c.req.query('code') || undefined
  const state = c.req.query('state') || undefined
  const result = await handleLinkedInCallback({ code, state })
  return c.json(result)
})

// Connection status
linkedinRoutes.get('/status', async (c) => {
  const user = c.get('user')
  const result = await getLinkedInStatus(user.userId)
  return c.json(result)
})

// Disconnect (revoke locally)
linkedinRoutes.post('/disconnect', apiRateLimit, async (c) => {
  const user = c.get('user')
  const result = await disconnectLinkedIn(user.userId)
  return c.json(result)
})

