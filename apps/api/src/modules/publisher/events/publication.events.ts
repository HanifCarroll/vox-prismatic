import { Platform } from '@content-creation/types';

/**
 * Event emitted when a post is successfully published to a social media platform
 */
export interface PostPublishedEvent {
  scheduledPostId: string;
  postId: string | null;
  platform: Platform;
  externalPostId: string;
  publishedAt: Date;
  content: string;
  timestamp: Date;
}

/**
 * Event emitted when post publication fails
 */
export interface PostPublicationFailedEvent {
  scheduledPostId: string;
  postId: string | null;
  platform: Platform;
  error: string;
  retryCount: number;
  maxRetries: number;
  willRetry: boolean;
  failedAt: Date;
  timestamp: Date;
}

/**
 * Event emitted when a post publication is retried
 */
export interface PostPublicationRetriedEvent {
  scheduledPostId: string;
  postId: string | null;
  platform: Platform;
  retryCount: number;
  previousError: string;
  timestamp: Date;
}

/**
 * Event emitted when a post publication permanently fails (max retries exceeded)
 */
export interface PostPublicationPermanentlyFailedEvent {
  scheduledPostId: string;
  postId: string | null;
  platform: Platform;
  finalError: string;
  totalAttempts: number;
  firstFailedAt: Date;
  permanentlyFailedAt: Date;
  timestamp: Date;
}

// Event name constants for type safety
export const PUBLICATION_EVENTS = {
  PUBLISHED: 'publication.published',
  FAILED: 'publication.failed',
  RETRIED: 'publication.retried',
  PERMANENTLY_FAILED: 'publication.permanently_failed',
} as const;