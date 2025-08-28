/**
 * @content-creation/types - Shared Type Definitions
 * 
 * Centralized type definitions for the content creation platform.
 * Exports shared application types only.
 */

// Export common types and interfaces
export * from './common';

// Export queue and event types
export * from './queue';
export * from './events';

// Re-export specific types for convenience
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

// Re-export queue types
export type {
  QueueJobStatus,
  QueueJob,
  QueueJobError,
  QueueJobTimestamps,
  ProcessingState,
  QueueName,
} from './queue';

// Re-export event types
export type {
  ProcessingEventType,
  ProcessingEvent,
  ProcessingEventPayload,
  ProcessingSSEEvent,
  ProcessingNotificationPreferences,
} from './events';

// Helper functions
export { ok, err } from './common';
export { getQueueNameFromJobId, getEntityIdFromJobId, QUEUE_NAMES } from './queue';
export { DEFAULT_PROCESSING_NOTIFICATIONS } from './events';