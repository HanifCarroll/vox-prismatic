import { HTTPException } from 'hono/http-exception'

/**
 * Error codes enum for consistent error identification
 */
export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  NO_AUTH_HEADER = 'NO_AUTH_HEADER',

  // Authorization errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',

  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Custom error response structure for consistent API error responses
 */
export interface ErrorResponse {
  error: string
  code: ErrorCode
  status: number
  details?: Record<string, unknown>
}

/**
 * Base class for creating custom HTTP exceptions with consistent structure
 * Extends Hono's HTTPException to work seamlessly with the framework
 */
export class AppException extends HTTPException {
  public code: ErrorCode

  constructor(
    status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
    message: string,
    code: ErrorCode,
    details?: Record<string, unknown>,
  ) {
    const response = new Response(
      JSON.stringify({
        error: message,
        code,
        status,
        details,
      } satisfies ErrorResponse),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    super(status, { res: response, message })
    this.code = code
  }
}

/**
 * 400 Bad Request - Validation errors
 * Use when request data fails validation rules
 */
export class ValidationException extends AppException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, message, ErrorCode.VALIDATION_ERROR, details)
  }
}

/**
 * 401 Unauthorized - Authentication failures
 * Use when credentials are invalid or missing
 */
export class UnauthorizedException extends AppException {
  constructor(message = 'Authentication required', code = ErrorCode.UNAUTHORIZED) {
    super(401, message, code)
  }
}

/**
 * 403 Forbidden - Authorization failures
 * Use when authenticated user lacks permission
 */
export class ForbiddenException extends AppException {
  constructor(message = 'Access denied', code = ErrorCode.FORBIDDEN) {
    super(403, message, code)
  }
}

/**
 * 404 Not Found - Resource not found
 * Use when requested resource doesn't exist
 */
export class NotFoundException extends AppException {
  constructor(message = 'Resource not found', code = ErrorCode.NOT_FOUND) {
    super(404, message, code)
  }
}

/**
 * 409 Conflict - Resource conflicts
 * Use when action conflicts with existing state (e.g., duplicate email)
 */
export class ConflictException extends AppException {
  constructor(message: string, code = ErrorCode.CONFLICT) {
    super(409, message, code)
  }
}

/**
 * 422 Unprocessable Entity - Business rule violations
 * Use when request is valid but violates business logic
 */
export class UnprocessableEntityException extends AppException {
  constructor(
    message: string,
    code = ErrorCode.BUSINESS_RULE_VIOLATION,
    details?: Record<string, unknown>,
  ) {
    super(422, message, code, details)
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 * Use when client has sent too many requests
 */
export class TooManyRequestsException extends AppException {
  constructor(message = 'Too many requests', retryAfter?: number) {
    const details = retryAfter ? { retryAfter } : undefined
    super(429, message, ErrorCode.RATE_LIMIT_EXCEEDED, details)
  }
}

/**
 * 500 Internal Server Error - Unexpected errors
 * Use sparingly, only for truly unexpected failures
 */
export class InternalServerException extends AppException {
  constructor(message = 'Internal server error', code = ErrorCode.INTERNAL_ERROR) {
    super(500, message, code)
  }
}
