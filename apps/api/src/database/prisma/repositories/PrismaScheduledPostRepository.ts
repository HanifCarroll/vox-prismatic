import type { IScheduledPostRepository } from '../../interfaces';
import type { 
  Result, 
  ScheduledPostView, 
  ScheduledPostFilter, 
  ScheduledPostStats,
  ScheduledPostStatus,
  Platform
} from '@content-creation/types';
import type { NewScheduledPost } from '@content-creation/types/database';
import type { ScheduledPost } from '../generated';
import { PrismaBaseRepository } from './PrismaBaseRepository';

/**
 * Prisma Scheduled Post Repository
 * Implements scheduled post data operations using Prisma
 */
export class PrismaScheduledPostRepository 
  extends PrismaBaseRepository 
  implements IScheduledPostRepository {

  /**
   * Convert Prisma scheduled post to ScheduledPostView format
   */
  private convertToView(scheduledPost: ScheduledPost): ScheduledPostView {
    return {
      id: scheduledPost.id,
      postId: scheduledPost.postId,
      platform: scheduledPost.platform as Platform,
      content: scheduledPost.content,
      scheduledTime: scheduledPost.scheduledTime.toISOString(),
      status: scheduledPost.status as ScheduledPostStatus,
      retryCount: scheduledPost.retryCount,
      lastAttempt: scheduledPost.lastAttempt?.toISOString() || null,
      errorMessage: scheduledPost.errorMessage || null,
      externalPostId: scheduledPost.externalPostId || null,
      createdAt: scheduledPost.createdAt,
      updatedAt: scheduledPost.updatedAt
    };
  }

  /**
   * Find all scheduled posts with filtering and pagination
   */
  async findAll(filters?: ScheduledPostFilter): Promise<Result<ScheduledPostView[]>> {
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
      
      if (filters?.postId) {
        where.postId = filters.postId;
      }
      
      if (filters?.scheduledAfter) {
        where.scheduledTime = { 
          gte: new Date(filters.scheduledAfter) 
        };
      }
      
      if (filters?.scheduledBefore) {
        where.scheduledTime = {
          ...where.scheduledTime,
          lte: new Date(filters.scheduledBefore)
        };
      }
      
      if (filters?.search) {
        where.content = { 
          contains: filters.search, 
          mode: 'insensitive' 
        };
      }
      
      // Build query options
      const options = {
        where,
        ...this.buildPagination(filters?.limit, filters?.offset),
        orderBy: this.buildOrderBy(
          filters?.sortBy || 'scheduledTime', 
          filters?.sortOrder || 'asc'
        )
      };
      
      const scheduledPosts = await prisma.scheduledPost.findMany(options);
      return scheduledPosts.map(post => this.convertToView(post));
    }, 'Failed to fetch scheduled posts');
  }

  /**
   * Find scheduled post by ID
   */
  async findById(id: string): Promise<Result<ScheduledPostView | null>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const scheduledPost = await prisma.scheduledPost.findUnique({
        where: { id }
      });
      
      return scheduledPost ? this.convertToView(scheduledPost) : null;
    }, 'Failed to fetch scheduled post');
  }

  /**
   * Find scheduled posts by post ID
   */
  async findByPostId(postId: string): Promise<Result<ScheduledPostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const scheduledPosts = await prisma.scheduledPost.findMany({
        where: { postId },
        orderBy: { scheduledTime: 'desc' }
      });
      
      return scheduledPosts.map(post => this.convertToView(post));
    }, 'Failed to fetch scheduled posts by post ID');
  }

  /**
   * Create new scheduled post
   */
  async create(data: NewScheduledPost): Promise<Result<ScheduledPostView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const scheduledPost = await prisma.scheduledPost.create({
        data: {
          id: data.id || this.generateId('sched'),
          postId: data.postId,
          platform: data.platform,
          content: data.content,
          scheduledTime: new Date(data.scheduledTime),
          status: data.status || 'pending',
          retryCount: data.retryCount || 0,
          lastAttempt: data.lastAttempt ? new Date(data.lastAttempt) : null,
          errorMessage: data.errorMessage,
          externalPostId: data.externalPostId
        }
      });
      
      // Also update the associated post status to 'scheduled'
      await prisma.post.update({
        where: { id: data.postId },
        data: { status: 'scheduled' }
      });
      
      return this.convertToView(scheduledPost);
    }, 'Failed to create scheduled post');
  }

  /**
   * Create multiple scheduled posts
   */
  async createMany(data: NewScheduledPost[]): Promise<Result<ScheduledPostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      // Prepare data with generated IDs
      const scheduledPostsData = data.map(item => ({
        id: item.id || this.generateId('sched'),
        postId: item.postId,
        platform: item.platform,
        content: item.content,
        scheduledTime: new Date(item.scheduledTime),
        status: item.status || 'pending',
        retryCount: item.retryCount || 0,
        lastAttempt: item.lastAttempt ? new Date(item.lastAttempt) : null,
        errorMessage: item.errorMessage,
        externalPostId: item.externalPostId
      }));
      
      // Use a transaction to create all scheduled posts and update post statuses
      const createdScheduledPosts = await prisma.$transaction(async (tx) => {
        await tx.scheduledPost.createMany({
          data: scheduledPostsData
        });
        
        // Update all associated posts to 'scheduled' status
        const postIds = [...new Set(data.map(d => d.postId))];
        await tx.post.updateMany({
          where: { id: { in: postIds } },
          data: { status: 'scheduled' }
        });
        
        // Fetch the created scheduled posts
        return await tx.scheduledPost.findMany({
          where: {
            id: { in: scheduledPostsData.map(d => d.id) }
          },
          orderBy: { scheduledTime: 'asc' }
        });
      });
      
      return createdScheduledPosts.map(post => this.convertToView(post));
    }, 'Failed to create multiple scheduled posts');
  }

  /**
   * Update existing scheduled post
   */
  async update(
    id: string, 
    data: Partial<NewScheduledPost>
  ): Promise<Result<ScheduledPostView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const scheduledPost = await prisma.scheduledPost.update({
        where: { id },
        data: {
          ...(data.platform && { platform: data.platform }),
          ...(data.content && { content: data.content }),
          ...(data.scheduledTime && { scheduledTime: new Date(data.scheduledTime) }),
          ...(data.status && { status: data.status }),
          ...(data.retryCount !== undefined && { retryCount: data.retryCount }),
          ...(data.lastAttempt !== undefined && { 
            lastAttempt: data.lastAttempt ? new Date(data.lastAttempt) : null 
          }),
          ...(data.errorMessage !== undefined && { errorMessage: data.errorMessage }),
          ...(data.externalPostId !== undefined && { externalPostId: data.externalPostId })
        }
      });
      
      return this.convertToView(scheduledPost);
    }, 'Failed to update scheduled post');
  }

  /**
   * Delete scheduled post by ID
   */
  async delete(id: string): Promise<Result<void>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      // Get the scheduled post first to update the associated post status
      const scheduledPost = await prisma.scheduledPost.findUnique({
        where: { id }
      });
      
      if (scheduledPost) {
        // Delete the scheduled post
        await prisma.scheduledPost.delete({
          where: { id }
        });
        
        // Check if there are other scheduled posts for this post
        const otherScheduledPosts = await prisma.scheduledPost.count({
          where: { postId: scheduledPost.postId }
        });
        
        // If no other scheduled posts, update post status back to 'approved'
        if (otherScheduledPosts === 0) {
          await prisma.post.update({
            where: { id: scheduledPost.postId },
            data: { status: 'approved' }
          });
        }
      }
    }, 'Failed to delete scheduled post');
  }

  /**
   * Get scheduled post statistics
   */
  async getStats(): Promise<Result<ScheduledPostStats>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const [total, byStatus, byPlatform, upcoming24h] = await Promise.all([
        prisma.scheduledPost.count(),
        prisma.scheduledPost.groupBy({
          by: ['status'],
          _count: true
        }),
        prisma.scheduledPost.groupBy({
          by: ['platform'],
          _count: true
        }),
        prisma.scheduledPost.count({
          where: {
            scheduledTime: {
              gte: new Date(),
              lte: new Date(Date.now() + 24 * 60 * 60 * 1000)
            },
            status: 'pending'
          }
        })
      ]);
      
      const statusMap: Record<string, number> = {};
      for (const item of byStatus) {
        statusMap[item.status] = item._count;
      }
      
      const platformMap: Record<string, number> = {};
      for (const item of byPlatform) {
        platformMap[item.platform] = item._count;
      }
      
      return {
        total,
        byStatus: statusMap,
        byPlatform: platformMap,
        upcoming24h
      };
    }, 'Failed to get scheduled post statistics');
  }

  /**
   * Update scheduled post status
   */
  async updateStatus(
    id: string, 
    status: ScheduledPostView['status'],
    errorMessage?: string
  ): Promise<Result<ScheduledPostView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const updateData: any = { status };
      
      if (errorMessage !== undefined) {
        updateData.errorMessage = errorMessage;
      }
      
      if (status === 'failed') {
        updateData.lastAttempt = new Date();
      }
      
      const scheduledPost = await prisma.scheduledPost.update({
        where: { id },
        data: updateData
      });
      
      // Update associated post status based on scheduled post status
      if (status === 'published') {
        await prisma.post.update({
          where: { id: scheduledPost.postId },
          data: { status: 'published' }
        });
      } else if (status === 'failed' || status === 'cancelled') {
        // Check if there are other pending scheduled posts
        const otherPending = await prisma.scheduledPost.count({
          where: { 
            postId: scheduledPost.postId,
            status: 'pending',
            id: { not: id }
          }
        });
        
        if (otherPending === 0) {
          await prisma.post.update({
            where: { id: scheduledPost.postId },
            data: { status: status === 'failed' ? 'failed' : 'approved' }
          });
        }
      }
      
      return this.convertToView(scheduledPost);
    }, 'Failed to update scheduled post status');
  }

  /**
   * Find posts due for publishing
   */
  async findDueForPublishing(
    beforeTime?: string,
    limit = 10
  ): Promise<Result<ScheduledPostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const cutoffTime = beforeTime ? new Date(beforeTime) : new Date();
      
      const scheduledPosts = await prisma.scheduledPost.findMany({
        where: {
          scheduledTime: { lte: cutoffTime },
          status: 'pending'
        },
        orderBy: { scheduledTime: 'asc' },
        take: limit
      });
      
      return scheduledPosts.map(post => this.convertToView(post));
    }, 'Failed to find posts due for publishing');
  }

  /**
   * Find upcoming scheduled posts
   */
  async findUpcoming(
    hours: number,
    platform?: Platform
  ): Promise<Result<ScheduledPostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const now = new Date();
      const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
      
      const where: any = {
        scheduledTime: {
          gte: now,
          lte: futureTime
        },
        status: 'pending'
      };
      
      if (platform) {
        where.platform = platform;
      }
      
      const scheduledPosts = await prisma.scheduledPost.findMany({
        where,
        orderBy: { scheduledTime: 'asc' }
      });
      
      return scheduledPosts.map(post => this.convertToView(post));
    }, 'Failed to find upcoming scheduled posts');
  }

  /**
   * Reschedule a post
   */
  async reschedule(
    id: string,
    newTime: string
  ): Promise<Result<ScheduledPostView>> {
    return this.update(id, { scheduledTime: newTime });
  }

  /**
   * Cancel scheduled post
   */
  async cancel(id: string): Promise<Result<ScheduledPostView>> {
    return this.updateStatus(id, 'cancelled');
  }

  /**
   * Mark post as published
   */
  async markAsPublished(
    id: string,
    externalPostId?: string
  ): Promise<Result<ScheduledPostView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const scheduledPost = await prisma.scheduledPost.update({
        where: { id },
        data: {
          status: 'published',
          externalPostId
        }
      });
      
      // Update associated post status
      await prisma.post.update({
        where: { id: scheduledPost.postId },
        data: { status: 'published' }
      });
      
      return this.convertToView(scheduledPost);
    }, 'Failed to mark scheduled post as published');
  }

  /**
   * Mark post as failed
   */
  async markAsFailed(
    id: string,
    errorMessage: string,
    incrementRetry = true
  ): Promise<Result<ScheduledPostView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const currentPost = await prisma.scheduledPost.findUnique({
        where: { id }
      });
      
      if (!currentPost) {
        throw new Error('Scheduled post not found');
      }
      
      const scheduledPost = await prisma.scheduledPost.update({
        where: { id },
        data: {
          status: 'failed',
          errorMessage,
          lastAttempt: new Date(),
          retryCount: incrementRetry ? currentPost.retryCount + 1 : currentPost.retryCount
        }
      });
      
      // Check if there are other pending scheduled posts for this post
      const otherPending = await prisma.scheduledPost.count({
        where: { 
          postId: scheduledPost.postId,
          status: 'pending',
          id: { not: id }
        }
      });
      
      // If no other pending scheduled posts, update post status
      if (otherPending === 0) {
        await prisma.post.update({
          where: { id: scheduledPost.postId },
          data: { status: 'failed' }
        });
      }
      
      return this.convertToView(scheduledPost);
    }, 'Failed to mark scheduled post as failed');
  }

  /**
   * Get calendar events for date range
   */
  async getCalendarEvents(
    startDate: string,
    endDate: string,
    platform?: Platform
  ): Promise<Result<ScheduledPostView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const where: any = {
        scheduledTime: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };
      
      if (platform) {
        where.platform = platform;
      }
      
      const scheduledPosts = await prisma.scheduledPost.findMany({
        where,
        orderBy: { scheduledTime: 'asc' }
      });
      
      return scheduledPosts.map(post => this.convertToView(post));
    }, 'Failed to get calendar events');
  }

  /**
   * Check for scheduling conflicts
   */
  async checkConflicts(
    scheduledTime: string,
    platform: Platform,
    excludeId?: string
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      // Check for posts within 5 minutes of the scheduled time
      const timeBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
      const targetTime = new Date(scheduledTime);
      const startTime = new Date(targetTime.getTime() - timeBuffer);
      const endTime = new Date(targetTime.getTime() + timeBuffer);
      
      const where: any = {
        platform,
        scheduledTime: {
          gte: startTime,
          lte: endTime
        },
        status: { in: ['pending', 'published'] }
      };
      
      if (excludeId) {
        where.id = { not: excludeId };
      }
      
      const conflictingPosts = await prisma.scheduledPost.count({
        where
      });
      
      return conflictingPosts > 0;
    }, 'Failed to check scheduling conflicts');
  }
}