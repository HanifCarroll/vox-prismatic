// Custom error classes for queue operations

export class QueueError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'QueueError';
  }
}

export class JobProcessingError extends Error {
  constructor(
    message: string,
    public readonly jobId: string,
    public readonly attemptNumber: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'JobProcessingError';
  }
}

export class RateLimitError extends Error {
  constructor(
    public readonly platform: string,
    public readonly retryAfter: number
  ) {
    super(`Rate limit exceeded for ${platform}. Retry after ${retryAfter}ms`);
    this.name = 'RateLimitError';
  }
}

export class PublishingError extends Error {
  constructor(
    message: string,
    public readonly platform: string,
    public readonly postId: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'PublishingError';
  }
}

export function isRateLimitError(error: any): boolean {
  if (error instanceof RateLimitError) return true;
  
  // Check for common rate limit error patterns from social media APIs
  const errorMessage = error?.message?.toLowerCase() || '';
  const statusCode = error?.response?.status || error?.statusCode;
  
  return (
    statusCode === 429 ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('quota exceeded')
  );
}