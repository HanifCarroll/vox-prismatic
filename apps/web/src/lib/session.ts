import type { User } from '@/auth/AuthContext'

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
    cache.promise = new Promise<SessionResult>((resolve, reject) => {
      const user = readLocalUser()
      if (user) {
        resolve({ user })
      } else {
        // Throw an ApiError-like object so callers can consistently redirect
        reject({ status: 401, code: 'UNAUTHENTICATED', error: 'Not authenticated' })
      }
    })
  }
  return cache.promise
}

export function invalidateSessionCache() {
  cache = { expiresAt: 0, promise: null }
}
