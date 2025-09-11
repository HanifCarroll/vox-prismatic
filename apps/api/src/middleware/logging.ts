import type { MiddlewareHandler } from 'hono'
import pino from 'pino'
import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { env } from '../config/env'

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs')
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true })
}

// Create date-based log filename
const getLogFileName = () => {
  const date = new Date()
  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `app-${dateString}.log`
}

// Create streams array for multistream
const streams: pino.StreamEntry[] = []

// Always add file stream that captures ALL levels (trace and above)
streams.push({
  level: 'trace', // Capture everything including trace, debug, info, warn, error, fatal
  stream: createWriteStream(join(logsDir, getLogFileName()), { flags: 'a' }),
})

// Add pretty console output for development
if (env.NODE_ENV !== 'production') {
  streams.push({
    level: 'debug',
    stream: pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        sync: false,
      },
    }),
  })
} else {
  // In production, also log to stdout but as JSON
  streams.push({
    level: 'info',
    stream: process.stdout,
  })
}

// Create Pino logger instance with multistream
const logger = pino(
  {
    level: 'trace', // Set to lowest level so all logs are processed
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.headers,
      }),
    },
    formatters: {
      level: (label) => {
        return { level: label }
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream(streams)
)

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
