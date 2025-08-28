import { PostEntity } from '../entities/post.entity';

/**
 * Event emitted when a post is approved and becomes eligible for scheduling
 */
export interface PostApprovedEvent {
  postId: string;
  post: PostEntity;
  timestamp: Date;
  approvedBy?: string; // Future: track who approved the post
}

/**
 * Event emitted when a post is scheduled
 */
export interface PostScheduledEvent {
  postId: string;
  scheduledPostId: string;
  platform: 'linkedin' | 'x';
  scheduledTime: Date;
  timestamp: Date;
}

/**
 * Event emitted when a post is unscheduled
 */
export interface PostUnscheduledEvent {
  postId: string;
  scheduledPostId: string;
  platform: 'linkedin' | 'x';
  reason?: string;
  timestamp: Date;
}

/**
 * Event emitted when a post is published
 */
export interface PostPublishedEvent {
  postId: string;
  scheduledPostId: string;
  platform: 'linkedin' | 'x';
  externalPostId: string;
  publishedAt: Date;
  timestamp: Date;
}

/**
 * Event emitted when post publication fails
 */
export interface PostPublicationFailedEvent {
  postId: string;
  scheduledPostId: string;
  platform: 'linkedin' | 'x';
  error: string;
  retryCount: number;
  timestamp: Date;
}

// Event name constants for type safety
export const POST_EVENTS = {
  APPROVED: 'post.approved',
  SCHEDULED: 'post.scheduled',
  UNSCHEDULED: 'post.unscheduled',
  PUBLISHED: 'post.published',
  PUBLICATION_FAILED: 'post.publication.failed',
} as const;