// Main exports for @content-creation/queue package

// Core exports
export { QueueManager } from './manager';
export { createRedisConnection, getRedisConnection, closeRedisConnection, getDefaultRedisConfig } from './connection';
export { defaultQueueConfig, platformRateLimits, QUEUE_NAMES, JOB_PRIORITIES } from './config';

// Queue exports
export { PublisherQueue } from './queues/publisher.queue';
export { ContentQueue } from './queues/content.queue';

// Processor exports
export { PublishPostProcessor } from './processors/publish-post.processor';
export type { PublishPostProcessorDependencies } from './processors/publish-post.processor';

export { CleanTranscriptProcessor } from './processors/clean-transcript.processor';
export type { CleanTranscriptProcessorDependencies } from './processors/clean-transcript.processor';

export { ExtractInsightsProcessor } from './processors/extract-insights.processor';
export type { ExtractInsightsProcessorDependencies } from './processors/extract-insights.processor';

export { GeneratePostsProcessor } from './processors/generate-posts.processor';
export type { GeneratePostsProcessorDependencies } from './processors/generate-posts.processor';

// Type exports
export * from './types';

// Utility exports
export { QueueLogger } from './utils/logger';
export { 
  QueueError, 
  JobProcessingError, 
  RateLimitError, 
  PublishingError,
  isRateLimitError 
} from './utils/errors';

// Re-export useful BullMQ types
export { Job, Queue, Worker, QueueEvents } from 'bullmq';
export type { JobsOptions, WorkerOptions, QueueOptions } from 'bullmq';