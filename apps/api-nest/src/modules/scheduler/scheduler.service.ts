import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CalendarEventEntity } from './entities/calendar-event.entity';
import {
  CreateScheduleEventDto,
  UpdateScheduleEventDto,
  ScheduleEventFilterDto,
  SchedulePlatform,
  ScheduleEventStatus,
} from './dto';

// Import the existing SchedulingService business logic from the correct path
import { SchedulingService } from '../../../../api/src/services/scheduling-service';
import { generateId } from '../../../../api/src/lib/id-generator';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly schedulingService: SchedulingService;

  constructor(private readonly prisma: PrismaService) {
    // Initialize the existing scheduling service for business logic
    this.schedulingService = new SchedulingService();
  }

  async createScheduleEvent(createEventDto: CreateScheduleEventDto): Promise<CalendarEventEntity> {
    this.logger.log(`Creating scheduled event: ${createEventDto.platform} at ${createEventDto.scheduledTime}`);

    // If postId is provided, use existing post scheduling
    if (createEventDto.postId) {
      const scheduleRequest = {
        postId: createEventDto.postId,
        platform: createEventDto.platform as 'linkedin' | 'x',
        content: createEventDto.content || '',
        scheduledTime: createEventDto.scheduledTime,
        metadata: createEventDto.metadata || {},
      };

      const result = await this.schedulingService.schedulePost(scheduleRequest);
      
      if (!result.success) {
        throw new BadRequestException('Failed to schedule post');
      }

      // Transform to calendar event format
      return this.transformToCalendarEvent(result.data.scheduledPost);
    }

    // For standalone event creation (without existing post)
    if (!createEventDto.content) {
      throw new BadRequestException('Content is required when creating event without postId');
    }

    // Create scheduled post directly using Prisma
    const newScheduledPost = await this.prisma.scheduledPost.create({
      data: {
        id: generateId('scheduled'),
        postId: null,
        platform: createEventDto.platform,
        content: createEventDto.content,
        scheduledTime: createEventDto.scheduledTime,
        status: 'pending',
        retryCount: 0,
        lastAttempt: null,
        errorMessage: null,
        externalPostId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
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

    if (filters?.platform) {
      where.platform = filters.platform;
    }

    if (filters?.postId) {
      where.postId = filters.postId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.scheduledTime = {};
      if (filters.startDate) {
        where.scheduledTime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.scheduledTime.lte = new Date(filters.endDate);
      }
    }

    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where,
      orderBy: { scheduledTime: 'asc' },
    });

    return scheduledPosts.map(post => this.transformToCalendarEvent(post));
  }

  async getScheduleEventById(id: string): Promise<CalendarEventEntity> {
    this.logger.log(`Getting scheduled event: ${id}`);

    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id },
    });

    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled event with ID ${id} not found`);
    }

    return this.transformToCalendarEvent(scheduledPost);
  }

  async updateScheduleEvent(id: string, updateEventDto: UpdateScheduleEventDto): Promise<CalendarEventEntity> {
    this.logger.log(`Updating scheduled event: ${id}`);

    // Get current scheduled post to validate it exists
    const currentScheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id },
    });

    if (!currentScheduledPost) {
      throw new NotFoundException(`Scheduled event with ID ${id} not found`);
    }

    // Check if event can be updated (only pending events)
    if (currentScheduledPost.status !== 'pending') {
      throw new BadRequestException('Only pending scheduled events can be updated');
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updateEventDto.scheduledTime) {
      updateData.scheduledTime = updateEventDto.scheduledTime;
    }

    if (updateEventDto.content) {
      updateData.content = updateEventDto.content;
    }

    if (updateEventDto.platform) {
      updateData.platform = updateEventDto.platform;
    }

    // Note: metadata not supported in schema

    // Update the scheduled post
    const updatedPost = await this.prisma.scheduledPost.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated scheduled event: ${id}`);
    return this.transformToCalendarEvent(updatedPost);
  }

  async deleteScheduleEvent(id: string): Promise<void> {
    this.logger.log(`Deleting scheduled event: ${id}`);

    // Use the existing scheduling service to handle proper cancellation
    const result = await this.schedulingService.cancelScheduledPost(id);

    if (!result.success) {
      throw new BadRequestException('Failed to cancel scheduled event');
    }

    this.logger.log(`Deleted scheduled event: ${id}`);
  }

  async unscheduleByPostId(postId: string): Promise<{ scheduledPostId: string }> {
    this.logger.log(`Unscheduling post: ${postId}`);

    const result = await this.schedulingService.unschedulePost(postId);

    if (!result.success) {
      throw new NotFoundException('No pending scheduled post found for this post');
    }

    this.logger.log(`Unscheduled post: ${postId}`);
    return result.data;
  }

  private transformToCalendarEvent(scheduledPost: any): CalendarEventEntity {
    return {
      id: scheduledPost.id,
      postId: scheduledPost.postId || undefined,
      title: scheduledPost.content.substring(0, 100) + (scheduledPost.content.length > 100 ? '...' : ''),
      content: scheduledPost.content,
      platform: scheduledPost.platform as SchedulePlatform,
      scheduledTime: new Date(scheduledPost.scheduledTime),
      status: scheduledPost.status as ScheduleEventStatus,
      retryCount: scheduledPost.retryCount,
      lastAttempt: scheduledPost.lastAttempt ? new Date(scheduledPost.lastAttempt) : undefined,
      errorMessage: scheduledPost.errorMessage || undefined,
      externalPostId: scheduledPost.externalPostId || undefined,
      createdAt: new Date(scheduledPost.createdAt),
      updatedAt: new Date(scheduledPost.updatedAt),
    };
  }
}