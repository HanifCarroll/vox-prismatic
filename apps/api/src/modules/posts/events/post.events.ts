import { PostEntity } from '../entities/post.entity';
import { PostStateMachineContext } from '../state/post-state-machine';

/**
 * Event emitted when a post's state changes through the state machine
 */
export interface PostStateChangedEvent {
  postId: string;
  previousState: string;
  newState: string;
  event: string;
  context: PostStateMachineContext;
  timestamp: Date;
}

/**
 * Event emitted when a post is approved and becomes eligible for scheduling
 */
export interface PostApprovedEvent {
  postId: string;
  post: PostEntity;
  timestamp: Date;
  approvedBy?: string;
}

/**
 * Event emitted when a post is rejected during review
 */
export interface PostRejectedEvent {
  postId: string;
  post: PostEntity;
  rejectedBy?: string;
  reason?: string;
  timestamp: Date;
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

/**
 * Event emitted when an invalid state transition is attempted
 */
export interface PostInvalidTransitionEvent {
  postId: string;
  currentState: string;
  attemptedEvent: string;
  availableTransitions: string[];
  timestamp: Date;
}

/**
 * Event emitted when posts are generated from an insight
 */
export interface PostGeneratedEvent {
  insightId: string;
  postIds: string[];
  platforms: string[];
  timestamp: Date;
}

// Event name constants for type safety
export const POST_EVENTS = {
  STATE_CHANGED: 'post.state.changed',
  APPROVED: 'post.approved',
  REJECTED: 'post.rejected',
  GENERATED: 'post.generated',
  SCHEDULED: 'post.scheduled',
  UNSCHEDULED: 'post.unscheduled',
  PUBLISHED: 'post.published',
  PUBLICATION_FAILED: 'post.publication.failed',
  INVALID_TRANSITION: 'post.transition.invalid',
} as const;