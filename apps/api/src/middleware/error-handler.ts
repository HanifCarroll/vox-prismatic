import { Context } from 'hono';
import { ApiError } from '../errors/api-errors';
import { unwrapResult } from '../errors/error-utils';
import type { Result } from '@content-creation/types';

/**
 * Enhanced error handler middleware with proper error classification
 * Provides consistent error response format across all endpoints
 */
export function errorHandler() {
  return async (c: Context, next: Function) => {
    try {
      await next();
    } catch (error) {
      // Log error details for debugging
      console.error('API Error:', {
        path: c.req.path,
        method: c.req.method,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Handle ApiError instances with proper structure
      if (error instanceof ApiError) {
        return c.json(error.toJSON(), error.statusCode);
      }

      // Handle generic errors (should be rare with proper error handling)
      const status = 500;
      const message = error instanceof Error ? error.message : 'Internal server error';

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message,
          },
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
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route ${c.req.method} ${c.req.path} not found`,
        },
        timestamp: new Date().toISOString(),
      },
      404
    );
  };
}

/**
 * DEPRECATED: Use unwrapResult from error-utils instead
 * Kept for backward compatibility during migration
 * @deprecated
 */
export function handleServiceResult<T>(result: Result<T>, notFoundMessage?: string): T {
  console.warn('handleServiceResult is deprecated. Use unwrapResult from error-utils instead.');
  return unwrapResult(result);
}