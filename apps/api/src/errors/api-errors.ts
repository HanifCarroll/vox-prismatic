/**
 * Custom error classes for API error handling
 * Provides structured error responses with proper HTTP status codes
 */

export abstract class ApiError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;

  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.errorCode,
        message: this.message,
        context: this.context,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export class ValidationError extends ApiError {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';

  constructor(message: string, public readonly issues?: any[]) {
    super(message);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.errorCode,
        message: this.message,
        issues: this.issues,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export class NotFoundError extends ApiError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';

  constructor(resource: string, identifier: string) {
    super(`${resource} with identifier '${identifier}' not found`);
  }
}

export class ConflictError extends ApiError {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';
}

export class UnauthorizedError extends ApiError {
  readonly statusCode = 401;
  readonly errorCode = 'UNAUTHORIZED';
}

export class ForbiddenError extends ApiError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';
}

export class InternalServerError extends ApiError {
  readonly statusCode = 500;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';
}

export class BadRequestError extends ApiError {
  readonly statusCode = 400;
  readonly errorCode = 'BAD_REQUEST';
}

export class ServiceError extends ApiError {
  readonly statusCode = 500;
  readonly errorCode = 'SERVICE_ERROR';
}