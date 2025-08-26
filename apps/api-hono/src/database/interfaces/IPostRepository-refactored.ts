/**
 * Refactored Post Repository Interface
 * Simplified and consistent with base repository patterns
 */

import type { 
  Result, 
  PostView, 
  PostFilter,
  Platform,
  PostStatus
} from '@content-creation/types';
import type { NewPost } from '@content-creation/types/database';
import type { IRelationalRepository, IPaginatedResult } from './repository-base';

/**
 * Post entity with full relations
 */
export interface PostWithRelations extends PostView {
  insight?: {
    id: string;
    title: string;
    content: string;
    category?: string;
  };
  transcript?: {
    id: string;
    title: string;
    sourceUrl?: string;
  };
  scheduledPosts?: Array<{
    id: string;
    scheduledTime: string;
    platform: Platform;
    status: string;
  }>;
}

/**
 * Post-specific create data (without auto-generated fields)
 */
export type CreatePostData = Omit<NewPost, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Post-specific update data
 */
export type UpdatePostData = Partial<Omit<NewPost, 'id' | 'createdAt'>>;

/**
 * Simplified Post Repository Interface
 * Extends base patterns and adds only post-specific operations
 */
export interface IPostRepositoryRefactored 
  extends IRelationalRepository<PostView, PostWithRelations, PostFilter, CreatePostData, UpdatePostData> {
  
  // ===== Core Domain Operations =====
  
  /**
   * Find posts by insight ID
   */
  findByInsightId(insightId: string): Promise<Result<PostView[]>>;

  /**
   * Find posts by status
   */
  findByStatus(status: PostStatus, filter?: PostFilter): Promise<Result<PostView[]>>;

  /**
   * Find posts by platform
   */
  findByPlatform(platform: Platform, filter?: PostFilter): Promise<Result<PostView[]>>;

  // ===== Batch Operations =====

  /**
   * Update multiple post statuses
   */
  updateManyStatuses(ids: string[], status: PostStatus): Promise<Result<number>>;

  // ===== Statistics =====

  /**
   * Get post counts grouped by status
   */
  getStatusCounts(): Promise<Result<Record<PostStatus, number>>>;

  /**
   * Get post counts grouped by platform
   */
  getPlatformCounts(): Promise<Result<Record<Platform, number>>>;

  // ===== Pagination Support =====

  /**
   * Get paginated posts
   */
  findPaginated(filter?: PostFilter): Promise<Result<IPaginatedResult<PostView>>>;

  /**
   * Get paginated posts with relations
   */
  findPaginatedWithRelations(filter?: PostFilter): Promise<Result<IPaginatedResult<PostWithRelations>>>;
}

/**
 * Business logic that was incorrectly in repositories
 * Should be moved to services or domain layer
 * 
 * REMOVED from repository:
 * - updateContent() - just use update() with content field
 * - findReadyForScheduling() - business logic, belongs in scheduling service
 * - updateStatus() - just use update() with status field
 * - getStats() - too vague, replaced with specific count methods
 * - findByStatusAndPlatform() - can use findMany with filter
 * 
 * These operations should be in services where they belong
 */