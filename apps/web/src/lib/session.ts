import type { User } from '@content/shared-types'
import { me } from '@/lib/client/auth'
import { supabase } from '@/lib/supabase'

type SessionResult = { user: User }

let cache: { expiresAt: number; promise: Promise<SessionResult> | null } = {
  expiresAt: 0,
  promise: null,
}

const DEFAULT_TTL_MS = 10_000

export async function getSession(ttlMs: number = DEFAULT_TTL_MS, cookieHeader?: string): Promise<SessionResult> {
  // On the server (or when a cookie header is provided), do a direct, uncached lookup
  if (typeof window === 'undefined' || cookieHeader) {
    const headers: HeadersInit | undefined = cookieHeader ? { cookie: cookieHeader } : undefined
    return me({ headers })
  }

  // In the browser, avoid calling the API if there is clearly no auth session yet
  try {
    const { data } = await supabase.auth.getSession()
    if (!data.session?.access_token) {
      throw new Error('UNAUTHENTICATED')
    }
  } catch (e) {
    // Propagate to allow guards to redirect without hitting the API
    throw e
  }

  const now = Date.now()
  if (!cache.promise || now >= cache.expiresAt) {
    cache.expiresAt = now + Math.max(0, ttlMs)
    cache.promise = me()
  }
  return cache.promise
}

export function invalidateSessionCache() {
  cache = { expiresAt: 0, promise: null }
}
