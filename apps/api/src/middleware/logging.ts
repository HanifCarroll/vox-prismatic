import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

import type { MiddlewareHandler } from 'hono'
import pino from 'pino'

import { env } from '../config/env.js'

const logsDir = join(process.cwd(), 'logs')
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true })
}

const getLogFileName = () => {
  const date = new Date()
  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `app-${dateString}.log`
}

const streams: pino.StreamEntry[] = [
  {
    level: 'trace',
    stream: createWriteStream(join(logsDir, getLogFileName()), { flags: 'a' }),
  },
]

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
  streams.push({
    level: 'info',
    stream: process.stdout,
  })
}

export const logger = pino(
  {
    level: 'trace',
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
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream(streams),
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

    logger.info({
      msg: 'Request completed',
      method,
      url,
      status: c.res.status,
      duration: `${duration}ms`,
    })
  }
}
