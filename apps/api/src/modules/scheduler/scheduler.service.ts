import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { IdGeneratorService } from '../shared/services/id-generator.service';
import { PublishJobData } from '@content-creation/queue';
import { CalendarEventEntity } from './entities/calendar-event.entity';
import {
  CreateScheduleEventDto,
  UpdateScheduleEventDto,
  ScheduleEventFilterDto,
  SchedulePlatform,
  ScheduleEventStatus,
} from './dto';
import { POST_EVENTS, type PostApprovedEvent } from '../posts/events/post.events';
import { PostStateService } from '../posts/services/post-state.service';
import { 
  SCHEDULER_EVENTS, 
  type PostScheduleRequestedEvent, 
  type PostUnscheduleRequestedEvent,
  type PostScheduledEvent,
  type PostUnscheduledEvent,
  type PostScheduleFailedEvent,
  type PostUnscheduleFailedEvent
} from './events/scheduler.events';
import {
  PUBLICATION_EVENTS,
  type PostPublishedEvent,
  type PostPublicationFailedEvent,
  type PostPublicationPermanentlyFailedEvent
} from '../publisher/events/publication.events';

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
    private readonly idGenerator: IdGeneratorService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly postStateService: PostStateService,
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

    // Verify post can be scheduled using state machine
    const canSchedule = await this.postStateService.canTransition(request.postId, 'SCHEDULE');
    if (!canSchedule) {
      const availableActions = await this.postStateService.getAvailableActions(request.postId);
      throw new BadRequestException(
        `Cannot schedule post in ${post.status} state. Available actions: ${availableActions.join(', ')}`
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
    const scheduledPostId = this.idGenerator.generate('sched');
    const scheduledPost = await this.prisma.scheduledPost.create({
      data: {
        id: scheduledPostId,
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

    // Add job to queue
    try {
      const jobData: PublishJobData = {
        scheduledPostId,
        postId: request.postId,
        platform: request.platform,
        content: request.content,
        credentials: {
          accessToken: request.platform === 'linkedin' 
            ? this.configService.get<string>('LINKEDIN_ACCESS_TOKEN') || ''
            : this.configService.get<string>('X_ACCESS_TOKEN') || '',
          clientId: request.platform === 'linkedin'
            ? this.configService.get<string>('LINKEDIN_CLIENT_ID')
            : this.configService.get<string>('X_CLIENT_ID'),
          clientSecret: request.platform === 'linkedin'
            ? this.configService.get<string>('LINKEDIN_CLIENT_SECRET')
            : this.configService.get<string>('X_CLIENT_SECRET'),
        },
        metadata: request.metadata,
      };

      // Emit event for queue processing instead of direct call
      this.eventEmitter.emit(SCHEDULER_EVENTS.SCHEDULE_REQUESTED, {
        postId: request.postId,
        scheduledPostId,
        platform: request.platform,
        scheduledTime,
        jobData,
        timestamp: new Date()
      } as PostScheduleRequestedEvent);

      this.logger.log(`Emitted schedule request event for scheduled post: ${scheduledPostId}`);
    } catch (error) {
      this.logger.error('Failed to emit schedule request event', error);
      // Clean up the scheduled post if event emission fails
      await this.prisma.scheduledPost.delete({
        where: { id: scheduledPostId }
      });
      throw new BadRequestException('Failed to schedule post');
    }

    // Update post status to scheduled using state machine
    const updatedPost = await this.postStateService.schedulePost(
      request.postId,
      scheduledTime,
      request.platform
    );

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

    // Emit event for queue job cancellation if it exists
    if (scheduledPost.queueJobId) {
      this.eventEmitter.emit(SCHEDULER_EVENTS.UNSCHEDULE_REQUESTED, {
        scheduledPostId,
        queueJobId: scheduledPost.queueJobId,
        reason: 'Post cancelled by user',
        timestamp: new Date()
      } as PostUnscheduleRequestedEvent);
      
      this.logger.log(`Emitted unschedule request event for job ${scheduledPost.queueJobId}`);
    }

    // Delete the scheduled post entirely
    await this.prisma.scheduledPost.delete({
      where: { id: scheduledPostId }
    });

    // Update the original post status using state machine if it exists
    if (scheduledPost.postId) {
      await this.postStateService.unschedulePost(scheduledPost.postId);
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

    // If we've exceeded max retries, update the original post status using state machine
    if (newRetryCount >= maxRetries && scheduledPost.postId) {
      await this.postStateService.markPublishFailed(scheduledPost.postId, errorMessage);
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
   * Handle successful post scheduling from queue
   */
  @OnEvent(SCHEDULER_EVENTS.SCHEDULED)
  async handlePostScheduled(payload: PostScheduledEvent) {
    this.logger.log(`Post ${payload.postId} successfully scheduled in queue with job ID: ${payload.queueJobId}`);
    
    try {
      // Update scheduled post with queue job ID
      await this.prisma.scheduledPost.update({
        where: { id: payload.scheduledPostId },
        data: { queueJobId: payload.queueJobId }
      });
      
      this.logger.log(`Updated scheduled post ${payload.scheduledPostId} with job ID ${payload.queueJobId}`);
    } catch (error) {
      this.logger.error(`Failed to update scheduled post with queue job ID:`, error);
    }
  }

  /**
   * Handle failed post scheduling from queue
   */
  @OnEvent(SCHEDULER_EVENTS.SCHEDULE_FAILED)
  async handlePostScheduleFailed(payload: PostScheduleFailedEvent) {
    this.logger.error(`Failed to schedule post ${payload.postId}: ${payload.error}`);
    
    try {
      // Clean up the scheduled post if queue addition fails
      await this.prisma.scheduledPost.delete({
        where: { id: payload.scheduledPostId }
      });
      
      this.logger.log(`Cleaned up failed scheduled post ${payload.scheduledPostId}`);
    } catch (error) {
      this.logger.error(`Failed to clean up scheduled post ${payload.scheduledPostId}:`, error);
    }
  }

  /**
   * Handle successful post unscheduling from queue
   */
  @OnEvent(SCHEDULER_EVENTS.UNSCHEDULED)
  async handlePostUnscheduled(payload: PostUnscheduledEvent) {
    this.logger.log(`Post ${payload.postId} successfully unscheduled from queue`);
    // Database cleanup is already handled in the calling method
  }

  /**
   * Handle failed post unscheduling from queue
   */
  @OnEvent(SCHEDULER_EVENTS.UNSCHEDULE_FAILED)
  async handlePostUnscheduleFailed(payload: PostUnscheduleFailedEvent) {
    this.logger.error(`Failed to unschedule job ${payload.queueJobId}: ${payload.error}`);
    // Continue with database cleanup even if queue cancellation failed
    // The calling method will handle the database operations
  }

  /**
   * Handle successful post publication from publisher service
   */
  @OnEvent(PUBLICATION_EVENTS.PUBLISHED)
  async handlePostPublished(payload: PostPublishedEvent) {
    this.logger.log(`Handling post publication event for scheduled post: ${payload.scheduledPostId}`);
    
    try {
      // Update scheduled post status to published
      await this.prisma.scheduledPost.update({
        where: { id: payload.scheduledPostId },
        data: {
          status: 'published',
          externalPostId: payload.externalPostId,
          lastAttempt: payload.publishedAt,
          updatedAt: new Date()
        }
      });

      // Update original post status using state machine if it exists
      if (payload.postId) {
        await this.postStateService.markPublished(payload.postId, payload.externalPostId);
      }

      this.logger.log(`Successfully updated statuses for published post: ${payload.scheduledPostId}`);
    } catch (error) {
      this.logger.error(`Failed to handle post publication event for ${payload.scheduledPostId}:`, error);
    }
  }

  /**
   * Handle failed post publication from publisher service
   */
  @OnEvent(PUBLICATION_EVENTS.FAILED)
  async handlePostPublicationFailed(payload: PostPublicationFailedEvent) {
    this.logger.log(`Handling post publication failure for scheduled post: ${payload.scheduledPostId}, will retry: ${payload.willRetry}`);
    
    try {
      // Update scheduled post with failure details and retry count
      await this.prisma.scheduledPost.update({
        where: { id: payload.scheduledPostId },
        data: {
          status: 'pending', // Keep as pending for retry
          errorMessage: payload.error,
          retryCount: payload.retryCount,
          lastAttempt: payload.failedAt,
          updatedAt: new Date()
        }
      });

      this.logger.log(`Updated scheduled post ${payload.scheduledPostId} for retry ${payload.retryCount}/${payload.maxRetries}`);
    } catch (error) {
      this.logger.error(`Failed to handle post publication failure event for ${payload.scheduledPostId}:`, error);
    }
  }

  /**
   * Handle permanently failed post publication from publisher service
   */
  @OnEvent(PUBLICATION_EVENTS.PERMANENTLY_FAILED)
  async handlePostPublicationPermanentlyFailed(payload: PostPublicationPermanentlyFailedEvent) {
    this.logger.log(`Handling permanent publication failure for scheduled post: ${payload.scheduledPostId}`);
    
    try {
      // Update scheduled post status to failed
      await this.prisma.scheduledPost.update({
        where: { id: payload.scheduledPostId },
        data: {
          status: 'failed',
          errorMessage: payload.finalError,
          retryCount: payload.totalAttempts,
          lastAttempt: payload.permanentlyFailedAt,
          updatedAt: new Date()
        }
      });

      // Reset original post status using state machine so it can be manually rescheduled
      if (payload.postId) {
        await this.postStateService.markPublishFailed(payload.postId, payload.finalError);
      }

      this.logger.log(`Marked scheduled post ${payload.scheduledPostId} as permanently failed and reset original post to approved`);
    } catch (error) {
      this.logger.error(`Failed to handle permanent publication failure event for ${payload.scheduledPostId}:`, error);
    }
  }

  /**
   * Handle post approval event to determine scheduling eligibility
   */
  @OnEvent(POST_EVENTS.APPROVED)
  async handlePostApproved(payload: PostApprovedEvent) {
    this.logger.log(`Handling post.approved event for post ${payload.postId}`);

    try {
      // Check if post meets auto-scheduling criteria
      // This could include checking user preferences, content validation, etc.
      
      // For now, just log that the post is eligible for scheduling
      this.logger.log(
        `Post ${payload.postId} (${payload.post.platform}) approved and eligible for scheduling at ${payload.timestamp.toISOString()}`
      );
      
      // Future: Could automatically create scheduling options or notifications
      // - Check user's auto-scheduling preferences
      // - Validate content meets platform requirements  
      // - Create suggested scheduling times based on optimal posting windows
      // - Send notifications to users about scheduling opportunities
      
      // Emit additional events for other services (analytics, notifications, etc.)
      // this.eventEmitter.emit('scheduling.eligibility.created', {
      //   postId: payload.postId,
      //   platform: payload.post.platform,
      //   eligibleAt: payload.timestamp,
      // });
      
    } catch (error) {
      this.logger.error(
        `Error handling post approval event for post ${payload.postId}:`, 
        error
      );
      // Don't throw - this is an event handler and shouldn't break the approval workflow
    }
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