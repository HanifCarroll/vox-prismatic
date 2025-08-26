import type { IPostRepository } from '../../interfaces';
import type { 
  Result, 
  PostView, 
  PostFilter, 
  StatsResult,
  PostStatus,
  Platform
} from '@content-creation/types';
import type { NewPost } from '@content-creation/types/database';
import type { Post, Insight, Transcript } from '../generated';
import { PrismaBaseRepository } from './PrismaBaseRepository';

/**
 * Prisma Post Repository
 * Implements post data operations using Prisma
 */
export class PrismaPostRepository 
  extends PrismaBaseRepository 
  implements IPostRepository {

  /**
   * Convert Prisma post to PostView format
   */
  private convertToView(
    post: Post & { 
      insight?: Insight & { transcript?: Transcript } 
    }
  ): PostView {
    return {
      id: post.id,
      insightId: post.insightId,
      title: post.title,
      content: post.content,
      platform: post.platform as Platform,
      status: post.status as PostStatus,
      characterCount: post.characterCount || undefined,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      // Include related data if available
      insightTitle: post.insight?.title,
      transcriptTitle: post.insight?.transcript?.title
    };
  }

  /**
   * Find all posts with filtering and pagination
   */
  async findAll(filters?: PostFilter): Promise<Result<PostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      // Build where clause
      const where: any = {};
      
      if (filters?.status && filters.status !== 'all') {
        where.status = filters.status;
      }
      
      if (filters?.platform && filters.platform !== 'all') {
        where.platform = filters.platform;
      }
      
      if (filters?.insightId) {
        where.insightId = filters.insightId;
      }
      
      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } }
        ];
      }
      
      // Build query options
      const options = {
        where,
        ...this.buildPagination(filters?.limit, filters?.offset),
        orderBy: this.buildOrderBy(filters?.sortBy, filters?.sortOrder),
        include: {
          insight: {
            include: {
              transcript: true
            }
          }
        }
      };
      
      const posts = await prisma.post.findMany(options);
      return posts.map(post => this.convertToView(post));
    }, 'Failed to fetch posts');
  }

  /**
   * Find post by ID
   */
  async findById(id: string): Promise<Result<PostView | null>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          insight: {
            include: {
              transcript: true
            }
          }
        }
      });
      
      return post ? this.convertToView(post) : null;
    }, 'Failed to fetch post');
  }

  /**
   * Find posts by insight ID
   */
  async findByInsightId(insightId: string): Promise<Result<PostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const posts = await prisma.post.findMany({
        where: { insightId },
        orderBy: { createdAt: 'desc' },
        include: {
          insight: {
            include: {
              transcript: true
            }
          }
        }
      });
      
      return posts.map(post => this.convertToView(post));
    }, 'Failed to fetch posts by insight ID');
  }

  /**
   * Find posts with related data (insight and scheduled posts)
   */
  async findWithRelatedData(filters?: PostFilter): Promise<Result<PostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const where: any = {};
      
      if (filters) {
        if (filters.status) where.status = filters.status;
        if (filters.platform) where.platform = filters.platform;
        if (filters.insightId) where.insightId = filters.insightId;
      }
      
      const posts = await prisma.post.findMany({
        where,
        include: {
          insight: {
            include: {
              transcript: true
            }
          },
          scheduledPosts: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return posts.map(post => this.convertToView(post));
    }, 'Failed to fetch posts with related data');
  }

  /**
   * Create new post
   */
  async create(data: NewPost): Promise<Result<PostView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      // Calculate character count if not provided
      const characterCount = data.characterCount || data.content.length;
      
      const post = await prisma.post.create({
        data: {
          id: data.id || this.generateId('post'),
          insightId: data.insightId,
          title: data.title,
          platform: data.platform,
          content: data.content,
          status: data.status || 'draft',
          characterCount
        },
        include: {
          insight: {
            include: {
              transcript: true
            }
          }
        }
      });
      
      return this.convertToView(post);
    }, 'Failed to create post');
  }

  /**
   * Create multiple posts
   */
  async createMany(data: NewPost[]): Promise<Result<PostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      // Prepare data with generated IDs and character counts
      const postsData = data.map(item => ({
        id: item.id || this.generateId('post'),
        insightId: item.insightId,
        title: item.title,
        platform: item.platform,
        content: item.content,
        status: item.status || 'draft',
        characterCount: item.characterCount || item.content.length
      }));
      
      // Use a transaction to create all posts and then fetch them
      const createdPosts = await prisma.$transaction(async (tx) => {
        await tx.post.createMany({
          data: postsData
        });
        
        // Fetch the created posts with relations
        return await tx.post.findMany({
          where: {
            id: { in: postsData.map(d => d.id) }
          },
          include: {
            insight: {
              include: {
                transcript: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      });
      
      return createdPosts.map(post => this.convertToView(post));
    }, 'Failed to create multiple posts');
  }

  /**
   * Update existing post
   */
  async update(
    id: string, 
    data: Partial<NewPost>
  ): Promise<Result<PostView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      // Recalculate character count if content is updated
      const updateData: any = {
        ...(data.title && { title: data.title }),
        ...(data.platform && { platform: data.platform }),
        ...(data.content && { 
          content: data.content,
          characterCount: data.content.length 
        }),
        ...(data.status && { status: data.status }),
        ...(data.characterCount !== undefined && !data.content && { 
          characterCount: data.characterCount 
        })
      };
      
      const post = await prisma.post.update({
        where: { id },
        data: updateData,
        include: {
          insight: {
            include: {
              transcript: true
            }
          }
        }
      });
      
      return this.convertToView(post);
    }, 'Failed to update post');
  }

  /**
   * Delete post by ID
   */
  async delete(id: string): Promise<Result<void>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      await prisma.post.delete({
        where: { id }
      });
    }, 'Failed to delete post');
  }

  /**
   * Get post statistics
   */
  async getStats(): Promise<Result<StatsResult>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const [total, byStatus] = await Promise.all([
        prisma.post.count(),
        prisma.post.groupBy({
          by: ['status'],
          _count: true
        })
      ]);
      
      const statusMap: Record<string, number> = {};
      for (const item of byStatus) {
        statusMap[item.status] = item._count;
      }
      
      return {
        total,
        byStatus: statusMap
      };
    }, 'Failed to get post statistics');
  }

  /**
   * Update post status
   */
  async updateStatus(
    id: string, 
    status: PostView['status']
  ): Promise<Result<PostView>> {
    return this.update(id, { status });
  }

  /**
   * Find posts ready for scheduling
   */
  async findReadyForScheduling(
    platform?: Platform,
    limit = 10
  ): Promise<Result<PostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const where: any = {
        status: 'approved',
        scheduledPosts: {
          none: {}  // No scheduled posts yet
        }
      };
      
      if (platform) {
        where.platform = platform;
      }
      
      const posts = await prisma.post.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: limit,
        include: {
          insight: {
            include: {
              transcript: true
            }
          }
        }
      });
      
      return posts.map(post => this.convertToView(post));
    }, 'Failed to find posts ready for scheduling');
  }

  /**
   * Find posts by status and platform
   */
  async findByStatusAndPlatform(
    status: PostView['status'],
    platform?: Platform
  ): Promise<Result<PostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const where: any = { status };
      
      if (platform) {
        where.platform = platform;
      }
      
      const posts = await prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          insight: {
            include: {
              transcript: true
            }
          }
        }
      });
      
      return posts.map(post => this.convertToView(post));
    }, 'Failed to find posts by status and platform');
  }

  /**
   * Batch update post statuses
   */
  async batchUpdateStatus(
    ids: string[], 
    status: PostView['status']
  ): Promise<Result<number>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const result = await prisma.post.updateMany({
        where: {
          id: { in: ids }
        },
        data: { status }
      });
      
      return result.count;
    }, 'Failed to batch update post statuses');
  }

  /**
   * Get posts with their associated insight and transcript titles
   */
  async findAllWithRelations(filters?: PostFilter): Promise<Result<PostView[]>> {
    // This is the same as findAll since we always include relations
    return this.findAll(filters);
  }

  /**
   * Update post content
   */
  async updateContent(
    id: string,
    content: string
  ): Promise<Result<PostView>> {
    return this.update(id, { content });
  }

  /**
   * Count posts by platform
   */
  async countByPlatform(): Promise<Result<Record<Platform, number>>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const counts = await prisma.post.groupBy({
        by: ['platform'],
        _count: true
      });
      
      const platformCounts: Record<string, number> = {};
      for (const item of counts) {
        platformCounts[item.platform as Platform] = item._count;
      }
      
      // Ensure all platforms are represented
      const result: Record<Platform, number> = {
        linkedin: platformCounts.linkedin || 0,
        x: platformCounts.x || 0
      };
      
      return result;
    }, 'Failed to count posts by platform');
  }
}