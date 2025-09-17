import { logger } from '../middleware/logging'

// Export logger instance for direct use
export { logger }

// Convenience methods with additional context
export const log = {
  // Trace level - Most detailed logging
  trace: (msg: string, data?: any) => logger.trace(data, msg),
  
  // Debug level - Detailed information for debugging
  debug: (msg: string, data?: any) => logger.debug(data, msg),
  
  // Info level - General informational messages
  info: (msg: string, data?: any) => logger.info(data, msg),
  
  // Warn level - Warning messages
  warn: (msg: string, data?: any) => logger.warn(data, msg),
  
  // Error level - Error messages
  error: (msg: string, error?: any, data?: any) => {
    if (error instanceof Error) {
      logger.error({ err: error, ...data }, msg)
    } else {
      logger.error({ ...error, ...data }, msg)
    }
  },
  
  // Fatal level - Fatal errors that will terminate the process
  fatal: (msg: string, error?: any, data?: any) => {
    if (error instanceof Error) {
      logger.fatal({ err: error, ...data }, msg)
    } else {
      logger.fatal({ ...error, ...data }, msg)
    }
  },
  
  // Child logger for specific modules/features
  child: (bindings: Record<string, any>) => logger.child(bindings),
  
  // Log API requests
  request: (method: string, url: string, data?: any) => {
    logger.info({ method, url, ...data }, 'API Request')
  },
  
  // Log API responses
  response: (method: string, url: string, status: number, duration: number, data?: any) => {
    logger.info({ method, url, status, duration, ...data }, 'API Response')
  },
  
  // Log database operations
  db: (operation: string, table: string, data?: any) => {
    logger.debug({ operation, table, ...data }, 'Database Operation')
  },
  
  // Log job/task execution
  job: (name: string, status: 'started' | 'completed' | 'failed', data?: any) => {
    const level = status === 'failed' ? 'error' : 'info'
    logger[level]({ job: name, status, ...data }, `Job ${status}: ${name}`)
  },
  
  // Log authentication events
  auth: (event: string, userId?: string, data?: any) => {
    logger.info({ event, userId, ...data }, `Auth: ${event}`)
  },
  
  // Log performance metrics
  perf: (operation: string, duration: number, data?: any) => {
    logger.debug({ operation, duration, ...data }, `Performance: ${operation} took ${duration}ms`)
  },
}

// Helper to create a scoped logger for a specific module
export const createLogger = (module: string) => {
  const moduleLogger = logger.child({ module })
  
  return {
    trace: (msg: string, data?: any) => moduleLogger.trace(data, msg),
    debug: (msg: string, data?: any) => moduleLogger.debug(data, msg),
    info: (msg: string, data?: any) => moduleLogger.info(data, msg),
    warn: (msg: string, data?: any) => moduleLogger.warn(data, msg),
    error: (msg: string, error?: any, data?: any) => {
      if (error instanceof Error) {
        moduleLogger.error({ err: error, ...data }, msg)
      } else {
        moduleLogger.error({ ...error, ...data }, msg)
      }
    },
    fatal: (msg: string, error?: any, data?: any) => {
      if (error instanceof Error) {
        moduleLogger.fatal({ err: error, ...data }, msg)
      } else {
        moduleLogger.fatal({ ...error, ...data }, msg)
      }
    },
  }
}

// Export function to get current log file path
export const getLogFilePath = () => {
  const date = new Date()
  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `logs/app-${dateString}.log`
}