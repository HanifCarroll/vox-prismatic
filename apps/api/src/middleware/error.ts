import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { env } from '../config/env'
import { AppException } from '../utils/errors'
import { logger } from './logging'

export const errorHandler: ErrorHandler = (err, c) => {
  // Prepare error details for logging
  const errorDetails = {
    name: err.name,
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    code: err instanceof AppException ? err.code : undefined,
  }

  // Log error internally for debugging (never expose to client)
  logger.error({
    msg: 'Request error occurred',
    error: errorDetails,
    request: {
      method: c.req.method,
      url: c.req.url,
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    },
  })

  // Handle our custom AppException (which extends HTTPException)
  if (err instanceof AppException) {
    // AppException already formats the response properly
    return err.getResponse()
  }

  // Handle standard Hono HTTPException
  if (err instanceof HTTPException) {
    // Return the response from HTTPException if it has one
    const response = err.getResponse()
    if (response) {
      return response
    }
    // Fallback to simple JSON response
    return c.json(
      {
        error: err.message,
        status: err.status,
      },
      err.status,
    )
  }

  // Handle Zod validation errors safely
  if (err.name === 'ZodError') {
    try {
      const zodError = JSON.parse(err.message)
      // Only expose field names, not actual values or schema details
      const safeDetails =
        zodError._errors?.map?.((e: any) => ({
          field: e.path?.join('.'),
          message: 'Invalid value',
        })) || []

      return c.json(
        {
          error: 'Validation Error',
          status: 400,
          ...(env.NODE_ENV === 'development' && { details: safeDetails }),
        },
        400,
      )
    } catch {
      // If we can't parse the Zod error safely, return generic message
      return c.json(
        {
          error: 'Validation Error',
          status: 400,
        },
        400,
      )
    }
  }

  // Handle all other errors with generic message
  // NEVER expose internal error details in production
  return c.json(
    {
      error: 'Internal Server Error',
      status: 500,
      ...(env.NODE_ENV === 'development' && {
        message: err.message,
        type: err.name,
      }),
    },
    500,
  )
}
