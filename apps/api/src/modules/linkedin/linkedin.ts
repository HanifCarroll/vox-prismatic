import { SignJWT, jwtVerify } from 'jose'
import { db } from '@/db'
import { users } from '@/db/schema'
import { env } from '@/config/env'
import { eq } from 'drizzle-orm'
import { NotFoundException, UnauthorizedException, ValidationException } from '@/utils/errors'

const STATE_TTL = '10m'
const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET)

export async function createLinkedInAuthUrl(userId: number) {
  if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_REDIRECT_URI) {
    throw new ValidationException('LinkedIn OAuth is not configured')
  }

  // Encode state to bind callback to a user securely
  const state = await new SignJWT({ userId, provider: 'linkedin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(STATE_TTL)
    .sign(JWT_SECRET)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.LINKEDIN_CLIENT_ID,
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
    state,
    scope: 'r_liteprofile r_emailaddress w_member_social offline_access',
  })

  const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  return { url }
}

export async function handleLinkedInCallback(query: { code?: string; state?: string }) {
  const { code, state } = query
  if (!code || !state) {
    throw new ValidationException('Missing code or state')
  }

  // Verify state
  let userId: number
  try {
    const { payload } = await jwtVerify(state, JWT_SECRET)
    if (payload.provider !== 'linkedin' || typeof payload.userId !== 'number') {
      throw new UnauthorizedException('Invalid state')
    }
    userId = payload.userId
  } catch {
    throw new UnauthorizedException('Invalid state')
  }

  if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET || !env.LINKEDIN_REDIRECT_URI) {
    throw new ValidationException('LinkedIn OAuth is not configured')
  }

  // Exchange code for access token
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
    client_id: env.LINKEDIN_CLIENT_ID,
    client_secret: env.LINKEDIN_CLIENT_SECRET,
  })

  const resp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!resp.ok) {
    throw new ValidationException('Failed to exchange code for access token')
  }
  const json = (await resp.json()) as any
  const accessToken = json.access_token as string | undefined
  if (!accessToken) {
    throw new ValidationException('Invalid token response from LinkedIn')
  }

  // Persist token for user
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new NotFoundException('User not found')

  // Fetch member id for author URN
  const meResp = await fetch('https://api.linkedin.com/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!meResp.ok) {
    throw new ValidationException('Failed to fetch LinkedIn profile')
  }
  const me = (await meResp.json()) as any
  const memberId = me.id as string | undefined
  
  await db
    .update(users)
    .set({ linkedinToken: accessToken, linkedinId: memberId || null, updatedAt: new Date() })
    .where(eq(users.id, userId))

  return { connected: true }
}

export async function getLinkedInStatus(userId: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new NotFoundException('User not found')
  return { connected: Boolean(user.linkedinToken) }
}

export async function disconnectLinkedIn(userId: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new NotFoundException('User not found')
  await db.update(users).set({ linkedinToken: null, updatedAt: new Date() }).where(eq(users.id, userId))
  return { connected: false }
}
