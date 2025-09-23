import type { User } from '@content/shared-types'
import { me } from '@/lib/client/auth'

type SessionResult = { user: User }

let cache: { expiresAt: number; promise: Promise<SessionResult> | null } = {
  expiresAt: 0,
  promise: null,
}

const DEFAULT_TTL_MS = 10_000

export async function getSession(ttlMs: number = DEFAULT_TTL_MS): Promise<SessionResult> {
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
