import { eq, desc, like, or, and, count } from 'drizzle-orm';
import { BaseRepository } from './base-repository';
import { 
  posts as postsTable,
  insights as insightsTable,
  transcripts as transcriptsTable,
  type Post, 
  type NewPost 
} from '../schema';
import type { Result } from '../index';
import type { PostFilter, StatsResult } from '../types/filters';

/**
 * PostView interface (matches the current API structure)
 */
export interface PostView {
  id: string;
  insightId: string;
  title: string;
  content: string;
  platform: 'linkedin' | 'x';
  status: 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived';
  characterCount?: number;
  createdAt: Date;
  updatedAt: Date;
  insightTitle?: string;
  transcriptTitle?: string;
}

/**
 * PostRepository - Handle all post data operations
 * Replaces direct database access and complex JOIN logic in API routes
 */
export class PostRepository extends BaseRepository {

  /**
   * Convert database post (with related data) to PostView format
   */
  private convertToView(post: any): PostView {
    return {
      id: post.id,
      insightId: post.insightId,
      title: post.title,
      platform: post.platform,
      content: post.content,
      status: post.status,
      characterCount: post.characterCount || undefined,
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt),
      insightTitle: post.insightTitle || undefined,
      transcriptTitle: post.transcriptTitle || undefined,
    };
  }

  /**
   * Find posts with insight and transcript data (replaces complex JOIN logic)
   */
  async findWithRelatedData(filters?: PostFilter): Promise<Result<PostView[]>> {
    return this.execute(async () => {
      // Complex JOIN query: posts -> insights -> transcripts
      let query = this.db
        .select({
          id: postsTable.id,
          insightId: postsTable.insightId,
          title: postsTable.title,
          platform: postsTable.platform,
          content: postsTable.content,
          status: postsTable.status,
          characterCount: postsTable.characterCount,
          createdAt: postsTable.createdAt,
          updatedAt: postsTable.updatedAt,
          insightTitle: insightsTable.title,
          transcriptTitle: transcriptsTable.title,
        })
        .from(postsTable)
        .leftJoin(insightsTable, eq(postsTable.insightId, insightsTable.id))
        .leftJoin(transcriptsTable, eq(insightsTable.cleanedTranscriptId, transcriptsTable.id));

      // Build WHERE conditions
      const conditions = [];

      if (filters?.status && filters.status !== 'all') {
        conditions.push(eq(postsTable.status, filters.status));
      }

      if (filters?.platform && filters.platform !== 'all') {
        conditions.push(eq(postsTable.platform, filters.platform));
      }

      if (filters?.insightId) {
        conditions.push(eq(postsTable.insightId, filters.insightId));
      }

      // Apply search across multiple fields including related data
      if (filters?.search) {
        const searchPattern = `%${filters.search.toLowerCase()}%`;
        conditions.push(or(
          like(postsTable.title, searchPattern),
          like(postsTable.content, searchPattern),
          like(insightsTable.title, searchPattern),
          like(transcriptsTable.title, searchPattern)
        ));
      }

      // Apply WHERE clause
      if (conditions.length > 0) {
        query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
      }

      // Apply ordering
      const sortBy = filters?.sortBy || 'createdAt';
      const sortOrder = filters?.sortOrder || 'desc';

      switch (sortBy) {
        case 'platform':
          query = query.orderBy(
            sortOrder === 'desc' ? desc(postsTable.platform) : postsTable.platform
          );
          break;
        case 'status':
          query = query.orderBy(
            sortOrder === 'desc' ? desc(postsTable.status) : postsTable.status
          );
          break;
        case 'updatedAt':
          query = query.orderBy(
            sortOrder === 'desc' ? desc(postsTable.updatedAt) : postsTable.updatedAt
          );
          break;
        case 'title':
          query = query.orderBy(
            sortOrder === 'desc' ? desc(postsTable.title) : postsTable.title
          );
          break;
        default:
          query = query.orderBy(desc(postsTable.createdAt));
      }

      // Apply pagination at database level
      if (filters?.limit) {
        query = query.limit(filters.limit);
        if (filters?.offset) {
          query = query.offset(filters.offset);
        }
      }

      const dbPosts = await query;
      const postViews = dbPosts.map(this.convertToView);

      console.log(`📊 Retrieved ${postViews.length} posts with related data`);
      return postViews;
    }, 'Failed to fetch posts');
  }

  /**
   * Find post by ID with related data
   */
  async findById(id: string): Promise<Result<PostView | null>> {
    return this.execute(async () => {
      const result = await this.db
        .select({
          id: postsTable.id,
          insightId: postsTable.insightId,
          title: postsTable.title,
          platform: postsTable.platform,
          content: postsTable.content,
          status: postsTable.status,
          characterCount: postsTable.characterCount,
          createdAt: postsTable.createdAt,
          updatedAt: postsTable.updatedAt,
          insightTitle: insightsTable.title,
          transcriptTitle: transcriptsTable.title,
        })
        .from(postsTable)
        .leftJoin(insightsTable, eq(postsTable.insightId, insightsTable.id))
        .leftJoin(transcriptsTable, eq(insightsTable.cleanedTranscriptId, transcriptsTable.id))
        .where(eq(postsTable.id, id))
        .limit(1);

      return result[0] ? this.convertToView(result[0]) : null;
    }, `Failed to fetch post ${id}`);
  }

  /**
   * Create new post
   */
  async create(data: Partial<NewPost> & { insightId: string; title: string; content: string; platform: 'linkedin' | 'x' }): Promise<Result<PostView>> {
    return this.execute(async () => {
      const now = this.now();
      const id = this.generateId('post');

      const newPostData: NewPost = {
        id,
        insightId: data.insightId,
        title: data.title,
        content: data.content,
        platform: data.platform,
        status: data.status || 'draft',
        characterCount: data.content.length,
        createdAt: now,
        updatedAt: now
      };

      await this.db.insert(postsTable).values(newPostData);

      // Fetch the created post with related data
      const result = await this.findById(id);
      if (!result.success || !result.data) {
        throw new Error(`Failed to fetch created post: ${id}`);
      }

      console.log(`📝 Created post: ${id} - "${data.title}" for ${data.platform}`);
      return result.data;
    }, 'Failed to create post');
  }

  /**
   * Update post
   */
  async update(id: string, data: Partial<NewPost>): Promise<Result<PostView>> {
    return this.execute(async () => {
      const updateData: any = {
        ...data,
        updatedAt: this.now()
      };

      // Recalculate character count if content is updated
      if (data.content) {
        updateData.characterCount = data.content.length;
      }

      await this.db
        .update(postsTable)
        .set(updateData)
        .where(eq(postsTable.id, id));

      // Fetch updated post with related data
      const result = await this.findById(id);
      if (!result.success || !result.data) {
        throw new Error(`Post not found after update: ${id}`);
      }

      console.log(`📝 Updated post: ${id}`);
      return result.data;
    }, `Failed to update post ${id}`);
  }

  /**
   * Update post status
   */
  async updateStatus(id: string, status: Post['status']): Promise<Result<void>> {
    return this.execute(async () => {
      const result = await this.db
        .update(postsTable)
        .set({ 
          status, 
          updatedAt: this.now() 
        })
        .where(eq(postsTable.id, id));

      if (result.changes === 0) {
        throw new Error(`Post not found: ${id}`);
      }

      console.log(`📊 Post ${id} status updated to: ${status}`);
    }, `Failed to update post status for ${id}`);
  }

  /**
   * Get posts by insight ID
   */
  async getByInsightId(insightId: string): Promise<Result<PostView[]>> {
    return this.findWithRelatedData({ insightId });
  }

  /**
   * Get posts by platform
   */
  async getByPlatform(platform: 'linkedin' | 'x'): Promise<Result<PostView[]>> {
    return this.findWithRelatedData({ platform });
  }

  /**
   * Get posts by status
   */
  async getByStatus(status: Post['status']): Promise<Result<PostView[]>> {
    return this.findWithRelatedData({ status });
  }

  /**
   * Get post statistics for dashboard
   */
  async getStats(): Promise<Result<StatsResult>> {
    return this.execute(async () => {
      // Get total count
      const [totalResult] = await this.db
        .select({ count: count() })
        .from(postsTable);

      const total = totalResult?.count || 0;

      // Get counts by status using raw SQLite connection
      const statusResults = this.sqlite.prepare(
        'SELECT status, COUNT(*) as count FROM posts GROUP BY status'
      ).all() as { status: string; count: number }[];

      const byStatus: Record<string, number> = {};
      for (const row of statusResults) {
        byStatus[row.status] = Number(row.count);
      }

      console.log(`📊 Post stats - Total: ${total}, By status:`, byStatus);

      return {
        total,
        byStatus
      };
    }, 'Failed to get post statistics');
  }

  /**
   * Delete post
   */
  async delete(id: string): Promise<Result<void>> {
    return this.execute(async () => {
      const result = await this.db
        .delete(postsTable)
        .where(eq(postsTable.id, id));

      if (result.changes === 0) {
        throw new Error(`Post not found: ${id}`);
      }

      console.log(`🗑️ Deleted post: ${id}`);
    }, `Failed to delete post ${id}`);
  }
}