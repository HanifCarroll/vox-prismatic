import { serve } from '@hono/node-server'
import { app } from './app'
import { env } from './config/env'

const port = env.PORT

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`🚀 Server running at http://localhost:${info.port}`)
    console.log(`📚 API Documentation: http://localhost:${info.port}/swagger`)
    console.log(`🔍 Health check: http://localhost:${info.port}/api/health`)
  },
)