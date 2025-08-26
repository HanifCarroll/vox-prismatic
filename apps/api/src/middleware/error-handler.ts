import { Context } from 'hono';
import { ApiError, NotFoundError, ValidationError, ConflictError, ServiceError } from '../errors/api-errors';
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

      // Handle generic errors with backward compatibility
      let status = 500;
      let message = 'Internal server error';

      if (error instanceof Error) {
        // Try to infer error type from message for backward compatibility
        if (error.message.includes('not found')) {
          status = 404;
          message = error.message;
        } else if (error.message.includes('validation') || error.message.includes('required')) {
          status = 400;
          message = error.message;
        } else if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
          status = 401;
          message = error.message;
        } else if (error.message.includes('conflict')) {
          status = 409;
          message = error.message;
        } else {
          message = error.message;
        }
      }

      return c.json(
        {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
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
 * Utility function to convert Result to HTTP response or throw ApiError
 * Helps maintain consistency between service layer Results and API responses
 */
export function handleServiceResult<T>(result: Result<T>, notFoundMessage?: string): T {
  if (result.success) {
    return result.data;
  }

  const error = result.error;
  
  // Try to determine error type based on message
  if (error.message.includes('not found')) {
    throw new NotFoundError('Resource', notFoundMessage || 'unknown');
  }
  
  if (error.message.includes('validation')) {
    throw new ValidationError(error.message);
  }
  
  if (error.message.includes('conflict')) {
    throw new ConflictError(error.message);
  }
  
  // Default to service error for other failures
  throw new ServiceError(error.message);
}