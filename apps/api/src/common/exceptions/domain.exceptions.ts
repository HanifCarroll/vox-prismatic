import { HttpException, HttpStatus } from '@nestjs/common';

export class NotFoundError extends HttpException {
  constructor(resource: string, id: string) {
    super(`${resource} with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

export class ValidationError extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class ConflictError extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}

export class ServiceError extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

// Domain-specific errors
export class TranscriptNotFoundError extends NotFoundError {
  constructor(transcriptId: string) {
    super('Transcript', transcriptId);
  }
}

export class InsightNotFoundError extends NotFoundError {
  constructor(insightId: string) {
    super('Insight', insightId);
  }
}

export class PostNotFoundError extends NotFoundError {
  constructor(postId: string) {
    super('Post', postId);
  }
}

export class ScheduledPostNotFoundError extends NotFoundError {
  constructor(scheduledPostId: string) {
    super('Scheduled Post', scheduledPostId);
  }
}

export class PostAlreadyScheduledError extends ConflictError {
  constructor(postId: string) {
    super(`Post ${postId} is already scheduled`);
  }
}

export class InvalidPostStatusError extends ValidationError {
  constructor(currentStatus: string, requiredStatus: string) {
    super(`Post status must be "${requiredStatus}" but is currently "${currentStatus}"`);
  }
}