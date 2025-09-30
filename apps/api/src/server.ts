import { serve } from '@hono/node-server'

import { app } from './app'
import { env } from './config/env'
import { logger } from './middleware/logging'
import { startPostScheduler } from './modules/posts/scheduler'

const port = env.PORT

startPostScheduler()

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info({
      msg: 'Server started successfully',
      port: info.port,
      endpoints: {
        api: `http://localhost:${info.port}`,
        health: `http://localhost:${info.port}/api/health`,
      },
      environment: env.NODE_ENV,
    })
  },
)
