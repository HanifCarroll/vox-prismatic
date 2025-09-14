import { serve } from '@hono/node-server'
import { app } from './app'
import { env } from './config/env'
import { db } from './db'
import { logger } from './middleware/logging'

const port = env.PORT

// Check migration status on startup
async function checkMigrationStatus() {
  try {
    // Check if the migration table exists and has entries
    const result = (await db.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'drizzle' 
      AND table_name = '__drizzle_migrations'
    `)) as unknown as Array<{ count: string }>
    
    const tableExists = result[0]?.count === '1'
    
    if (!tableExists) {
      logger.warn({
        msg: 'Migration table not found',
        suggestion: 'Run "pnpm db:migrate" to apply database migrations',
      })
      return
    }
    
    // Check for applied migrations
    const migrations = (await db.execute(`
      SELECT COUNT(*) as count, MAX(created_at) as latest
      FROM drizzle.__drizzle_migrations
    `)) as unknown as Array<{ count: string; latest: string }>
    
    const migrationCount = Number(migrations[0]?.count || 0)
    const latestMigration = migrations[0]?.latest
    
    if (migrationCount === 0) {
      logger.warn({
        msg: 'No migrations have been applied',
        suggestion: 'Run "pnpm db:migrate" to apply database migrations',
      })
    } else {
      logger.info({
        msg: 'Migration status checked',
        migrationsApplied: migrationCount,
        latestMigration: latestMigration ? new Date(latestMigration).toISOString() : 'unknown',
      })
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to check migration status',
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Ensure database is running and migrations are applied',
    })
  }
}

// Run migration check before starting server
checkMigrationStatus()

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
        swagger: `http://localhost:${info.port}/swagger`,
        health: `http://localhost:${info.port}/api/health`,
      },
      environment: env.NODE_ENV,
    })
  },
)
