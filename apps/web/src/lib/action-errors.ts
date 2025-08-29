/**
 * Action Error Classes
 * Shared error types for server actions
 */

export class ActionError extends Error {
  constructor(
    message: string,
    public code: string = 'ACTION_ERROR',
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ActionError';
  }
}

export class AuthenticationError extends ActionError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_REQUIRED', 401);
  }
}

export class AuthorizationError extends ActionError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ValidationError extends ActionError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}