import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PublisherService } from './publisher.service';
import {
  PublishResultEntity,
  PublishQueueEntity,
  PublisherStatusEntity,
  ImmediatePublishResultEntity,
  RetryPublishResultEntity
} from './entities';
import { ProcessScheduledPostsDto, PublishImmediateDto } from './dto';

@ApiTags('publisher')
@Controller('publisher')
export class PublisherController {
  private readonly logger = new Logger(PublisherController.name);

  constructor(private readonly publisherService: PublisherService) {}

  @Post('process')
  @ApiOperation({
    summary: 'Process scheduled posts',
    description: 'Manually trigger publishing of all scheduled posts that are due. Processes posts across all configured platforms using provided or environment credentials.'
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled posts processed successfully',
    type: PublishResultEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid credentials or request'
  })
  @ApiResponse({
    status: 500,
    description: 'Publishing service error'
  })
  async processScheduledPosts(@Body() credentials: ProcessScheduledPostsDto): Promise<PublishResultEntity> {
    this.logger.log('Processing scheduled posts');
    return await this.publisherService.processScheduledPosts(credentials);
  }

  @Get('queue')
  @ApiOperation({
    summary: 'Get publishing queue',
    description: 'View all posts that are pending publication, including their scheduled times and current status.'
  })
  @ApiResponse({
    status: 200,
    description: 'Publishing queue retrieved successfully',
    type: PublishQueueEntity
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to retrieve publishing queue'
  })
  async getPublishingQueue(): Promise<PublishQueueEntity> {
    this.logger.log('Getting publishing queue');
    return await this.publisherService.getPublishingQueue();
  }

  @Post('retry/:id')
  @ApiParam({
    name: 'id',
    description: 'Scheduled post ID to retry',
    example: 'scheduled_abc123'
  })
  @ApiOperation({
    summary: 'Retry failed scheduled post',
    description: 'Attempt to republish a specific scheduled post that previously failed. Requires the scheduled post ID and platform credentials.'
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled post retried successfully',
    type: RetryPublishResultEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid scheduled post ID or credentials'
  })
  @ApiResponse({
    status: 404,
    description: 'Scheduled post not found'
  })
  @ApiResponse({
    status: 500,
    description: 'Retry publishing failed'
  })
  async retryScheduledPost(
    @Param('id') scheduledPostId: string,
    @Body() credentials: ProcessScheduledPostsDto
  ): Promise<RetryPublishResultEntity> {
    this.logger.log(`Retrying scheduled post: ${scheduledPostId}`);
    return await this.publisherService.retryScheduledPost(scheduledPostId, credentials);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get publisher status',
    description: 'Check the health status of the publisher service, including API health, queue status, and credential configuration for all platforms.'
  })
  @ApiResponse({
    status: 200,
    description: 'Publisher status retrieved successfully',
    type: PublisherStatusEntity
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to get publisher status'
  })
  async getPublisherStatus(): Promise<PublisherStatusEntity> {
    this.logger.log('Getting publisher status');
    return await this.publisherService.getPublisherStatus();
  }

  @Post('immediate')
  @ApiOperation({
    summary: 'Publish immediately',
    description: 'Publish a post immediately to a platform, bypassing the scheduling system. Requires post content and platform access token.'
  })
  @ApiResponse({
    status: 200,
    description: 'Post published immediately',
    type: ImmediatePublishResultEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or missing required fields'
  })
  @ApiResponse({
    status: 500,
    description: 'Immediate publishing failed'
  })
  async publishImmediately(@Body() publishDto: PublishImmediateDto): Promise<ImmediatePublishResultEntity> {
    this.logger.log(`Publishing immediately: post ${publishDto.postId} on ${publishDto.platform}`);
    return await this.publisherService.publishImmediately(publishDto);
  }
}