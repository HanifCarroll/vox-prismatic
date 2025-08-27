import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for AI service errors
 */
export abstract class AIServiceError extends HttpException {
  constructor(message: string, status: HttpStatus, public readonly originalError?: any) {
    super(message, status);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when AI API rate limit is exceeded
 */
export class AIRateLimitError extends AIServiceError {
  constructor(message: string = 'AI API rate limit exceeded. Please try again later.', originalError?: any) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, originalError);
  }
}

/**
 * Thrown when AI API quota is exceeded
 */
export class AIQuotaExceededError extends AIServiceError {
  constructor(message: string = 'AI API quota exceeded. Please check your billing.', originalError?: any) {
    super(message, HttpStatus.PAYMENT_REQUIRED, originalError);
  }
}

/**
 * Thrown when AI API key is invalid or missing
 */
export class AIAuthenticationError extends AIServiceError {
  constructor(message: string = 'Invalid or missing AI API key.', originalError?: any) {
    super(message, HttpStatus.UNAUTHORIZED, originalError);
  }
}

/**
 * Thrown when AI model returns invalid response
 */
export class AIInvalidResponseError extends AIServiceError {
  constructor(message: string = 'AI model returned invalid response.', originalError?: any) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, originalError);
  }
}

/**
 * Thrown when AI request times out
 */
export class AITimeoutError extends AIServiceError {
  constructor(message: string = 'AI request timed out.', originalError?: any) {
    super(message, HttpStatus.REQUEST_TIMEOUT, originalError);
  }
}

/**
 * Thrown for general AI service failures
 */
export class AIProcessingError extends AIServiceError {
  constructor(message: string = 'AI processing failed.', originalError?: any) {
    super(message, HttpStatus.BAD_REQUEST, originalError);
  }
}

/**
 * Helper to classify Google AI errors
 */
export function classifyGoogleAIError(error: any): AIServiceError {
  const message = error?.message?.toLowerCase() || '';
  const statusCode = error?.status || error?.response?.status;
  
  // Rate limiting
  if (statusCode === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    return new AIRateLimitError(undefined, error);
  }
  
  // Quota exceeded
  if (statusCode === 402 || message.includes('quota') || message.includes('billing')) {
    return new AIQuotaExceededError(undefined, error);
  }
  
  // Authentication issues
  if (statusCode === 401 || statusCode === 403 || message.includes('api key') || message.includes('authentication')) {
    return new AIAuthenticationError(undefined, error);
  }
  
  // Timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return new AITimeoutError(undefined, error);
  }
  
  // Invalid response
  if (message.includes('invalid') || message.includes('parse') || message.includes('format')) {
    return new AIInvalidResponseError(error?.message || 'Invalid AI response', error);
  }
  
  // Default to processing error
  return new AIProcessingError(error?.message || 'AI processing failed', error);
}