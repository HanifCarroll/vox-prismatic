/**
 * Event emitted when a post scheduling is requested
 */
export interface PostScheduleRequestedEvent {
  postId: string;
  scheduledPostId: string;
  platform: 'linkedin' | 'x';
  scheduledTime: Date;
  jobData: {
    scheduledPostId: string;
    postId: string;
    platform: 'linkedin' | 'x';
    content: string;
    credentials: {
      accessToken: string;
      clientId?: string;
      clientSecret?: string;
    };
    metadata?: Record<string, any>;
  };
  timestamp: Date;
}

/**
 * Event emitted when a post unscheduling is requested
 */
export interface PostUnscheduleRequestedEvent {
  scheduledPostId: string;
  queueJobId: string;
  reason?: string;
  timestamp: Date;
}

/**
 * Event emitted when a post has been successfully scheduled in the queue
 */
export interface PostScheduledEvent {
  postId: string;
  scheduledPostId: string;
  queueJobId: string;
  platform: 'linkedin' | 'x';
  scheduledTime: Date;
  timestamp: Date;
}

/**
 * Event emitted when a post has been successfully unscheduled from the queue
 */
export interface PostUnscheduledEvent {
  postId: string;
  scheduledPostId: string;
  queueJobId: string;
  timestamp: Date;
}

/**
 * Event emitted when post scheduling fails
 */
export interface PostScheduleFailedEvent {
  postId: string;
  scheduledPostId: string;
  error: string;
  timestamp: Date;
}

/**
 * Event emitted when post unscheduling fails
 */
export interface PostUnscheduleFailedEvent {
  scheduledPostId: string;
  queueJobId: string;
  error: string;
  timestamp: Date;
}

/**
 * Event emitted when a scheduled post is queued for publishing
 */
export interface ScheduledPostQueuedEvent {
  scheduledPostId: string;
  postId: string;
  platform: 'linkedin' | 'x';
  queueJobId?: string;
  timestamp: Date;
}

/**
 * Event emitted when a scheduled post starts publishing
 */
export interface ScheduledPostPublishingEvent {
  scheduledPostId: string;
  postId: string;
  platform: 'linkedin' | 'x';
  timestamp: Date;
}

/**
 * Event emitted when a scheduled post is published successfully
 */
export interface ScheduledPostPublishedEvent {
  scheduledPostId: string;
  postId: string;
  platform: 'linkedin' | 'x';
  externalPostId: string;
  publishedAt: Date;
  timestamp: Date;
}

/**
 * Event emitted when a scheduled post is cancelled
 */
export interface ScheduledPostCancelledEvent {
  scheduledPostId: string;
  postId: string;
  platform: 'linkedin' | 'x';
  reason: string;
  cancelledAt: Date;
  timestamp: Date;
}

/**
 * Event emitted when a scheduled post expires
 */
export interface ScheduledPostExpiredEvent {
  scheduledPostId: string;
  postId: string;
  platform: 'linkedin' | 'x';
  scheduledTime: Date;
  expiredAt: Date;
  timestamp: Date;
}

/**
 * Event emitted when a scheduled post state changes
 */
export interface ScheduledPostStateChangedEvent {
  scheduledPostId: string;
  postId: string;
  previousState: string;
  newState: string;
  event: string;
  context: any;
  timestamp: Date;
}

/**
 * Event emitted when a scheduled post fails (with retry information)
 */
export interface ScheduledPostFailedEvent {
  scheduledPostId: string;
  postId: string;
  platform: 'linkedin' | 'x';
  error: string;
  retryCount: number;
  maxRetries: number;
  willRetry: boolean;
  nextRetryDelay?: number;
  timestamp: Date;
}

/**
 * Event emitted when a scheduled post is retrying
 */
export interface ScheduledPostRetryingEvent {
  scheduledPostId: string;
  postId: string;
  platform: 'linkedin' | 'x';
  retryCount: number;
  retryDelay: number;
  timestamp: Date;
}

// Event name constants for type safety
export const SCHEDULER_EVENTS = {
  SCHEDULE_REQUESTED: 'post.schedule.requested',
  UNSCHEDULE_REQUESTED: 'post.unschedule.requested',
  SCHEDULED: 'post.scheduled',
  UNSCHEDULED: 'post.unscheduled',
  SCHEDULE_FAILED: 'post.schedule.failed',
  UNSCHEDULE_FAILED: 'post.unschedule.failed',
  // New state machine events
  QUEUED: 'scheduled.post.queued',
  PUBLISHING: 'scheduled.post.publishing',
  PUBLISHED: 'scheduled.post.published',
  FAILED: 'scheduled.post.failed',
  RETRYING: 'scheduled.post.retrying',
  CANCELLED: 'scheduled.post.cancelled',
  EXPIRED: 'scheduled.post.expired',
  STATE_CHANGED: 'scheduled.post.state.changed',
} as const;