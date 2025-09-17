import type { Context, Next } from 'hono'
import { ErrorCode, UnauthorizedException } from '@/utils/errors'
import type { JWTPayload } from './auth'
import { extractBearerToken, verifyToken } from './auth'

// Extend Hono's context type to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload
  }
}

/**
 * Authentication middleware for protecting routes
 * Validates JWT token and adds user payload to context
 *
 * For MVP, we trust the JWT payload and don't re-fetch user from DB
 * This improves performance while maintaining security through token validation
 */
export async function authMiddleware(c: Context, next: Next): Promise<void> {
  // Extract token from Authorization header
  const token = extractBearerToken(c.req.header('Authorization'))

  if (!token) {
    throw new UnauthorizedException('Authorization header required', ErrorCode.NO_AUTH_HEADER)
  }

  // Verify and decode the token (this will throw if invalid)
  const payload = await verifyToken(token)

  // Add user payload to context for downstream handlers
  // We trust the JWT payload for MVP (no DB lookup needed)
  c.set('user', payload)

  // Continue to the next handler
  await next()
}
