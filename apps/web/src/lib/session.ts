import type { User } from '@/auth/AuthContext'
import { authMe } from '@/api/auth/auth'

type SessionResult = { user: User }

let cache: { expiresAt: number; promise: Promise<SessionResult> | null } = {
  expiresAt: 0,
  promise: null,
}

const DEFAULT_TTL_MS = 10_000

export async function getSession(ttlMs: number = DEFAULT_TTL_MS, cookieHeader?: string): Promise<SessionResult> {
  // On the server (or when a cookie header is provided), do a direct, uncached lookup
  if (typeof window === 'undefined' || cookieHeader) {
    // Note: authMe doesn't support passing headers directly in the current Orval setup
    // We rely on the orval-fetcher to handle cookies from server context
    return authMe()
  }

  const now = Date.now()
  if (!cache.promise || now >= cache.expiresAt) {
    cache.expiresAt = now + Math.max(0, ttlMs)
    cache.promise = authMe()
  }
  return cache.promise
}

export function invalidateSessionCache() {
  cache = { expiresAt: 0, promise: null }
}
