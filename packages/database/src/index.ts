/**
 * @content-creation/database
 * 
 * Proper Drizzle-based SQLite database layer with separate domain tables
 */

// Database connection and management
export {
  initDatabase,
  getDatabase,
  getSQLiteConnection,
  closeDatabase,
  withTransaction,
  runMigrations,
  resetDatabase,
  backupDatabase,
  getDatabaseStats
} from './connection';

// Schema and types - separate tables for each domain
export {
  transcripts,
  insights,
  posts,
  scheduledPosts,
  processingJobs,
  analyticsEvents,
  settings,
  SCHEMA_VERSION,
  type Transcript,
  type NewTranscript,
  type Insight,
  type NewInsight,
  type Post,
  type NewPost,
  type ScheduledPost,
  type NewScheduledPost,
  type ProcessingJob,
  type NewProcessingJob,
  type AnalyticsEvent,
  type NewAnalyticsEvent,
  type Setting,
  type NewSetting
} from './schema';

// TODO: Create proper Drizzle-based repository functions
// For now, consumers should use the schema and connection directly

// Re-export shared types for convenience
export type {
  Result,
  PostType
} from '@content-creation/shared';