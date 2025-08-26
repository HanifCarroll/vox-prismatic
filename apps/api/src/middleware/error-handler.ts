import { Context } from 'hono';

/**
 * Global error handler middleware
 * Provides consistent error response format across all endpoints
 */
export function errorHandler() {
  return async (c: Context, next: Function) => {
    try {
      await next();
    } catch (error) {
      console.error('API Error:', {
        path: c.req.path,
        method: c.req.method,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Determine error status code
      let status = 500;
      let message = 'Internal server error';

      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('not found')) {
          status = 404;
          message = error.message;
        } else if (error.message.includes('validation') || error.message.includes('required')) {
          status = 400;
          message = error.message;
        } else if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
          status = 401;
          message = error.message;
        } else {
          message = error.message;
        }
      }

      return c.json(
        {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
          path: c.req.path,
        },
        status
      );
    }
  };
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler() {
  return (c: Context) => {
    return c.json(
      {
        success: false,
        error: `Route ${c.req.method} ${c.req.path} not found`,
        timestamp: new Date().toISOString(),
      },
      404
    );
  };
}