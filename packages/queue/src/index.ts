// Main exports for @content-creation/queue package

// Core exports
export { QueueManager } from './manager';
export { createRedisConnection, getRedisConnection, closeRedisConnection, getDefaultRedisConfig } from './connection';
export { defaultQueueConfig, platformRateLimits, QUEUE_NAMES, JOB_PRIORITIES } from './config';

// Queue exports
export { PublisherQueue } from './queues/publisher.queue';

// Processor exports
export { PublishPostProcessor } from './processors/publish-post.processor';
export type { PublishPostProcessorDependencies } from './processors/publish-post.processor';

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