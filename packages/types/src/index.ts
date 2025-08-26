/**
 * @content-creation/types - Shared Type Definitions
 * 
 * Centralized type definitions for the content creation platform.
 * Exports both database types (Drizzle-inferred) and application types.
 */

// Export all database schema and types
export * from './database';

// Export common types and interfaces
export * from './common';

// Re-export specific types for convenience
export type {
  // Database entities (Drizzle-inferred)
  Transcript,
  NewTranscript,
  Insight,
  NewInsight,
  Post,
  NewPost,
  ScheduledPost,
  NewScheduledPost,
  ProcessingJob,
  NewProcessingJob,
  AnalyticsEvent,
  NewAnalyticsEvent,
  Setting,
  NewSetting,
} from './database';

export type {
  // Common types
  Result,
  AsyncResult,
  Platform,
  PostType,
  TranscriptStatus,
  InsightStatus,
  PostStatus,
  ScheduledPostStatus,
  JobStatus,
  JobType,
  SourceType,
  EntityType,
  
  // View interfaces (with joined data)
  TranscriptView,
  InsightView,
  PostView,
  ScheduledPostView,
  
  // Filter interfaces
  BaseFilter,
  TranscriptFilter,
  InsightFilter,
  PostFilter,
  ScheduledPostFilter,
  
  // API response types
  ApiResponse,
  ApiListResponse,
  
  // Dashboard types
  DashboardCounts,
  DashboardActivity,
  DashboardData,
  DashboardStats,
  ActivityItem,
  RecentActivityResponse,
  StatsResult,
  ScheduledPostStats,
  
  // Bulk operation types
  BulkInsightsResponse,
  GenerateInsightsResponse,
  GeneratePostsResponse,
  
  // UI-specific types
  SidebarCounts,
  CalendarEvent,
} from './common';

// Helper functions
export { ok, err } from './common';