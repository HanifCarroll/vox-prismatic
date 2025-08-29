import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ScheduledPostEntity } from './entities/scheduled-post.entity';
import { UpdateScheduledPostDto } from './dto/update-scheduled-post.dto';
import { ScheduledPostStatus, SocialPlatform } from '@content-creation/types';

/**
 * Repository for ScheduledPost entity
 * Provides data access layer with domain entity mapping
 * Follows same pattern as PostRepository, InsightRepository, TranscriptRepository
 */
@Injectable()
export class ScheduledPostRepository {
  private readonly logger = new Logger(ScheduledPostRepository.name);

  constructor(public readonly prisma: PrismaService) {}

  /**
   * Find scheduled post by ID
   */
  async findById(id: string): Promise<ScheduledPostEntity | null> {
    this.logger.debug(`Finding scheduled post by ID: ${id}`);
    
    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id }
    });

    return scheduledPost ? this.mapToEntity(scheduledPost) : null;
  }

  /**
   * Find multiple scheduled posts by IDs
   */
  async findByIds(ids: string[]): Promise<ScheduledPostEntity[]> {
    this.logger.debug(`Finding scheduled posts by IDs: ${ids.join(', ')}`);
    
    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where: { id: { in: ids } }
    });

    return scheduledPosts.map(scheduledPost => this.mapToEntity(scheduledPost));
  }

  /**
   * Find scheduled posts by status
   */
  async findByStatus(status: ScheduledPostStatus): Promise<ScheduledPostEntity[]> {
    this.logger.debug(`Finding scheduled posts by status: ${status}`);
    
    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where: { status },
      orderBy: { scheduledTime: 'asc' }
    });

    return scheduledPosts.map(scheduledPost => this.mapToEntity(scheduledPost));
  }

  /**
   * Find scheduled posts by multiple statuses
   */
  async findByStatuses(statuses: ScheduledPostStatus[]): Promise<ScheduledPostEntity[]> {
    this.logger.debug(`Finding scheduled posts by statuses: ${statuses.join(', ')}`);
    
    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where: { status: { in: statuses } },
      orderBy: { scheduledTime: 'asc' }
    });

    return scheduledPosts.map(scheduledPost => this.mapToEntity(scheduledPost));
  }

  /**
   * Find scheduled posts by post ID
   */
  async findByPostId(postId: string): Promise<ScheduledPostEntity[]> {
    this.logger.debug(`Finding scheduled posts by post ID: ${postId}`);
    
    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' }
    });

    return scheduledPosts.map(scheduledPost => this.mapToEntity(scheduledPost));
  }

  /**
   * Find scheduled posts by platform
   */
  async findByPlatform(platform: SocialPlatform): Promise<ScheduledPostEntity[]> {
    this.logger.debug(`Finding scheduled posts by platform: ${platform}`);
    
    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where: { platform },
      orderBy: { scheduledTime: 'asc' }
    });

    return scheduledPosts.map(scheduledPost => this.mapToEntity(scheduledPost));
  }

  /**
   * Find scheduled posts that are ready to publish
   */
  async findReadyToPublish(beforeTime?: Date): Promise<ScheduledPostEntity[]> {
    const cutoffTime = beforeTime || new Date();
    this.logger.debug(`Finding scheduled posts ready to publish before: ${cutoffTime.toISOString()}`);
    
    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where: {
        status: { in: [ScheduledPostStatus.PENDING, ScheduledPostStatus.QUEUED] },
        scheduledTime: { lte: cutoffTime }
      },
      orderBy: { scheduledTime: 'asc' }
    });

    return scheduledPosts.map(scheduledPost => this.mapToEntity(scheduledPost));
  }

  /**
   * Find expired scheduled posts
   */
  async findExpired(expirationHours: number = 24): Promise<ScheduledPostEntity[]> {
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() - expirationHours);
    
    this.logger.debug(`Finding expired scheduled posts before: ${expirationTime.toISOString()}`);
    
    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where: {
        status: { in: [ScheduledPostStatus.PENDING, ScheduledPostStatus.QUEUED, ScheduledPostStatus.FAILED] },
        scheduledTime: { lt: expirationTime }
      },
      orderBy: { scheduledTime: 'asc' }
    });

    return scheduledPosts.map(scheduledPost => this.mapToEntity(scheduledPost));
  }

  /**
   * Create new scheduled post
   */
  async create(data: {
    postId: string;
    platform: SocialPlatform;
    content: string;
    scheduledTime: Date;
    status?: ScheduledPostStatus;
  }): Promise<ScheduledPostEntity> {
    this.logger.debug(`Creating scheduled post for post ID: ${data.postId}`);
    
    const scheduledPost = await this.prisma.scheduledPost.create({
      data: {
        ...data,
        status: data.status || ScheduledPostStatus.PENDING,
        retryCount: 0
      }
    });

    return this.mapToEntity(scheduledPost);
  }

  /**
   * Update scheduled post
   */
  async update(id: string, data: UpdateScheduledPostDto): Promise<ScheduledPostEntity> {
    this.logger.debug(`Updating scheduled post: ${id}`);
    
    const scheduledPost = await this.prisma.scheduledPost.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    return this.mapToEntity(scheduledPost);
  }

  /**
   * Delete scheduled post
   */
  async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting scheduled post: ${id}`);
    
    await this.prisma.scheduledPost.delete({
      where: { id }
    });
  }

  /**
   * Count scheduled posts by status
   */
  async countByStatus(status: ScheduledPostStatus): Promise<number> {
    return this.prisma.scheduledPost.count({
      where: { status }
    });
  }

  /**
   * Count scheduled posts by multiple statuses
   */
  async countByStatuses(statuses: ScheduledPostStatus[]): Promise<number> {
    return this.prisma.scheduledPost.count({
      where: { status: { in: statuses } }
    });
  }

  /**
   * Find all scheduled posts with pagination
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    orderBy?: { [key: string]: 'asc' | 'desc' };
    where?: any;
  }): Promise<{
    data: ScheduledPostEntity[];
    total: number;
  }> {
    const { skip = 0, take = 50, orderBy = { createdAt: 'desc' }, where } = options || {};
    
    this.logger.debug(`Finding all scheduled posts with pagination: skip=${skip}, take=${take}`);
    
    const [scheduledPosts, total] = await Promise.all([
      this.prisma.scheduledPost.findMany({
        where,
        skip,
        take,
        orderBy
      }),
      this.prisma.scheduledPost.count({ where })
    ]);

    return {
      data: scheduledPosts.map(scheduledPost => this.mapToEntity(scheduledPost)),
      total
    };
  }

  /**
   * Map Prisma model to domain entity
   */
  mapToEntity(prismaModel: any): ScheduledPostEntity {
    return new ScheduledPostEntity({
      id: prismaModel.id,
      postId: prismaModel.postId,
      platform: prismaModel.platform,
      content: prismaModel.content,
      scheduledTime: prismaModel.scheduledTime,
      status: prismaModel.status,
      retryCount: prismaModel.retryCount || 0,
      lastAttempt: prismaModel.lastAttempt,
      errorMessage: prismaModel.errorMessage,
      externalPostId: prismaModel.externalPostId,
      createdAt: prismaModel.createdAt,
      updatedAt: prismaModel.updatedAt,
      queueJobId: prismaModel.queueJobId
    });
  }

  /**
   * Bulk operations for scheduled posts
   */
  async bulkUpdateStatus(ids: string[], status: ScheduledPostStatus): Promise<number> {
    this.logger.debug(`Bulk updating ${ids.length} scheduled posts to status: ${status}`);
    
    const result = await this.prisma.scheduledPost.updateMany({
      where: { id: { in: ids } },
      data: { 
        status,
        updatedAt: new Date()
      }
    });

    return result.count;
  }

  /**
   * Clean up old completed/expired scheduled posts
   */
  async cleanupOldPosts(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    this.logger.debug(`Cleaning up scheduled posts older than: ${cutoffDate.toISOString()}`);
    
    const result = await this.prisma.scheduledPost.deleteMany({
      where: {
        status: { in: [ScheduledPostStatus.PUBLISHED, ScheduledPostStatus.CANCELLED, ScheduledPostStatus.EXPIRED] },
        updatedAt: { lt: cutoffDate }
      }
    });

    return result.count;
  }

  /**
   * Find scheduled posts with post included
   */
  async findByIdWithPost(id: string): Promise<any> {
    return this.prisma.scheduledPost.findUnique({
      where: { id },
      include: {
        post: true
      }
    });
  }

  /**
   * Find scheduled posts by post ID and status
   */
  async findByPostIdAndStatus(postId: string, status: ScheduledPostStatus): Promise<any[]> {
    return this.prisma.scheduledPost.findMany({
      where: {
        postId,
        status
      }
    });
  }

  /**
   * Create scheduled post with full data
   */
  async createScheduledPost(data: {
    id: string;
    postId: string | null;
    platform: SocialPlatform;
    content: string;
    scheduledTime: Date;
    status: ScheduledPostStatus;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<any> {
    return this.prisma.scheduledPost.create({
      data
    });
  }

  /**
   * Find scheduled posts with date range and include post
   */
  async findWithDateRange(filter: {
    platform?: SocialPlatform;
    status?: ScheduledPostStatus;
    dateRange?: {
      start: string;
      end: string;
    };
  }): Promise<any[]> {
    const where: any = {};

    if (filter?.platform) {
      where.platform = filter.platform;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.dateRange) {
      where.scheduledTime = {
        gte: new Date(filter.dateRange.start),
        lte: new Date(filter.dateRange.end)
      };
    }

    return this.prisma.scheduledPost.findMany({
      where,
      include: {
        post: true
      },
      orderBy: { scheduledTime: 'asc' }
    });
  }

  /**
   * Find upcoming posts within specified hours
   */
  async findUpcomingPosts(hours: number = 24): Promise<any[]> {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return this.prisma.scheduledPost.findMany({
      where: {
        status: ScheduledPostStatus.PENDING,
        scheduledTime: {
          gte: now,
          lte: futureTime
        }
      },
      include: {
        post: true
      }
    });
  }

  /**
   * Check for scheduling conflicts
   */
  async findSchedulingConflicts(platform: SocialPlatform, scheduledTime: Date, windowMinutes: number = 30): Promise<any[]> {
    const conflictWindow = windowMinutes * 60 * 1000;
    const startWindow = new Date(scheduledTime.getTime() - conflictWindow);
    const endWindow = new Date(scheduledTime.getTime() + conflictWindow);

    return this.prisma.scheduledPost.findMany({
      where: {
        platform,
        status: ScheduledPostStatus.PENDING,
        scheduledTime: {
          gte: startWindow,
          lte: endWindow
        }
      }
    });
  }

  /**
   * Find scheduled posts for calendar view with filters
   */
  async findForCalendar(filters?: {
    status?: ScheduledPostStatus;
    platforms?: string;
    postId?: string;
    start?: string;
    end?: string;
  }): Promise<any[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    // Handle comma-separated platforms
    if (filters?.platforms) {
      const platformList = filters.platforms.split(',').map(p => p.trim());
      where.platform = { in: platformList };
    }

    if (filters?.postId) {
      where.postId = filters.postId;
    }

    // Handle date filtering with proper time boundaries
    if (filters?.start || filters?.end) {
      where.scheduledTime = {};
      
      if (filters.start) {
        // Convert YYYY-MM-DD to start of day (00:00:00)
        where.scheduledTime.gte = new Date(filters.start + 'T00:00:00.000Z');
      }
      
      if (filters.end) {
        // Convert YYYY-MM-DD to end of day (23:59:59.999)
        where.scheduledTime.lte = new Date(filters.end + 'T23:59:59.999Z');
      }
    }

    return this.prisma.scheduledPost.findMany({
      where,
      orderBy: { scheduledTime: 'asc' }
    });
  }

  /**
   * Update scheduled post with queue job ID
   */
  async updateQueueJobId(id: string, queueJobId: string): Promise<any> {
    return this.prisma.scheduledPost.update({
      where: { id },
      data: {
        queueJobId,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Delete many scheduled posts by post ID
   */
  async deleteManyByPostId(postId: string): Promise<void> {
    await this.prisma.scheduledPost.deleteMany({
      where: { postId }
    });
  }
}