import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { env } from '../config/env'

export const errorHandler: ErrorHandler = (err, c) => {
  // Log error internally for debugging (never expose to client)
  console.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  })

  // Handle Hono HTTPException
  if (err instanceof HTTPException) {
    // Only return safe, intended error messages
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
      const safeDetails = zodError._errors?.map?.((e: any) => ({
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