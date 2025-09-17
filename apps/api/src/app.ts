import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

import { env } from './config/env'
import { db } from './db'
import { errorHandler } from './middleware/error'
import { loggingMiddleware } from './middleware/logging'
import { authRoutes } from './modules/auth'
import { linkedinRoutes } from './modules/linkedin'
import { postsRoutes } from './modules/posts'
import { projectsRoutes } from './modules/projects'
import { settingsRoutes } from './modules/settings'
import { transcriptsRoutes } from './modules/transcripts'
import { ErrorCode } from './utils/errors'

export const app = new Hono()

app.use('*', secureHeaders())

app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use('*', loggingMiddleware())

app.onError(errorHandler)

app.get('/api/health', async (c) => {
  let dbStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown'
  let dbError: string | undefined

  try {
    await db.execute('SELECT 1')
    dbStatus = 'connected'
  } catch (error) {
    dbStatus = 'disconnected'
    dbError = error instanceof Error ? error.message : 'Unknown database error'
  }

  return c.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: {
      status: dbStatus,
      ...(dbError && { error: dbError }),
    },
  })
})

app.route('/api/auth', authRoutes)
app.route('/api/projects', projectsRoutes)
app.route('/api/transcripts', transcriptsRoutes)
app.route('/api/posts', postsRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/linkedin', linkedinRoutes)
app.route('/api/auth/linkedin', linkedinRoutes)

app.notFound((c) => {
  return c.json(
    {
      error: `The requested endpoint ${c.req.path} does not exist`,
      code: ErrorCode.NOT_FOUND,
      status: 404,
    },
    404,
  )
})
