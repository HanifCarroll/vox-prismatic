import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IdGeneratorService } from '../shared/services/id-generator.service';
import { CalendarEventEntity } from './entities/calendar-event.entity';
import {
  CreateScheduleEventDto,
  UpdateScheduleEventDto,
  ScheduleEventFilterDto,
  SchedulePlatform,
  ScheduleEventStatus,
} from './dto';

interface SchedulePostRequest {
  postId: string;
  platform: 'linkedin' | 'x';
  content: string;
  scheduledTime: string;
  metadata?: Record<string, any>;
}

interface BulkScheduleRequest {
  posts: Array<{
    postId: string;
    platform: 'linkedin' | 'x';
    content: string;
    scheduledTime: string;
  }>;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idGenerator: IdGeneratorService
  ) {}

  /**
   * Schedule a post for publication at a specific time
   */
  async schedulePost(request: SchedulePostRequest): Promise<{
    post: any;
    scheduledPost: any;
  }> {
    this.logger.log(`Scheduling post ${request.postId} for ${request.scheduledTime}`);

    // Validate the post exists and is approved
    const post = await this.prisma.post.findUnique({
      where: { id: request.postId }
    });

    if (!post) {
      throw new NotFoundException(`Post not found: ${request.postId}`);
    }

    // Verify post is approved
    if (post.status !== 'approved') {
      throw new BadRequestException(
        `Post must be approved before scheduling. Current status: ${post.status}`
      );
    }

    // Validate scheduled time is in the future
    const scheduledTime = new Date(request.scheduledTime);
    const now = new Date();
    if (scheduledTime <= now) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // Check for scheduling conflicts
    await this.checkSchedulingConflict(request.platform, scheduledTime);

    // Check if this post is already scheduled (prevent duplicates)
    const existingScheduled = await this.prisma.scheduledPost.findMany({
      where: {
        postId: request.postId,
        status: 'pending'
      }
    });

    if (existingScheduled.length > 0) {
      // Post is already scheduled, update the existing one instead
      const existing = existingScheduled[0];
      const updatedScheduledPost = await this.prisma.scheduledPost.update({
        where: { id: existing.id },
        data: {
          scheduledTime,
          platform: request.platform,
          content: request.content,
          updatedAt: new Date()
        }
      });

      return {
        post,
        scheduledPost: updatedScheduledPost
      };
    }

    // Create scheduled post entry
    const scheduledPost = await this.prisma.scheduledPost.create({
      data: {
        id: this.idGenerator.generate('sched'),
        postId: request.postId,
        platform: request.platform,
        content: request.content,
        scheduledTime,
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Update post status to scheduled
    const updatedPost = await this.prisma.post.update({
      where: { id: request.postId },
      data: {
        status: 'scheduled',
        updatedAt: new Date()
      }
    });

    return {
      post: updatedPost,
      scheduledPost
    };
  }

  /**
   * Cancel a scheduled post by deleting it
   */
  async cancelScheduledPost(scheduledPostId: string): Promise<void> {
    this.logger.log(`Cancelling scheduled post ${scheduledPostId}`);

    // Get the scheduled post
    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId }
    });

    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post not found: ${scheduledPostId}`);
    }

    // Cannot cancel already published posts
    if (scheduledPost.status === 'published') {
      throw new BadRequestException('Cannot cancel a post that has already been published');
    }

    // Delete the scheduled post entirely
    await this.prisma.scheduledPost.delete({
      where: { id: scheduledPostId }
    });

    // Update the original post status back to approved if it exists
    if (scheduledPost.postId) {
      await this.prisma.post.update({
        where: { id: scheduledPost.postId },
        data: {
          status: 'approved',
          updatedAt: new Date()
        }
      });
    }
  }

  /**
   * Unschedule a post by post ID
   */
  async unschedulePost(postId: string): Promise<{ scheduledPostId: string }> {
    this.logger.log(`Unscheduling post ${postId}`);

    // Find the scheduled post for this post
    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where: {
        postId,
        status: 'pending'
      }
    });

    if (scheduledPosts.length === 0) {
      throw new NotFoundException('No pending scheduled post found for this post');
    }

    // Use the first pending scheduled post (there should only be one)
    const scheduledPost = scheduledPosts[0];

    // Cancel the scheduled post
    await this.cancelScheduledPost(scheduledPost.id);

    return { scheduledPostId: scheduledPost.id };
  }

  /**
   * Mark a scheduled post as successfully published
   */
  async markAsPublished(
    scheduledPostId: string,
    externalPostId: string
  ): Promise<any> {
    this.logger.log(`Marking scheduled post ${scheduledPostId} as published`);

    // Get the scheduled post
    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId }
    });

    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post not found: ${scheduledPostId}`);
    }

    // Update scheduled post as published
    const updatedScheduledPost = await this.prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: 'published',
        externalPostId,
        lastAttempt: new Date(),
        updatedAt: new Date()
      }
    });

    // Update original post status if it exists
    if (scheduledPost.postId) {
      await this.prisma.post.update({
        where: { id: scheduledPost.postId },
        data: {
          status: 'published',
          updatedAt: new Date()
        }
      });
    }

    return updatedScheduledPost;
  }

  /**
   * Record a publication failure
   */
  async recordPublicationFailure(
    scheduledPostId: string,
    errorMessage: string
  ): Promise<any> {
    this.logger.log(`Recording publication failure for ${scheduledPostId}`);

    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId }
    });

    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post not found: ${scheduledPostId}`);
    }

    const newRetryCount = scheduledPost.retryCount + 1;
    const maxRetries = 3;

    const updatedScheduledPost = await this.prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        retryCount: newRetryCount,
        errorMessage,
        lastAttempt: new Date(),
        updatedAt: new Date(),
        status: newRetryCount >= maxRetries ? 'failed' : 'pending'
      }
    });

    // If we've exceeded max retries, update the original post status
    if (newRetryCount >= maxRetries && scheduledPost.postId) {
      await this.prisma.post.update({
        where: { id: scheduledPost.postId },
        data: {
          status: 'approved', // Reset to approved so it can be rescheduled manually
          updatedAt: new Date()
        }
      });
    }

    return updatedScheduledPost;
  }

  /**
   * Get scheduler data for management interface
   */
  async getSchedulerData(filter?: {
    platform?: 'linkedin' | 'x';
    status?: 'pending' | 'published' | 'failed';
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
   * Get upcoming posts within specified hours
   */
  async getUpcomingPosts(hours: number = 24): Promise<Array<{
    scheduledPost: any;
    post: any;
  }>> {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where: {
        status: 'pending',
        scheduledTime: {
          gte: now,
          lte: futureTime
        }
      },
      include: {
        post: true
      }
    });

    return scheduledPosts.map(scheduled => ({
      scheduledPost: scheduled,
      post: scheduled.post
    }));
  }

  /**
   * Bulk schedule multiple posts
   */
  async bulkSchedulePosts(request: BulkScheduleRequest): Promise<{
    successful: Array<{
      postId: string;
      scheduledPostId: string;
    }>;
    failed: Array<{
      postId: string;
      error: string;
    }>;
  }> {
    const successful: Array<{
      postId: string;
      scheduledPostId: string;
    }> = [];
    const failed: Array<{
      postId: string;
      error: string;
    }> = [];

    // Process each post individually to avoid partial failures
    for (const postData of request.posts) {
      try {
        const result = await this.schedulePost({
          postId: postData.postId,
          platform: postData.platform,
          content: postData.content,
          scheduledTime: postData.scheduledTime
        });

        successful.push({
          postId: postData.postId,
          scheduledPostId: result.scheduledPost.id
        });
      } catch (error) {
        failed.push({
          postId: postData.postId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Check for scheduling conflicts (business rule implementation)
   */
  private async checkSchedulingConflict(
    platform: string,
    scheduledTime: Date
  ): Promise<void> {
    // Define conflict window (e.g., 30 minutes before/after)
    const conflictWindow = 30 * 60 * 1000; // 30 minutes in milliseconds
    const startWindow = new Date(scheduledTime.getTime() - conflictWindow);
    const endWindow = new Date(scheduledTime.getTime() + conflictWindow);

    const conflictingPosts = await this.prisma.scheduledPost.findMany({
      where: {
        platform: platform as 'linkedin' | 'x',
        status: 'pending',
        scheduledTime: {
          gte: startWindow,
          lte: endWindow
        }
      }
    });

    if (conflictingPosts.length > 0) {
      throw new ConflictException(
        `Scheduling conflict detected: Another post is already scheduled within 30 minutes on ${platform}`
      );
    }
  }

  // NestJS Controller methods (existing functionality)
  
  async createScheduleEvent(createEventDto: CreateScheduleEventDto): Promise<CalendarEventEntity> {
    this.logger.log(`Creating scheduled event: ${createEventDto.platform} at ${createEventDto.scheduledTime}`);

    // If postId is provided, use existing post scheduling
    if (createEventDto.postId) {
      const result = await this.schedulePost({
        postId: createEventDto.postId,
        platform: createEventDto.platform as 'linkedin' | 'x',
        content: createEventDto.content || '',
        scheduledTime: createEventDto.scheduledTime,
        metadata: createEventDto.metadata || {}
      });

      return this.transformToCalendarEvent(result.scheduledPost);
    }

    // For standalone event creation (without existing post)
    if (!createEventDto.content) {
      throw new BadRequestException('Content is required when creating event without postId');
    }

    // Create scheduled post directly
    const newScheduledPost = await this.prisma.scheduledPost.create({
      data: {
        id: this.idGenerator.generate('scheduled'),
        postId: null,
        platform: createEventDto.platform,
        content: createEventDto.content,
        scheduledTime: new Date(createEventDto.scheduledTime),
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    this.logger.log(`Created scheduled event: ${newScheduledPost.id}`);
    return this.transformToCalendarEvent(newScheduledPost);
  }

  async getCalendarEvents(filters?: ScheduleEventFilterDto): Promise<CalendarEventEntity[]> {
    this.logger.log(`Getting calendar events with filters: ${JSON.stringify(filters)}`);

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

    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where,
      orderBy: { scheduledTime: 'asc' }
    });

    return scheduledPosts.map(post => this.transformToCalendarEvent(post));
  }

  async getScheduleEventById(id: string): Promise<CalendarEventEntity> {
    this.logger.log(`Getting scheduled event: ${id}`);

    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id }
    });

    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled event with ID ${id} not found`);
    }

    return this.transformToCalendarEvent(scheduledPost);
  }

  async updateScheduleEvent(id: string, updateEventDto: UpdateScheduleEventDto): Promise<CalendarEventEntity> {
    this.logger.log(`Updating scheduled event: ${id}`);

    const currentScheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id }
    });

    if (!currentScheduledPost) {
      throw new NotFoundException(`Scheduled event with ID ${id} not found`);
    }

    if (currentScheduledPost.status !== 'pending') {
      throw new BadRequestException('Only pending scheduled events can be updated');
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (updateEventDto.scheduledTime) {
      updateData.scheduledTime = new Date(updateEventDto.scheduledTime);
    }

    if (updateEventDto.content) {
      updateData.content = updateEventDto.content;
    }

    if (updateEventDto.platform) {
      updateData.platform = updateEventDto.platform;
    }

    const updatedPost = await this.prisma.scheduledPost.update({
      where: { id },
      data: updateData
    });

    this.logger.log(`Updated scheduled event: ${id}`);
    return this.transformToCalendarEvent(updatedPost);
  }

  async deleteScheduleEvent(id: string): Promise<void> {
    this.logger.log(`Deleting scheduled event: ${id}`);
    await this.cancelScheduledPost(id);
    this.logger.log(`Deleted scheduled event: ${id}`);
  }

  async unscheduleByPostId(postId: string): Promise<{ scheduledPostId: string }> {
    this.logger.log(`Unscheduling post: ${postId}`);
    const result = await this.unschedulePost(postId);
    this.logger.log(`Unscheduled post: ${postId}`);
    return result;
  }

  private transformToCalendarEvent(scheduledPost: any): CalendarEventEntity {
    return {
      id: scheduledPost.id,
      postId: scheduledPost.postId || undefined,
      title: scheduledPost.content.substring(0, 100) + (scheduledPost.content.length > 100 ? '...' : ''),
      content: scheduledPost.content,
      platform: scheduledPost.platform as SchedulePlatform,
      scheduledTime: scheduledPost.scheduledTime instanceof Date ? 
        scheduledPost.scheduledTime : new Date(scheduledPost.scheduledTime),
      status: scheduledPost.status as ScheduleEventStatus,
      retryCount: scheduledPost.retryCount,
      lastAttempt: scheduledPost.lastAttempt ? 
        (scheduledPost.lastAttempt instanceof Date ? 
          scheduledPost.lastAttempt : new Date(scheduledPost.lastAttempt)) : undefined,
      errorMessage: scheduledPost.errorMessage || undefined,
      externalPostId: scheduledPost.externalPostId || undefined,
      createdAt: scheduledPost.createdAt instanceof Date ? 
        scheduledPost.createdAt : new Date(scheduledPost.createdAt),
      updatedAt: scheduledPost.updatedAt instanceof Date ? 
        scheduledPost.updatedAt : new Date(scheduledPost.updatedAt)
    };
  }
}