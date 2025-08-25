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

// Drizzle-inferred types - single source of truth
import * as schema from './schema';
export type TranscriptSelect = typeof schema.transcripts.$inferSelect;
export type TranscriptInsert = typeof schema.transcripts.$inferInsert;
export type InsightSelect = typeof schema.insights.$inferSelect;
export type InsightInsert = typeof schema.insights.$inferInsert;
export type PostSelect = typeof schema.posts.$inferSelect;
export type PostInsert = typeof schema.posts.$inferInsert;
export type ScheduledPostSelect = typeof schema.scheduledPosts.$inferSelect;
export type ScheduledPostInsert = typeof schema.scheduledPosts.$inferInsert;

// View types for UI components (transformed from DB types)
export interface TranscriptView {
  id: string;
  title: string;
  status: 'raw' | 'processing' | 'cleaned' | 'insights_generated' | 'posts_created' | 'error';
  sourceType: 'recording' | 'upload' | 'manual' | 'youtube' | 'podcast' | 'article';
  sourceUrl?: string;
  fileName?: string;
  rawContent: string;
  cleanedContent?: string;
  wordCount: number;
  duration?: number; // In seconds for audio/video
  createdAt: Date;
  updatedAt: Date;
}


// Keep essential shared types without the old package
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export type PostType = 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';

// Repository exports
export { BaseRepository } from './repositories/base-repository';
export { TranscriptRepository } from './repositories/transcript-repository';
export { InsightRepository, type InsightView } from './repositories/insight-repository';
export { PostRepository, type PostView } from './repositories/post-repository';
export { 
  ScheduledPostRepository, 
  type ScheduledPostView, 
  type CalendarEvent 
} from './repositories/scheduled-post-repository';

// Service layer exports
export { 
  PostService,
  type PostWithSchedule,
  type SchedulePostRequest,
  type BulkScheduleRequest
} from './services/post-service';

// Filter and utility types
export * from './types/filters';