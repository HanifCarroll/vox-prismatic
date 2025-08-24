/**
 * @content-creation/database
 * 
 * Comprehensive SQLite database layer for the entire content creation pipeline
 * Replaces Notion with a local, performant database solution
 */

// Database connection and management
export {
  initDatabase,
  getDatabase,
  closeDatabase,
  withTransaction,
  getDatabaseStats,
  resetDatabase,
  backupDatabase
} from './connection';

// Schema and migrations
export { createSchema, SCHEMA_VERSION } from './schema';

// Transcripts data access layer
export {
  createTranscript,
  getTranscript,
  getTranscripts,
  updateTranscriptStatus,
  updateTranscript,
  deleteTranscript,
  searchTranscripts,
  getTranscriptStats,
  TranscriptRecord,
  CreateTranscriptData
} from './transcripts';

// Insights data access layer  
export {
  createInsight,
  getInsight,
  getInsights,
  updateInsightStatus,
  bulkUpdateInsightStatus,
  getInsightsNeedingReview,
  getApprovedInsights,
  searchInsights,
  getInsightStats,
  deleteInsight,
  InsightRecord,
  CreateInsightData
} from './insights';

// Posts data access layer
export {
  createPost,
  getPost,
  getPosts,
  updatePostStatus,
  updatePost,
  getPostsNeedingReview,
  getApprovedPosts,
  searchPosts,
  getPostStats,
  deletePost,
  bulkUpdatePostStatus,
  PostRecord,
  CreatePostData
} from './posts';

// Scheduled posts data access layer
export {
  createScheduledPost,
  getPendingScheduledPosts,
  getScheduledPosts,
  updateScheduledPostStatus,
  incrementScheduledPostRetryCount,
  deleteScheduledPost,
  getScheduledPostStats,
  ScheduledPostRecord,
  CreateScheduledPostData
} from './scheduled-posts';

// Re-export shared types for convenience
export type {
  Result,
  PostType
} from '@content-creation/shared';