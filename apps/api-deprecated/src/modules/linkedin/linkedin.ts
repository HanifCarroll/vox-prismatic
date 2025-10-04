import { decodeJwt, jwtVerify, SignJWT } from 'jose'
import { env } from '@/config/env'
import { supabaseService } from '@/services/supabase'
import { NotFoundException, UnauthorizedException, ValidationException } from '@/utils/errors'

const STATE_TTL = '10m'
const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET)

export async function createLinkedInAuthUrl(userId: string) {
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
    // Use OIDC scopes + share: works with your configured products
    scope: 'openid profile email w_member_social',
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
  let userId: string
  try {
    const { payload } = await jwtVerify(state, JWT_SECRET)
    if (payload.provider !== 'linkedin' || typeof payload.userId !== 'string') {
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

  // Ensure profile exists
  const { data: profile } = await supabaseService.from('profiles').select('id').eq('id', userId).single()
  if (!profile) throw new NotFoundException('User not found')

  // Determine member id (person id) for author URN
  // Prefer id_token 'sub' (OIDC). Fallback to /userinfo.
  let memberId: string | undefined
  const idToken = json.id_token as string | undefined
  if (idToken) {
    try {
      const decoded: any = decodeJwt(idToken)
      if (decoded && typeof decoded.sub === 'string') {
        memberId = decoded.sub
      }
    } catch {
      // ignore and fallback to userinfo
    }
  }
  if (!memberId) {
    const infoResp = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!infoResp.ok) {
      throw new ValidationException('Failed to fetch LinkedIn user info')
    }
    const info = (await infoResp.json()) as any
    memberId = info.sub as string | undefined
  }

  await supabaseService
    .from('profiles')
    .update({ linkedin_token: accessToken, linkedin_id: memberId || null, linkedin_connected_at: new Date().toISOString() })
    .eq('id', userId)

  return { connected: true }
}

export async function getLinkedInStatus(userId: string) {
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('linkedin_token')
    .eq('id', userId)
    .single()
  if (!profile) throw new NotFoundException('User not found')
  return { connected: Boolean((profile as any).linkedin_token) }
}

export async function disconnectLinkedIn(userId: string) {
  const { data: profile } = await supabaseService.from('profiles').select('id').eq('id', userId).single()
  if (!profile) throw new NotFoundException('User not found')
  await supabaseService
    .from('profiles')
    .update({ linkedin_token: null, linkedin_id: null })
    .eq('id', userId)
  return { connected: false }
}
