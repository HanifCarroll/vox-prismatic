import { Controller, Post, Get, Delete, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PublisherService } from './publisher.service';
import { QueueService } from '../queue/queue.service';
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

  constructor(
    private readonly publisherService: PublisherService,
    private readonly queueService: QueueService,
  ) {}

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

  // Queue Management Endpoints

  @Get('queue-status')
  @ApiOperation({
    summary: 'Get queue status',
    description: 'Get the current status of the publishing queue including job counts and health metrics.'
  })
  @ApiResponse({
    status: 200,
    description: 'Queue status retrieved successfully'
  })
  async getQueueStatus(): Promise<any> {
    this.logger.log('Getting queue status');
    const stats = await this.queueService.getQueueStats();
    const health = await this.queueService.getHealth();
    return {
      stats,
      health,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('job/:jobId')
  @ApiParam({
    name: 'jobId',
    description: 'Queue job ID',
    example: 'job_123'
  })
  @ApiOperation({
    summary: 'Get job status',
    description: 'Get the status of a specific queue job by its ID.'
  })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found'
  })
  async getJobStatus(@Param('jobId') jobId: string): Promise<any> {
    this.logger.log(`Getting status for job: ${jobId}`);
    const status = await this.queueService.getJobStatus(jobId);
    if (!status) {
      return {
        error: 'Job not found',
        jobId,
      };
    }
    return status;
  }

  @Delete('job/:jobId')
  @ApiParam({
    name: 'jobId',
    description: 'Queue job ID to cancel',
    example: 'job_123'
  })
  @ApiOperation({
    summary: 'Cancel a queued job',
    description: 'Cancel a scheduled job that has not yet been processed.'
  })
  @ApiResponse({
    status: 200,
    description: 'Job cancelled successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found'
  })
  async cancelJob(@Param('jobId') jobId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Cancelling job: ${jobId}`);
    const success = await this.queueService.cancelJob(jobId);
    return {
      success,
      message: success ? 'Job cancelled successfully' : 'Failed to cancel job',
    };
  }

  @Post('queue/pause')
  @ApiOperation({
    summary: 'Pause the queue',
    description: 'Pause processing of the publishing queue. Existing jobs will remain but won\'t be processed.'
  })
  @ApiResponse({
    status: 200,
    description: 'Queue paused successfully'
  })
  async pauseQueue(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Pausing queue');
    await this.queueService.pauseQueue();
    return {
      success: true,
      message: 'Queue paused successfully',
    };
  }

  @Post('queue/resume')
  @ApiOperation({
    summary: 'Resume the queue',
    description: 'Resume processing of the publishing queue after it has been paused.'
  })
  @ApiResponse({
    status: 200,
    description: 'Queue resumed successfully'
  })
  async resumeQueue(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Resuming queue');
    await this.queueService.resumeQueue();
    return {
      success: true,
      message: 'Queue resumed successfully',
    };
  }

  @Delete('queue/completed')
  @ApiOperation({
    summary: 'Clear completed jobs',
    description: 'Remove all completed jobs from the queue to free up memory.'
  })
  @ApiResponse({
    status: 200,
    description: 'Completed jobs cleared successfully'
  })
  async clearCompleted(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Clearing completed jobs');
    await this.queueService.clearCompleted();
    return {
      success: true,
      message: 'Completed jobs cleared successfully',
    };
  }

  @Delete('queue/failed')
  @ApiOperation({
    summary: 'Clear failed jobs',
    description: 'Remove all failed jobs from the queue.'
  })
  @ApiResponse({
    status: 200,
    description: 'Failed jobs cleared successfully'
  })
  async clearFailed(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Clearing failed jobs');
    await this.queueService.clearFailed();
    return {
      success: true,
      message: 'Failed jobs cleared successfully',
    };
  }
}