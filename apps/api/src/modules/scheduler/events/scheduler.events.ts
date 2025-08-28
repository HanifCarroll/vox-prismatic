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

// Event name constants for type safety
export const SCHEDULER_EVENTS = {
  SCHEDULE_REQUESTED: 'post.schedule.requested',
  UNSCHEDULE_REQUESTED: 'post.unschedule.requested',
  SCHEDULED: 'post.scheduled',
  UNSCHEDULED: 'post.unscheduled',
  SCHEDULE_FAILED: 'post.schedule.failed',
  UNSCHEDULE_FAILED: 'post.unschedule.failed',
} as const;