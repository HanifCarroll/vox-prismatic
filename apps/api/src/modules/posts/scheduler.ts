import { env } from '@/config/env'
import { logger } from '@/middleware/logging'
import { publishDueScheduledPosts } from './posts'

let schedulerHandle: NodeJS.Timeout | null = null

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export function startPostScheduler(options?: {
  intervalMs?: number
  batchSize?: number
  enabled?: boolean
}) {
  const disabledByEnv = env.POST_SCHEDULER_DISABLED === 'true'
  const enabled = options?.enabled ?? (env.NODE_ENV !== 'test' && !disabledByEnv)
  if (!enabled) {
    logger.info({ msg: 'Post scheduler disabled' })
    return
  }
  if (schedulerHandle) {
    return
  }

  const intervalMs =
    options?.intervalMs ?? parsePositiveNumber(env.POST_SCHEDULER_INTERVAL_MS, 60000)
  const batchSize = options?.batchSize ?? parsePositiveNumber(env.POST_SCHEDULER_BATCH_SIZE, 10)

  const run = async () => {
    try {
      const summary = await publishDueScheduledPosts({ limit: Math.max(1, Math.floor(batchSize)) })
      if (summary.attempted > 0) {
        logger.info({ msg: 'Post scheduler run complete', ...summary })
      }
    } catch (error) {
      logger.error({
        msg: 'Post scheduler run failed',
        error: error instanceof Error ? error.message : error,
      })
    }
  }

  schedulerHandle = setInterval(() => {
    run().catch((error) => {
      logger.error({
        msg: 'Post scheduler interval error',
        error: error instanceof Error ? error.message : error,
      })
    })
  }, intervalMs)

  run().catch((error) => {
    logger.error({
      msg: 'Initial post scheduler run failed',
      error: error instanceof Error ? error.message : error,
    })
  })
}

export function stopPostScheduler() {
  if (schedulerHandle) {
    clearInterval(schedulerHandle)
    schedulerHandle = null
  }
}
