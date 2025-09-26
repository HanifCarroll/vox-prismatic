import { LoginRequestSchema, RegisterRequestSchema } from '@content/shared-types'
import { Hono } from 'hono'
import { loginRateLimit, registrationRateLimit } from '@/middleware/rate-limit'
import { validateRequest } from '@/middleware/validation'
import { ErrorCode, UnauthorizedException } from '@/utils/errors'
import { getUserById, loginUser, registerUser } from './auth'
import { authMiddleware } from './auth.middleware'
import { createSessionAndSetCookie, setCookie, deleteCookie, readSessionId } from './lucia'
import { env } from '@/config/env'
import { ValidationException } from '@/utils/errors'
import { db } from '@/db'
import { authKeys, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { generateState } from 'arctic'

// Validation schemas now sourced from shared package for FE/BE parity

// Create the auth routes
export const authRoutes = new Hono()

/**
 * POST /auth/register
 * Register a new user
 */
authRoutes.post(
  '/register',
  registrationRateLimit,
  validateRequest('json', RegisterRequestSchema),
  async (c) => {
    const data = c.req.valid('json')

    // Register the user
    const user = await registerUser(data)

    // Create session and set cookie
    await createSessionAndSetCookie(c, user.id)

    return c.json({ user }, 201)
  },
)

/**
 * POST /auth/login
 * Login with email and password
 */
authRoutes.post(
  '/login',
  loginRateLimit,
  validateRequest('json', LoginRequestSchema),
  async (c) => {
    const data = c.req.valid('json')

    // Authenticate the user
    const user = await loginUser(data)

    // Create session and set cookie
    await createSessionAndSetCookie(c, user.id)

    return c.json({ user })
  },
)

/**
 * GET /auth/me
 * Get current user information (session cookie required)
 */
authRoutes.get('/me', authMiddleware, async (c) => {
  const payload = c.get('user')
  const user = await getUserById(payload.userId)
  if (!user) {
    throw new UnauthorizedException('Authentication required', ErrorCode.UNAUTHORIZED)
  }
  return c.json({ user })
})

/**
 * POST /auth/logout
 * Invalidate current session
 */
authRoutes.post('/logout', async (c) => {
  // Attempt to invalidate current session
  try {
    const sessionId = readSessionId(c)
    if (sessionId) {
      const { authSessions } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const { db } = await import('@/db')
      await db.delete(authSessions).where(eq(authSessions.id, sessionId))
    }
  } catch {
    // best effort
  }
  c.header('Set-Cookie', 'auth_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax', {
    append: false,
  })
  return c.json({ ok: true })
})

/**
 * GET /auth/google
 * Starts Google OAuth flow
 */
authRoutes.get('/google', async (c) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    throw new ValidationException('Google OAuth is not configured')
  }
  const state = generateState()
  // Persist state in httpOnly cookie for callback verification
  setCookie(c, 'google_oauth_state', state, {
    Path: '/',
    SameSite: 'Lax',
    HttpOnly: true,
    Secure: env.NODE_ENV === 'production',
  })

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  })
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return Response.redirect(url, 302)
})

/**
 * GET /auth/google/callback
 * Handles Google OAuth callback
 */
authRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code') || undefined
  const state = c.req.query('state') || undefined
  const stateCookie = c.req.header('Cookie')?.match(/(?:^|;\s*)google_oauth_state=([^;]+)/)?.[1]
  if (!code || !state || !stateCookie || state !== decodeURIComponent(stateCookie)) {
    throw new ValidationException('Invalid OAuth state')
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new ValidationException('Google OAuth is not configured')
  }

  // Exchange code for tokens
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
  })
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!resp.ok) {
    throw new ValidationException('Failed to exchange code')
  }
  const tokenJson = (await resp.json()) as any
  const idToken = tokenJson.id_token as string | undefined
  const accessToken = tokenJson.access_token as string | undefined
  if (!idToken && !accessToken) {
    throw new ValidationException('Invalid token response from Google')
  }

  // Fetch user info (prefer userinfo endpoint for simplicity)
  const infoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!infoResp.ok) {
    throw new ValidationException('Failed to fetch Google user info')
  }
  const info = (await infoResp.json()) as any
  const sub = String(info.sub)
  const email = String(info.email || '')
  const name = String(info.name || info.given_name || 'Google User')

  const keyId = `google:${sub}`
  let userId: number | null = null

  const existingKey = await db.query.authKeys.findFirst({ where: eq(authKeys.id, keyId) })
  if (existingKey) {
    userId = existingKey.userId
  } else {
    // If no key, try find user by email
    const existingUser = email
      ? await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) })
      : null
    if (existingUser) {
      userId = existingUser.id
    } else {
      // Create new user without password (OAuth-only)
      const [created] = await db
        .insert(users)
        .values({ email: email || `google_${sub}@example.invalid`, name })
        .returning()
      userId = created.id
    }
    // Add google key
    await db.insert(authKeys).values({ id: keyId, userId, primaryKey: false })
  }

  // Clear state cookie
  deleteCookie(c, 'google_oauth_state')

  // Create session and set cookie
  await createSessionAndSetCookie(c, userId!)

  // Redirect to FE (projects)
  const base = env.CORS_ORIGIN || 'http://localhost:5173'
  return Response.redirect(`${base.replace(/\/$/, '')}/projects`, 302)
})
