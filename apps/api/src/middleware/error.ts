import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { env } from '../config/env'

export const errorHandler: ErrorHandler = (err, c) => {
  // Handle Hono HTTPException
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        status: err.status,
        ...(env.NODE_ENV === 'development' && { stack: err.stack }),
      },
      err.status,
    )
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return c.json(
      {
        error: 'Validation Error',
        status: 400,
        details: JSON.parse(err.message),
      },
      400,
    )
  }

  // Handle generic errors
  console.error('Unhandled error:', err)
  
  return c.json(
    {
      error: 'Internal Server Error',
      status: 500,
      message: env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    500,
  )
}