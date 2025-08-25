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

// Database functions - using centralized database package
export {
  createScheduledPost,
  getPendingScheduledPosts,
  updateScheduledPostStatus,
  incrementScheduledPostRetryCount,
  deleteScheduledPost,
  getScheduledPostStats
} from '@content-creation/database';

// Processor functions
export {
  processPost,
  processReadyPosts,
  runProcessor,
  startContinuousProcessor,
  ProcessorConfig
} from './processor';

// Re-export types from database package for convenience
export type {
  ScheduledPostRecord,
  Result
} from '@content-creation/database';