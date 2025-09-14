import { swaggerUI } from '@hono/swagger-ui'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { env } from './config/env'
import { db } from './db'
import { errorHandler } from './middleware/error'
import { loggingMiddleware } from './middleware/logging'
import { authRoutes } from './modules/auth'
import { projectsRoutes } from './modules/projects'
import { transcriptsRoutes } from './modules/transcripts'
import { postsRoutes } from './modules/posts'
import { linkedinRoutes } from './modules/linkedin'
import { settingsRoutes } from './modules/settings'

// Create the main Hono app
export const app = new Hono()

// Global middleware
// Security headers first
app.use('*', secureHeaders())

app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use('*', loggingMiddleware())

// Error handling
app.onError(errorHandler)

// Health check endpoint with database connectivity check
app.get('/api/health', async (c) => {
  let dbStatus = 'unknown'
  let dbError: string | undefined
  
  try {
    // Simple query to check database connectivity
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

// Swagger UI documentation
app.get('/swagger', swaggerUI({ url: '/api/swagger.json' }))

// API routes
app.route('/api/auth', authRoutes)
app.route('/api/projects', projectsRoutes)
app.route('/api/transcripts', transcriptsRoutes)
app.route('/api', postsRoutes)
app.route('/api/linkedin', linkedinRoutes)
app.route('/api/settings', settingsRoutes)
// app.route('/api/insights', insightRoutes)
// app.route('/api/posts', postRoutes)
// app.route('/api/linkedin', linkedinRoutes)

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `The requested endpoint ${c.req.path} does not exist`,
    },
    404,
  )
})
