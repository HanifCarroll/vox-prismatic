import { QueueConfig } from './types/config';
import { getDefaultRedisConfig } from './connection';

// Default queue configuration
export const defaultQueueConfig: QueueConfig = {
  redis: getDefaultRedisConfig(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100,     // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      count: 500,         // Keep last 500 failed jobs
    },
  },
};

// Platform-specific rate limits (requests per time window)
export const platformRateLimits = {
  linkedin: {
    max: 10,          // 10 posts
    duration: 60000,  // per minute
  },
  x: {
    max: 50,          // 50 posts  
    duration: 900000, // per 15 minutes (Twitter's rate limit window)
  },
};

// Queue names
export const QUEUE_NAMES = {
  PUBLISHER: 'social-publisher',
  PROCESSOR: 'content-processor',
  ANALYTICS: 'analytics',
} as const;

// Content processing queue names (avoid ':' which BullMQ disallows in queue names)
export const CONTENT_QUEUE_NAMES = {
  CLEAN_TRANSCRIPT: 'content-clean-transcript',
  EXTRACT_INSIGHTS: 'content-extract-insights',
  GENERATE_POSTS: 'content-generate-posts',
} as const;

// Job priorities
export const JOB_PRIORITIES = {
  LOW: 10,
  NORMAL: 0,
  HIGH: -10,
  CRITICAL: -20,
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
export type JobPriority = typeof JOB_PRIORITIES[keyof typeof JOB_PRIORITIES];
export type ContentQueueName = typeof CONTENT_QUEUE_NAMES[keyof typeof CONTENT_QUEUE_NAMES];