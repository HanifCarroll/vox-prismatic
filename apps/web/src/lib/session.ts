import type { User } from '@/auth/AuthContext'
import { authMe } from '@/api/auth/auth'

type SessionResult = { user: User }

let cache: { expiresAt: number; promise: Promise<SessionResult> | null } = {
  expiresAt: 0,
  promise: null,
}

const DEFAULT_TTL_MS = 10_000

function readLocalUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('auth:user')
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    // Minimal shape check to avoid tight coupling to Zod or generated types
    if (
      parsed &&
      typeof parsed === 'object' &&
      'id' in parsed &&
      'email' in parsed &&
      'name' in parsed
    ) {
      return parsed as User
    }
    return null
  } catch {
    return null
  }
}

export async function getSession(ttlMs: number = DEFAULT_TTL_MS, _cookieHeader?: string): Promise<SessionResult> {
  // Enforce client-only checks to avoid SSR cookie/domain issues
  if (typeof window === 'undefined') {
    throw new Error('SESSION_CHECK_CLIENT_ONLY')
  }

  const now = Date.now()
  if (!cache.promise || now >= cache.expiresAt) {
    cache.expiresAt = now + Math.max(0, ttlMs)
    cache.promise = (async () => {
      // First check localStorage for a quick initial check
      const localUser = readLocalUser()
      if (!localUser) {
        // No local user, definitely not authenticated
        throw { status: 401, code: 'UNAUTHENTICATED', error: 'Not authenticated' }
      }

      // Verify with backend that the session is still valid
      try {
        const response = await authMe()
        // Update localStorage with fresh user data from backend
        window.localStorage.setItem('auth:user', JSON.stringify(response.user))
        return { user: response.user }
      } catch (error) {
        // Backend session is invalid, clear localStorage
        window.localStorage.removeItem('auth:user')
        // Throw an ApiError-like object so callers can consistently redirect
        throw { status: 401, code: 'UNAUTHENTICATED', error: 'Not authenticated' }
      }
    })()
  }
  return cache.promise
}

export function invalidateSessionCache() {
  cache = { expiresAt: 0, promise: null }
}
