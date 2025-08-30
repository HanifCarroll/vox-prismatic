import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { CalendarEventEntity } from './entities/calendar-event.entity';
import {
  CreateScheduleEventDto,
  UpdateScheduleEventDto,
  ScheduleEventFilterDto,
} from './dto';

@ApiTags('Scheduler')
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get scheduler statistics',
    description: 'Retrieve statistics about scheduled events and approved posts',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalApprovedPosts: { type: 'number', example: 15 },
            totalScheduledEvents: { type: 'number', example: 8 },
            thisWeekEvents: { type: 'number', example: 3 },
            next7DaysEvents: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  async getStats() {
    const stats = await this.schedulerService.getSchedulerStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('events')
  @ApiOperation({
    summary: 'List scheduled events',
    description: 'Retrieve scheduled calendar events with optional filtering by date range, platform, and status',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendar events retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CalendarEventEntity' },
        },
      },
    },
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by event status' })
  @ApiQuery({ name: 'platforms', required: false, description: 'Filter by platforms (comma-separated, e.g. "linkedin,x")' })
  @ApiQuery({ name: 'start', required: false, description: 'Filter events from this date (YYYY-MM-DD format, e.g. "2025-08-27")' })
  @ApiQuery({ name: 'end', required: false, description: 'Filter events up to this date (YYYY-MM-DD format, e.g. "2025-08-31")' })
  @ApiQuery({ name: 'postId', required: false, description: 'Filter by post ID' })
  async getEvents(@Query() filters: ScheduleEventFilterDto) {
    const events = await this.schedulerService.getCalendarEvents(filters);
    return {
      success: true,
      data: events,
    };
  }

  @Post('events')
  @ApiOperation({
    summary: 'Create a scheduled event',
    description: 'Schedule a new event for publication. Can either schedule an existing post or create a standalone event.',
  })
  @ApiResponse({
    status: 201,
    description: 'Scheduled event created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            scheduledPostId: { type: 'string', example: 'scheduled_abc123' },
            scheduledTime: { type: 'string', example: '2025-08-27T14:30:00.000Z' },
            platform: { type: 'string', example: 'linkedin' },
            status: { type: 'string', example: 'pending' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or scheduling conflict',
  })
  @ApiBody({ type: CreateScheduleEventDto })
  async createEvent(@Body() createEventDto: CreateScheduleEventDto) {
    const event = await this.schedulerService.createScheduleEvent(createEventDto);
    return {
      success: true,
      data: {
        scheduledPostId: event.id,
        scheduledTime: event.scheduledTime,
        platform: event.platform,
        status: event.status,
      },
    };
  }

  @Get('events/:id')
  @ApiOperation({
    summary: 'Get a specific scheduled event',
    description: 'Retrieve details for a single scheduled event by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled event retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/CalendarEventEntity' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Scheduled event not found',
  })
  @ApiParam({ name: 'id', description: 'Scheduled event ID' })
  async getEvent(@Param('id') id: string) {
    const event = await this.schedulerService.getScheduleEventById(id);
    return {
      success: true,
      data: event,
    };
  }

  @Patch('events/:id')
  @ApiOperation({
    summary: 'Update a scheduled event',
    description: 'Partially update the details of a pending scheduled event (only pending events can be updated)',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled event updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/CalendarEventEntity' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update non-pending events',
  })
  @ApiResponse({
    status: 404,
    description: 'Scheduled event not found',
  })
  @ApiParam({ name: 'id', description: 'Scheduled event ID' })
  @ApiBody({ type: UpdateScheduleEventDto })
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateScheduleEventDto,
  ) {
    const event = await this.schedulerService.updateScheduleEvent(id, updateEventDto);
    return {
      success: true,
      data: event,
    };
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a scheduled event',
    description: 'Cancel and delete a scheduled event by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled event cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            scheduledPostId: { type: 'string', example: 'scheduled_abc123' },
            message: { type: 'string', example: 'Scheduled event scheduled_abc123 has been cancelled' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Scheduled event not found',
  })
  @ApiParam({ name: 'id', description: 'Scheduled event ID' })
  async cancelEvent(@Param('id') id: string) {
    await this.schedulerService.deleteScheduleEvent(id);
    return {
      success: true,
      data: {
        scheduledPostId: id,
        message: `Scheduled event ${id} has been cancelled`,
      },
    };
  }

  @Delete('events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unschedule post by post ID',
    description: 'Remove scheduling for a post by its post ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Post unscheduled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            scheduledPostId: { type: 'string', example: 'scheduled_abc123' },
            message: { type: 'string', example: 'Post post_abc123 has been unscheduled' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing postId or no pending scheduled post found',
  })
  @ApiQuery({ 
    name: 'postId', 
    required: true, 
    description: 'Post ID to unschedule',
    example: 'post_abc123'
  })
  async unschedulePost(@Query('postId') postId: string) {
    if (!postId) {
      throw new Error('Missing required query parameter: postId');
    }

    const result = await this.schedulerService.unscheduleByPostId(postId);
    return {
      success: true,
      data: {
        scheduledPostId: result.scheduledPostId,
        message: `Post ${postId} has been unscheduled`,
      },
    };
  }
}