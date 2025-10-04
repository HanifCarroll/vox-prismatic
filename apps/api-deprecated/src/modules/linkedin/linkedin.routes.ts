import { Hono } from 'hono'
import { env } from '@/config/env'
import { apiRateLimit } from '@/middleware/rate-limit'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import {
  createLinkedInAuthUrl,
  disconnectLinkedIn,
  getLinkedInStatus,
  handleLinkedInCallback,
} from './linkedin'

export const linkedinRoutes = new Hono()

// Start OAuth — returns a URL to redirect the user to
// Require auth for initiating OAuth
linkedinRoutes.get('/auth', authMiddleware, apiRateLimit, async (c) => {
  const user = c.get('user')
  const { url } = await createLinkedInAuthUrl(user.userId)
  return c.json({ url })
})

// OAuth callback — expects code + state; stores token
// No auth required; the signed state binds the user securely
linkedinRoutes.get('/callback', apiRateLimit, async (c) => {
  const code = c.req.query('code') || undefined
  const state = c.req.query('state') || undefined
  try {
    const result = await handleLinkedInCallback({ code, state })

    // Redirect to FE if configured, fallback to JSON
    const feUrl = env.LINKEDIN_FE_REDIRECT_URL || null
    if (feUrl) {
      const url = new URL(feUrl)
      url.searchParams.set('status', 'connected')
      return Response.redirect(url.toString(), 302)
    }
    return c.json(result)
  } catch (err: any) {
    const feUrl = env.LINKEDIN_FE_REDIRECT_URL || null
    if (feUrl) {
      const url = new URL(feUrl)
      url.searchParams.set('status', 'error')
      if (env.NODE_ENV === 'development' && err?.message) {
        url.searchParams.set('message', String(err.message))
      }
      return Response.redirect(url.toString(), 302)
    }
    throw err
  }
})

// Connection status
linkedinRoutes.get('/status', authMiddleware, async (c) => {
  const user = c.get('user')
  const result = await getLinkedInStatus(user.userId)
  return c.json(result)
})

// Disconnect (revoke locally)
linkedinRoutes.post('/disconnect', authMiddleware, apiRateLimit, async (c) => {
  const user = c.get('user')
  const result = await disconnectLinkedIn(user.userId)
  return c.json(result)
})
