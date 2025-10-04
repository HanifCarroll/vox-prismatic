import type { MiddlewareHandler } from 'hono'
import { env } from '@/config/env'
import { ErrorCode } from '@/utils/errors'
import { logger } from './logging'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string // Custom error message
  keyGenerator?: (c: any) => string // Function to generate unique key
}

interface RequestData {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// In production, this should be replaced with Redis for distributed systems
class RateLimitStore {
  private store: Map<string, RequestData> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, data] of this.store.entries()) {
        if (data.resetTime <= now) {
          this.store.delete(key)
        }
      }
    }, 60000) // 1 minute
  }

  increment(key: string, windowMs: number): RequestData {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || existing.resetTime <= now) {
      // Create new window
      const data: RequestData = {
        count: 1,
        resetTime: now + windowMs,
      }
      this.store.set(key, data)
      return data
    }

    // Increment existing window
    existing.count++
    return existing
  }

  get(key: string): RequestData | undefined {
    const data = this.store.get(key)
    if (data && data.resetTime > Date.now()) {
      return data
    }
    return undefined
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// Singleton store instance
const rateLimitStore = new RateLimitStore()

// Default key generator - uses IP address
const defaultKeyGenerator = (c: any): string => {
  const ip =
    c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || c.env?.remoteAddr || 'unknown'
  return ip
}

/**
 * Creates a rate limiter that can be disabled in development
 * Returns a pass-through middleware when rate limiting is disabled
 */
function createRateLimiter(options: RateLimitOptions): MiddlewareHandler {
  // Disable rate limiting in development or when explicitly disabled
  if (env.NODE_ENV === 'development' || env.DISABLE_RATE_LIMIT === 'true') {
    // Return pass-through middleware that does nothing
    return async (c, next) => {
      // Optionally log that rate limiting is bypassed in development
      logger.debug({
        msg: 'Rate limiting bypassed (development mode)',
        path: c.req.path,
      })
      await next()
    }
  }

  // Return the actual rate limiter for production
  return rateLimit(options)
}

/**
 * Rate limiting middleware for Hono
 * Limits the number of requests from a single IP within a time window
 */
export const rateLimit = (options: RateLimitOptions): MiddlewareHandler => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    keyGenerator = defaultKeyGenerator,
  } = options

  return async (c, next): Promise<Response | void> => {
    const key = `rate-limit:${c.req.path}:${keyGenerator(c)}`

    try {
      const requestData = rateLimitStore.increment(key, windowMs)

      // Set rate limit headers
      c.header('X-RateLimit-Limit', maxRequests.toString())
      c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - requestData.count).toString())
      c.header('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString())

      if (requestData.count > maxRequests) {
        // Log rate limit exceeded
        logger.warn({
          msg: 'Rate limit exceeded',
          ip: keyGenerator(c),
          path: c.req.path,
          count: requestData.count,
          limit: maxRequests,
        })

        // Return 429 Too Many Requests
        c.header('Retry-After', Math.ceil((requestData.resetTime - Date.now()) / 1000).toString())
        return c.json(
          {
            error: message,
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            status: 429,
            details: {
              retryAfter: Math.ceil((requestData.resetTime - Date.now()) / 1000),
            },
          },
          429,
        )
      }

      await next()
    } catch (error) {
      // If rate limiting fails, log error but don't block the request
      logger.error({
        msg: 'Rate limiting error',
        error: error instanceof Error ? error.message : 'Unknown error',
        path: c.req.path,
      })
      await next()
    }
  }
}

/**
 * Pre-configured rate limiter for login endpoints
 * 5 attempts per 15 minutes
 * Automatically disabled in development
 */
export const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many login attempts, please try again in 15 minutes',
})

/**
 * Pre-configured rate limiter for registration endpoints
 * 3 attempts per hour
 * Automatically disabled in development
 */
export const registrationRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  message: 'Too many registration attempts, please try again in 1 hour',
})

/**
 * General API rate limiter
 * 100 requests per minute
 * Automatically disabled in development
 */
export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many requests, please slow down',
})

// Cleanup on process exit
process.on('SIGINT', () => {
  rateLimitStore.destroy()
})

process.on('SIGTERM', () => {
  rateLimitStore.destroy()
})
