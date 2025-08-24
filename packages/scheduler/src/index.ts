/**
 * @content-creation/scheduler
 * 
 * Cross-platform post scheduling system using SQLite
 * Handles delayed posting for LinkedIn, X/Twitter, and Postiz
 */

// Main scheduling functions
export {
  schedulePost,
  getScheduledPosts,
  getReadyPosts,
  cancelScheduledPost,
  markPostAsPublished,
  markPostAsFailed,
  retryPost,
  removeScheduledPost,
  getStats,
  getUpcomingPosts,
  reschedulePost,
  bulkSchedulePosts
} from './scheduler';

// Database functions (if you need lower-level access)
export {
  insertScheduledPost,
  getPendingPosts,
  updatePostStatus,
  incrementRetryCount,
  deleteScheduledPost,
  getSchedulerStats,
  closeDatabase
} from './database';

// Processor functions
export {
  processPost,
  processReadyPosts,
  runProcessor,
  startContinuousProcessor,
  ProcessorConfig
} from './processor';

// Re-export types from shared package for convenience
export type {
  ScheduledPost,
  Result
} from '@content-creation/shared';