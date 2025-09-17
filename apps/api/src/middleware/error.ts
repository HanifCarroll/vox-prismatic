import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { env } from '../config/env'
import { AppException, ErrorCode } from '../utils/errors'
import { logger } from './logging'

export const errorHandler: ErrorHandler = (err, c) => {
  const errorDetails = {
    name: err.name,
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    code: err instanceof AppException ? err.code : undefined,
  }

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

  if (err instanceof AppException) {
    return err.getResponse()
  }

  if (err instanceof HTTPException) {
    const response = err.getResponse()
    if (response) {
      return response
    }

    return c.json(
      {
        error: err.message,
        code:
          err.status === 404
            ? ErrorCode.NOT_FOUND
            : err.status === 401
              ? ErrorCode.UNAUTHORIZED
              : err.status === 403
                ? ErrorCode.FORBIDDEN
                : err.status === 429
                  ? ErrorCode.RATE_LIMIT_EXCEEDED
                  : err.status === 422
                    ? ErrorCode.BUSINESS_RULE_VIOLATION
                    : ErrorCode.INTERNAL_ERROR,
        status: err.status,
      },
      err.status,
    )
  }

  if (err.name === 'ZodError') {
    try {
      const zodError = JSON.parse(err.message)
      const safeDetails =
        zodError._errors?.map?.((e: any) => ({
          field: e.path?.join('.'),
          message: 'Invalid value',
        })) || []

      return c.json(
        {
          error: 'Validation Error',
          code: ErrorCode.VALIDATION_ERROR,
          status: 400,
          ...(env.NODE_ENV === 'development' && { details: safeDetails }),
        },
        400,
      )
    } catch {
      return c.json(
        {
          error: 'Validation Error',
          code: ErrorCode.VALIDATION_ERROR,
          status: 400,
        },
        400,
      )
    }
  }

  return c.json(
    {
      error: 'Internal Server Error',
      code: ErrorCode.INTERNAL_ERROR,
      status: 500,
      ...(env.NODE_ENV === 'development' && {
        message: err.message,
        type: err.name,
      }),
    },
    500,
  )
}
