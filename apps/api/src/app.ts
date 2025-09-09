import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { swaggerUI } from '@hono/swagger-ui'
import { env } from './config/env'
import { errorHandler } from './middleware/error'
import { loggingMiddleware } from './middleware/logging'

// Create the main Hono app
export const app = new Hono()

// Global middleware
app.use('*', cors({
  origin: env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', loggingMiddleware())

// Error handling
app.onError(errorHandler)

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  })
})

// Swagger UI documentation
app.get('/swagger', swaggerUI({ url: '/api/swagger.json' }))

// API routes will be mounted here
// app.route('/api/auth', authRoutes)
// app.route('/api/projects', projectRoutes)
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