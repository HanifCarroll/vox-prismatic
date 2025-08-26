/**
 * Services barrel export
 * Provides convenient access to all service classes
 */

// Core post operations
export { PostService, type PostWithSchedule } from './post-service';

// Scheduling operations
export { 
  SchedulingService, 
  type SchedulePostRequest, 
  type BulkScheduleRequest 
} from './scheduling-service';

// Publishing operations
export { 
  PublisherService, 
  type PublishingCredentials, 
  type PublishResult 
} from './publisher';

// Analytics and reporting
export { 
  PostAnalyticsService, 
  type DashboardStatistics, 
  type ActivityFeedItem, 
  type PostPerformanceMetrics 
} from './post-analytics-service';