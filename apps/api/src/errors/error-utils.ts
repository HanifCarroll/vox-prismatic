/**
 * Error handling utilities for consistent error processing
 * Replaces string-based error detection with proper type discrimination
 */

import type { Result } from '@content-creation/types';
import { ApiError } from './api-errors';
import * as DomainErrors from './domain-errors';

/**
 * Enhanced error type enum for Result discrimination
 * Allows services to return typed errors instead of generic Error
 */
export enum ErrorType {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SERVICE = 'SERVICE',
  DATABASE = 'DATABASE',
  AI_SERVICE = 'AI_SERVICE',
  PLATFORM = 'PLATFORM',
}

/**
 * Extended Result type with error discrimination
 */
export type TypedResult<T, E extends ApiError = ApiError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Convert a Result to data or throw the appropriate domain error
 * No string matching - uses proper error types
 */
export function unwrapResult<T>(result: Result<T>): T {
  if (result.success) {
    return result.data;
  }
  
  // If error is already an ApiError, throw it directly
  if (result.error instanceof ApiError) {
    throw result.error;
  }
  
  // For generic errors, wrap in ServiceError (no guessing!)
  throw new DomainErrors.ServiceError(result.error.message);
}

/**
 * Convert a Result with context to data or throw domain error
 */
export function unwrapResultWithContext<T>(
  result: Result<T>,
  errorContext: {
    resource?: string;
    resourceId?: string;
    operation?: string;
  }
): T {
  if (result.success) {
    return result.data;
  }
  
  // If error is already typed, throw it
  if (result.error instanceof ApiError) {
    throw result.error;
  }
  
  // Create appropriate error based on context
  if (errorContext.resource && errorContext.resourceId) {
    // Check if it's a not found based on actual null/undefined data, not string matching
    throw new DomainErrors.ServiceError(
      `${errorContext.operation || 'Operation'} failed for ${errorContext.resource} ${errorContext.resourceId}: ${result.error.message}`
    );
  }
  
  throw new DomainErrors.ServiceError(result.error.message);
}

/**
 * Transform service errors to API errors with proper typing
 * Used in route handlers to ensure consistent error responses
 */
export function mapServiceError(error: unknown): ApiError {
  // Already an API error
  if (error instanceof ApiError) {
    return error;
  }
  
  // Generic error
  if (error instanceof Error) {
    return new DomainErrors.ServiceError(error.message);
  }
  
  // Unknown error
  return new DomainErrors.ServiceError('An unexpected error occurred');
}

/**
 * Create typed Results for service layer
 */
export function success<T>(data: T): TypedResult<T, never> {
  return { success: true, data };
}

export function failure<E extends ApiError>(error: E): TypedResult<never, E> {
  return { success: false, error };
}

/**
 * Async error wrapper for cleaner async/await handling
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorTransform?: (error: unknown) => ApiError
): Promise<TypedResult<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    const apiError = errorTransform ? errorTransform(error) : mapServiceError(error);
    return failure(apiError);
  }
}

/**
 * Validate and throw if validation fails
 */
export function assertValid<T>(
  condition: boolean,
  errorMessage: string,
  issues?: any[]
): asserts condition {
  if (!condition) {
    throw new DomainErrors.ValidationError(errorMessage, issues);
  }
}

/**
 * Assert resource exists or throw NotFoundError
 */
export function assertExists<T>(
  resource: T | null | undefined,
  resourceType: string,
  resourceId: string
): asserts resource is T {
  if (!resource) {
    throw new DomainErrors.NotFoundError(resourceType, resourceId);
  }
}