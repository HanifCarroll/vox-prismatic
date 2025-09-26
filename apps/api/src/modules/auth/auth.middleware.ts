import type { Context, Next } from 'hono'
import { ErrorCode, UnauthorizedException } from '@/utils/errors'
import { readSessionId } from './lucia'
import { db } from '@/db'
import { authSessions, users } from '@/db/schema'
import { and, eq, gt } from 'drizzle-orm'

// Extend Hono's context type to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      userId: number
      email: string
      name?: string
      isAdmin: boolean
      subscriptionStatus: string
      subscriptionPlan: string
      subscriptionCurrentPeriodEnd: Date | null
      cancelAtPeriodEnd: boolean
      trialEndsAt: Date | null
    }
  }
}

/**
 * Authentication middleware for protecting routes
 * Validates session cookie and adds user payload to context
 */
export async function authMiddleware(c: Context, next: Next): Promise<void> {
  const sessionId = readSessionId(c)
  if (!sessionId) {
    throw new UnauthorizedException('Authentication required', ErrorCode.UNAUTHORIZED)
  }

  const now = new Date()
  const session = await db.query.authSessions.findFirst({
    where: and(eq(authSessions.id, sessionId), gt(authSessions.expiresAt, now)),
  })
  if (!session) {
    throw new UnauthorizedException('Authentication required', ErrorCode.UNAUTHORIZED)
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) })
  if (!user) {
    throw new UnauthorizedException('Authentication required', ErrorCode.UNAUTHORIZED)
  }

  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd ?? null,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    trialEndsAt: user.trialEndsAt ?? null,
  }
  c.set('user', payload)

  await next()
}
