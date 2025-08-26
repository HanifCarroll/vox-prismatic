import type { 
  Result, 
  ScheduledPostView, 
  ScheduledPostFilter,
  ScheduledPostStats,
  Platform
} from '@content-creation/types';
import type { NewScheduledPost } from '@content-creation/types/database';

/**
 * Scheduled Post Repository Interface
 * Defines all operations for scheduled post data management
 */
export interface IScheduledPostRepository {
  /**
   * Find all scheduled posts with filtering and pagination
   */
  findAll(filters?: ScheduledPostFilter): Promise<Result<ScheduledPostView[]>>;

  /**
   * Find scheduled post by ID
   */
  findById(id: string): Promise<Result<ScheduledPostView | null>>;

  /**
   * Find scheduled posts by post ID
   */
  findByPostId(postId: string): Promise<Result<ScheduledPostView[]>>;

  /**
   * Create new scheduled post
   */
  create(data: NewScheduledPost): Promise<Result<ScheduledPostView>>;

  /**
   * Create multiple scheduled posts
   */
  createMany(data: NewScheduledPost[]): Promise<Result<ScheduledPostView[]>>;

  /**
   * Update existing scheduled post
   */
  update(id: string, data: Partial<NewScheduledPost>): Promise<Result<ScheduledPostView>>;

  /**
   * Delete scheduled post by ID
   */
  delete(id: string): Promise<Result<void>>;

  /**
   * Get scheduled post statistics
   */
  getStats(): Promise<Result<ScheduledPostStats>>;

  /**
   * Update scheduled post status
   */
  updateStatus(
    id: string, 
    status: ScheduledPostView['status'],
    errorMessage?: string
  ): Promise<Result<ScheduledPostView>>;

  /**
   * Find posts due for publishing
   */
  findDueForPublishing(
    beforeTime?: string,
    limit?: number
  ): Promise<Result<ScheduledPostView[]>>;

  /**
   * Find upcoming scheduled posts
   */
  findUpcoming(
    hours: number,
    platform?: Platform
  ): Promise<Result<ScheduledPostView[]>>;

  /**
   * Reschedule a post
   */
  reschedule(
    id: string,
    newTime: string
  ): Promise<Result<ScheduledPostView>>;

  /**
   * Cancel scheduled post
   */
  cancel(id: string): Promise<Result<ScheduledPostView>>;

  /**
   * Mark post as published
   */
  markAsPublished(
    id: string,
    externalPostId?: string
  ): Promise<Result<ScheduledPostView>>;

  /**
   * Mark post as failed
   */
  markAsFailed(
    id: string,
    errorMessage: string,
    incrementRetry?: boolean
  ): Promise<Result<ScheduledPostView>>;

  /**
   * Get calendar events for date range
   */
  getCalendarEvents(
    startDate: string,
    endDate: string,
    platform?: Platform
  ): Promise<Result<ScheduledPostView[]>>;

  /**
   * Check for scheduling conflicts
   */
  checkConflicts(
    scheduledTime: string,
    platform: Platform,
    excludeId?: string
  ): Promise<Result<boolean>>;
}