/**
 * @content-creation/types - Shared Type Definitions
 * 
 * Centralized type definitions for the content creation platform.
 * Exports shared application types only.
 */

// Export all enums (must be exported as values)
export * from './enums';

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

// Queue types are now exported from enums.ts

export type {
  QueueJob,
  QueueJobError,
  QueueJobTimestamps,
  ProcessingState,
  QueueName,
} from './queue';

// Re-export event types (enums need to be exported as values)
export {
  ProcessingEventType,  // Export as value since it's an enum
} from './events';

export type {
  ProcessingEvent,
  ProcessingEventPayload,
  ProcessingSSEEvent,
  ProcessingNotificationPreferences,
} from './events';

// Helper functions
export { ok, err } from './common';
export { getQueueNameFromJobId, getEntityIdFromJobId, QUEUE_NAMES } from './queue';
export { DEFAULT_PROCESSING_NOTIFICATIONS } from './events';

// Processing state utilities
export {
  computeProcessingState,
  isEntityProcessing,
  isEntityFailed,
  isEntityWaiting,
  isEntityCompleted,
  getProcessingStatusMessage,
  getJobErrorMessage
} from './processing-state.utils';