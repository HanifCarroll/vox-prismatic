import type { MiddlewareHandler } from 'hono'
import pino from 'pino'
import { env } from '../config/env'

// Create Pino logger instance
const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})

export const loggingMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now()
    const method = c.req.method
    const url = c.req.url

    logger.info({
      msg: 'Request received',
      method,
      url,
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    })

    await next()

    const duration = Date.now() - start
    const status = c.res.status

    logger.info({
      msg: 'Request completed',
      method,
      url,
      status,
      duration: `${duration}ms`,
    })
  }
}

export { logger }