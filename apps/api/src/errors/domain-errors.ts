/**
 * Domain-specific error classes that extend base API errors
 * These provide semantic meaning and proper error discrimination
 */

import { 
  ApiError, 
  NotFoundError, 
  ValidationError, 
  ConflictError,
  BadRequestError,
  ServiceError 
} from './api-errors';

// Post-specific errors
export class PostNotFoundError extends NotFoundError {
  constructor(postId: string) {
    super('Post', postId);
  }
}

export class PostValidationError extends ValidationError {
  constructor(message: string, issues?: any[]) {
    super(`Post validation failed: ${message}`, issues);
  }
}

export class PostStatusConflictError extends ConflictError {
  constructor(postId: string, currentStatus: string, targetStatus: string) {
    super(`Cannot transition post ${postId} from ${currentStatus} to ${targetStatus}`);
  }
}

// Insight-specific errors
export class InsightNotFoundError extends NotFoundError {
  constructor(insightId: string) {
    super('Insight', insightId);
  }
}

export class InsightGenerationError extends ServiceError {
  constructor(message: string, transcriptId?: string) {
    super(`Failed to generate insights${transcriptId ? ` for transcript ${transcriptId}` : ''}: ${message}`);
  }
}

// Transcript-specific errors
export class TranscriptNotFoundError extends NotFoundError {
  constructor(transcriptId: string) {
    super('Transcript', transcriptId);
  }
}

export class TranscriptProcessingError extends ServiceError {
  constructor(message: string, transcriptId?: string) {
    super(`Transcript processing failed${transcriptId ? ` for ${transcriptId}` : ''}: ${message}`);
  }
}

// Scheduling-specific errors  
export class ScheduledPostNotFoundError extends NotFoundError {
  constructor(scheduleId: string) {
    super('Scheduled post', scheduleId);
  }
}

export class SchedulingConflictError extends ConflictError {
  constructor(postId: string, scheduledTime: Date) {
    super(`Post ${postId} already has a scheduled entry for ${scheduledTime.toISOString()}`);
  }
}

export class InvalidScheduleTimeError extends BadRequestError {
  constructor(scheduledTime: Date) {
    super(`Cannot schedule post for past time: ${scheduledTime.toISOString()}`);
  }
}

// AI Service errors
export class AIServiceError extends ServiceError {
  constructor(operation: string, details?: string) {
    super(`AI service error during ${operation}${details ? `: ${details}` : ''}`);
  }
}

export class PromptNotFoundError extends NotFoundError {
  constructor(promptName: string) {
    super('Prompt template', promptName);
  }
}

// Database errors
export class DatabaseConnectionError extends ServiceError {
  constructor(details?: string) {
    super(`Database connection failed${details ? `: ${details}` : ''}`);
  }
}

export class DatabaseQueryError extends ServiceError {
  constructor(operation: string, details?: string) {
    super(`Database query failed during ${operation}${details ? `: ${details}` : ''}`);
  }
}

// Platform integration errors
export class PlatformAuthError extends BadRequestError {
  constructor(platform: string, details?: string) {
    super(`${platform} authentication failed${details ? `: ${details}` : ''}`);
  }
}

export class PlatformPostError extends ServiceError {
  constructor(platform: string, operation: string, details?: string) {
    super(`${platform} ${operation} failed${details ? `: ${details}` : ''}`);
  }
}

// Type guard functions for error discrimination
export function isPostError(error: unknown): error is PostNotFoundError | PostValidationError | PostStatusConflictError {
  return error instanceof PostNotFoundError || 
         error instanceof PostValidationError || 
         error instanceof PostStatusConflictError;
}

export function isInsightError(error: unknown): error is InsightNotFoundError | InsightGenerationError {
  return error instanceof InsightNotFoundError || 
         error instanceof InsightGenerationError;
}

export function isTranscriptError(error: unknown): error is TranscriptNotFoundError | TranscriptProcessingError {
  return error instanceof TranscriptNotFoundError || 
         error instanceof TranscriptProcessingError;
}

export function isSchedulingError(error: unknown): error is ScheduledPostNotFoundError | SchedulingConflictError | InvalidScheduleTimeError {
  return error instanceof ScheduledPostNotFoundError || 
         error instanceof SchedulingConflictError ||
         error instanceof InvalidScheduleTimeError;
}

export function isDatabaseError(error: unknown): error is DatabaseConnectionError | DatabaseQueryError {
  return error instanceof DatabaseConnectionError || 
         error instanceof DatabaseQueryError;
}