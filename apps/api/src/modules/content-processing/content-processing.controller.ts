import { 
  Controller, 
  Post, 
  Get,
  Delete,
  Body, 
  Param, 
  HttpStatus,
  BadRequestException 
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { ContentProcessingService } from './content-processing.service';
import { 
  JobStatusDto, 
  BulkJobStatusRequestDto,
  BulkJobStatusResponseDto,
  RetryJobResponseDto,
  CleanupStaleJobsResponseDto 
} from './dto/job-status.dto';

@ApiTags('Content Processing')
@ApiBearerAuth()
@Controller('content-processing')
export class ContentProcessingController {
  constructor(private readonly contentProcessingService: ContentProcessingService) {}

  @Post('transcripts/:id/clean')
  @ApiOperation({ 
    summary: 'Trigger transcript cleaning',
    description: 'Starts the content processing pipeline by cleaning a raw transcript'
  })
  @ApiParam({ name: 'id', description: 'Transcript ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transcript cleaning job started successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid transcript or transcript not in raw status',
  })
  async triggerTranscriptCleaning(@Param('id') transcriptId: string) {
    try {
      const result = await this.contentProcessingService.triggerTranscriptCleaning(transcriptId);
      
      return {
        success: true,
        data: result,
        message: `Transcript cleaning job started for transcript ${transcriptId}`,
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Operation failed');
    }
  }

  @Post('insights/:id/generate-posts')
  @ApiOperation({ 
    summary: 'Trigger post generation',
    description: 'Generate social media posts from an approved insight'
  })
  @ApiParam({ name: 'id', description: 'Insight ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Post generation job started successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async triggerPostGeneration(
    @Param('id') insightId: string,
    @Body() body: { platforms: ('linkedin' | 'x')[] }
  ) {
    try {
      const platforms = body.platforms || ['linkedin', 'x'];
      const result = await this.contentProcessingService.triggerPostGeneration(insightId, platforms);
      
      return {
        success: true,
        data: result,
        message: `Post generation job started for insight ${insightId}`,
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Operation failed');
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get content processing queue statistics',
    description: 'Returns statistics for all content processing queues and processors'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue statistics retrieved successfully',
  })
  async getQueueStats() {
    const stats = await this.contentProcessingService.getQueueStats();
    
    return {
      success: true,
      data: stats,
    };
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Get content processing health status',
    description: 'Returns health status of queues and processors'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health status retrieved successfully',
  })
  async getHealthStatus() {
    const health = await this.contentProcessingService.getHealthStatus();
    
    return {
      success: true,
      data: health,
    };
  }

  @Post('pause')
  @ApiOperation({ 
    summary: 'Pause content processing',
    description: 'Pauses all content processing queues'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content processing paused successfully',
  })
  async pauseProcessing() {
    await this.contentProcessingService.pauseProcessing();
    
    return {
      success: true,
      message: 'Content processing paused',
    };
  }

  @Post('resume')
  @ApiOperation({ 
    summary: 'Resume content processing',
    description: 'Resumes all content processing queues'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content processing resumed successfully',
  })
  async resumeProcessing() {
    await this.contentProcessingService.resumeProcessing();
    
    return {
      success: true,
      message: 'Content processing resumed',
    };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ 
    summary: 'Get job status by ID',
    description: 'Returns the current status and details of a specific queue job'
  })
  @ApiParam({ name: 'jobId', description: 'Queue job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job status retrieved successfully',
    type: JobStatusDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  async getJobStatus(@Param('jobId') jobId: string) {
    try {
      const status = await this.contentProcessingService.getJobStatus(jobId);
      
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Operation failed');
    }
  }

  @Post('jobs/status')
  @ApiOperation({ 
    summary: 'Get multiple job statuses',
    description: 'Returns the status of multiple queue jobs in a single request'
  })
  @ApiBody({ type: BulkJobStatusRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job statuses retrieved successfully',
    type: BulkJobStatusResponseDto,
  })
  async getBulkJobStatus(@Body() body: BulkJobStatusRequestDto) {
    try {
      const statuses = await this.contentProcessingService.getBulkJobStatus(body.jobIds);
      
      // Convert Map to plain object for JSON response
      const jobs: Record<string, any> = {};
      statuses.forEach((status, jobId) => {
        jobs[jobId] = status;
      });
      
      return {
        success: true,
        data: { jobs },
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Operation failed');
    }
  }

  @Post('jobs/:jobId/retry')
  @ApiOperation({ 
    summary: 'Retry a failed job',
    description: 'Retries a failed queue job and returns the new job ID'
  })
  @ApiParam({ name: 'jobId', description: 'Failed job ID to retry' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job queued for retry successfully',
    type: RetryJobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Job cannot be retried (not failed or not found)',
  })
  async retryJob(@Param('jobId') jobId: string) {
    try {
      const result = await this.contentProcessingService.retryFailedJob(jobId);
      
      return {
        success: true,
        newJobId: result.jobId,
        message: `Job ${jobId} queued for retry with new ID: ${result.jobId}`,
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Operation failed');
    }
  }

  @Delete('jobs/stale')
  @ApiOperation({ 
    summary: 'Clean up stale job references',
    description: 'Removes orphaned job IDs from the database where the job no longer exists in the queue'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stale job references cleaned successfully',
    type: CleanupStaleJobsResponseDto,
  })
  async cleanupStaleJobs() {
    try {
      const cleanedCount = await this.contentProcessingService.cleanupStaleJobReferences();
      
      return {
        success: true,
        cleanedCount,
        message: `Cleaned ${cleanedCount} stale job references`,
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Operation failed');
    }
  }
}