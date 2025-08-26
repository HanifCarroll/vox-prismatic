import { Context } from 'hono';

/**
 * Request logging middleware
 * Logs all incoming requests with timing information
 */
export function loggerMiddleware() {
  return async (c: Context, next: Function) => {
    const start = Date.now();
    const requestId = c.get('requestId') || 'unknown';
    
    // Skip logging for health check endpoints to reduce noise
    const isHealthCheck = c.req.path === '/health';
    
    // Log incoming request (skip for health checks)
    if (!isHealthCheck) {
      console.log(`📥 [${requestId}] ${c.req.method} ${c.req.path}`);
    }
    
    await next();
    
    const duration = Date.now() - start;
    const status = c.res.status;
    
    // Log response with timing (skip for health checks unless there's an error)
    if (!isHealthCheck || status >= 400) {
      const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
      console.log(
        `📤 [${requestId}] ${statusEmoji} ${status} ${c.req.method} ${c.req.path} - ${duration}ms`
      );
    }
  };
}

/**
 * Development-only detailed logging
 */
export function devLoggerMiddleware() {
  return async (c: Context, next: Function) => {
    if (process.env.NODE_ENV !== 'development') {
      await next();
      return;
    }

    // Skip detailed logging for health checks
    const isHealthCheck = c.req.path === '/health';
    if (isHealthCheck) {
      await next();
      return;
    }

    const start = Date.now();
    
    // Log request details in development
    console.log('🔍 Request Details:', {
      method: c.req.method,
      path: c.req.path,
      query: c.req.query(),
      headers: Object.fromEntries(c.req.raw.headers.entries()),
      userAgent: c.req.header('user-agent'),
      timestamp: new Date().toISOString(),
    });
    
    await next();
    
    const duration = Date.now() - start;
    console.log('⏱️  Response Time:', `${duration}ms`);
  };
}