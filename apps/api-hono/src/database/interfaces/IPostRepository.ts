import type { 
  Result, 
  PostView, 
  PostFilter,
  StatsResult,
  Platform
} from '@content-creation/types';
import type { NewPost } from '@content-creation/types/database';

/**
 * Post Repository Interface
 * Defines all operations for post data management
 */
export interface IPostRepository {
  /**
   * Find all posts with filtering and pagination
   */
  findAll(filters?: PostFilter): Promise<Result<PostView[]>>;

  /**
   * Find post by ID
   */
  findById(id: string): Promise<Result<PostView | null>>;

  /**
   * Find posts by insight ID
   */
  findByInsightId(insightId: string): Promise<Result<PostView[]>>;

  /**
   * Create new post
   */
  create(data: NewPost): Promise<Result<PostView>>;

  /**
   * Create multiple posts
   */
  createMany(data: NewPost[]): Promise<Result<PostView[]>>;

  /**
   * Update existing post
   */
  update(id: string, data: Partial<NewPost>): Promise<Result<PostView>>;

  /**
   * Delete post by ID
   */
  delete(id: string): Promise<Result<void>>;

  /**
   * Get post statistics
   */
  getStats(): Promise<Result<StatsResult>>;

  /**
   * Update post status
   */
  updateStatus(
    id: string, 
    status: PostView['status']
  ): Promise<Result<PostView>>;

  /**
   * Find posts ready for scheduling
   */
  findReadyForScheduling(
    platform?: Platform,
    limit?: number
  ): Promise<Result<PostView[]>>;

  /**
   * Find posts by status and platform
   */
  findByStatusAndPlatform(
    status: PostView['status'],
    platform?: Platform
  ): Promise<Result<PostView[]>>;

  /**
   * Batch update post statuses
   */
  batchUpdateStatus(
    ids: string[], 
    status: PostView['status']
  ): Promise<Result<number>>;

  /**
   * Get posts with their associated insight and transcript titles
   */
  findAllWithRelations(filters?: PostFilter): Promise<Result<PostView[]>>;

  /**
   * Update post content
   */
  updateContent(
    id: string,
    content: string
  ): Promise<Result<PostView>>;

  /**
   * Count posts by platform
   */
  countByPlatform(): Promise<Result<Record<Platform, number>>>;
}