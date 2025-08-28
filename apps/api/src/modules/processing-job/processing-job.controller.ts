/**
 * ProcessingJobController
 * REST API endpoints for ProcessingJob management
 */

import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Param, 
  Body, 
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiQuery 
} from '@nestjs/swagger';

import { ProcessingJobStateService } from './processing-job-state.service';
import { ProcessingJobRepository } from './processing-job.repository';
import {
  ProcessingJobStatusDto,
  UpdateProgressDto,
  StartProcessingDto,
  CancelJobDto,
  RetryJobResponseDto,
  BatchJobStatusDto,
  ProcessingJobStatsDto,
  CleanupStaleJobsResponseDto
} from './dto/processing-job-status.dto';
import { ProcessingJobStatus } from './types/processing-job.types';
import { JobType } from '@content-creation/types';

/**
 * Controller for ProcessingJob operations
 */
@ApiTags('Processing Jobs')
@Controller('api/processing-jobs')
export class ProcessingJobController {
  private readonly logger = new Logger(ProcessingJobController.name);

  constructor(
    private readonly processingJobStateService: ProcessingJobStateService,
    private readonly processingJobRepository: ProcessingJobRepository
  ) {}

  /**
   * Get job by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get processing job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Job details',
    type: ProcessingJobStatusDto 
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJob(@Param('id') id: string): Promise<ProcessingJobStatusDto> {
    this.logger.log(`Getting job ${id}`);
    
    const job = await this.processingJobRepository.findById(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    const state = await this.processingJobStateService.getJobState(id);
    
    return {
      id: job.id,
      jobType: job.jobType,
      sourceId: job.sourceId,
      status: job.status,
      progress: job.progress,
      resultCount: job.resultCount,
      error: job.lastError || undefined,
      retryCount: job.retryCount,
      maxRetries: job.getMaxRetries(),
      startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
      completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
      durationMs: job.durationMs || undefined,
      metrics: state.context.metrics,
      metadata: job.metadata || undefined,
      estimatedTimeRemaining: state.context.estimatedTimeRemaining || undefined,
      isTerminal: job.isTerminal(),
      canRetry: job.canRetry(),
      statusDescription: job.getStatusDescription(),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }

  /**
   * Get jobs by status
   */
  @Get()
  @ApiOperation({ summary: 'Get processing jobs by status' })
  @ApiQuery({ 
    name: 'status', 
    enum: ProcessingJobStatus,
    required: false,
    description: 'Filter by job status' 
  })
  @ApiQuery({ 
    name: 'jobType', 
    enum: ['clean_transcript', 'extract_insights', 'generate_posts'],
    required: false,
    description: 'Filter by job type' 
  })
  @ApiQuery({ 
    name: 'sourceId', 
    required: false,
    description: 'Filter by source ID' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of jobs',
    type: [ProcessingJobStatusDto] 
  })
  async getJobs(
    @Query('status') status?: ProcessingJobStatus,
    @Query('jobType') jobType?: JobType,
    @Query('sourceId') sourceId?: string
  ): Promise<ProcessingJobStatusDto[]> {
    let jobs;
    
    if (status) {
      jobs = await this.processingJobRepository.findByStatus(status);
    } else if (jobType) {
      jobs = await this.processingJobRepository.findByJobType(jobType);
    } else if (sourceId) {
      jobs = await this.processingJobRepository.findBySourceId(sourceId);
    } else {
      // Return recent jobs if no filter
      jobs = await this.processingJobRepository.findByStatus(ProcessingJobStatus.PROCESSING);
    }

    return Promise.all(jobs.map(async job => {
      const state = await this.processingJobStateService.getJobState(job.id);
      
      return {
        id: job.id,
        jobType: job.jobType,
        sourceId: job.sourceId,
        status: job.status,
        progress: job.progress,
        resultCount: job.resultCount,
        error: job.lastError || undefined,
        retryCount: job.retryCount,
        maxRetries: job.getMaxRetries(),
        startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
        completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
        durationMs: job.durationMs || undefined,
        metrics: state.context.metrics,
        metadata: job.metadata || undefined,
        estimatedTimeRemaining: state.context.estimatedTimeRemaining || undefined,
        isTerminal: job.isTerminal(),
        canRetry: job.canRetry(),
        statusDescription: job.getStatusDescription(),
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      };
    }));
  }

  /**
   * Start processing a queued job
   */
  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start processing a queued job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Job started',
    type: ProcessingJobStatusDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async startProcessing(@Param('id') id: string): Promise<ProcessingJobStatusDto> {
    this.logger.log(`Starting processing for job ${id}`);
    
    const job = await this.processingJobStateService.startProcessing(id);
    const state = await this.processingJobStateService.getJobState(id);
    
    return {
      id: job.id,
      jobType: job.jobType,
      sourceId: job.sourceId,
      status: job.status,
      progress: job.progress,
      resultCount: job.resultCount,
      error: job.lastError || undefined,
      retryCount: job.retryCount,
      maxRetries: job.getMaxRetries(),
      startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
      completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
      durationMs: job.durationMs || undefined,
      metrics: state.context.metrics,
      metadata: job.metadata || undefined,
      estimatedTimeRemaining: state.context.estimatedTimeRemaining || undefined,
      isTerminal: job.isTerminal(),
      canRetry: job.canRetry(),
      statusDescription: job.getStatusDescription(),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }

  /**
   * Update job progress
   */
  @Put(':id/progress')
  @ApiOperation({ summary: 'Update job progress' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Progress updated',
    type: ProcessingJobStatusDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid progress value' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async updateProgress(
    @Param('id') id: string,
    @Body() dto: UpdateProgressDto
  ): Promise<ProcessingJobStatusDto> {
    this.logger.log(`Updating progress for job ${id}: ${dto.progress}%`);
    
    const job = await this.processingJobStateService.updateProgress(
      id, 
      dto.progress, 
      dto.message, 
      dto.metadata
    );
    
    const state = await this.processingJobStateService.getJobState(id);
    
    return {
      id: job.id,
      jobType: job.jobType,
      sourceId: job.sourceId,
      status: job.status,
      progress: job.progress,
      resultCount: job.resultCount,
      error: job.lastError || undefined,
      retryCount: job.retryCount,
      maxRetries: job.getMaxRetries(),
      startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
      completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
      durationMs: job.durationMs || undefined,
      metrics: state.context.metrics,
      metadata: job.metadata || undefined,
      estimatedTimeRemaining: state.context.estimatedTimeRemaining || undefined,
      isTerminal: job.isTerminal(),
      canRetry: job.canRetry(),
      statusDescription: job.getStatusDescription(),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }

  /**
   * Retry a failed job
   */
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Job retry initiated',
    type: RetryJobResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Job cannot be retried' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async retryJob(@Param('id') id: string): Promise<RetryJobResponseDto> {
    this.logger.log(`Retrying job ${id}`);
    
    const job = await this.processingJobStateService.retryJob(id);
    const backoffDelay = this.processingJobStateService.getBackoffDelay(
      job.jobType,
      job.retryCount
    );
    
    return {
      success: true,
      jobId: job.id,
      attemptNumber: job.retryCount + 1,
      backoffDelay,
      message: `Job ${id} will retry after ${backoffDelay}ms`
    };
  }

  /**
   * Cancel a job
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a processing job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Job cancelled',
    type: ProcessingJobStatusDto 
  })
  @ApiResponse({ status: 400, description: 'Job cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async cancelJob(
    @Param('id') id: string,
    @Body() dto: CancelJobDto
  ): Promise<ProcessingJobStatusDto> {
    this.logger.log(`Cancelling job ${id}: ${dto.reason || 'No reason provided'}`);
    
    const job = await this.processingJobStateService.cancelJob(id, dto.reason);
    const state = await this.processingJobStateService.getJobState(id);
    
    return {
      id: job.id,
      jobType: job.jobType,
      sourceId: job.sourceId,
      status: job.status,
      progress: job.progress,
      resultCount: job.resultCount,
      error: job.lastError || undefined,
      retryCount: job.retryCount,
      maxRetries: job.getMaxRetries(),
      startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
      completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
      durationMs: job.durationMs || undefined,
      metrics: state.context.metrics,
      metadata: job.metadata || undefined,
      estimatedTimeRemaining: state.context.estimatedTimeRemaining || undefined,
      isTerminal: job.isTerminal(),
      canRetry: job.canRetry(),
      statusDescription: job.getStatusDescription(),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }

  /**
   * Get job statistics
   */
  @Get('stats/overview')
  @ApiOperation({ summary: 'Get processing job statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Job statistics',
    type: ProcessingJobStatsDto 
  })
  async getStats(): Promise<ProcessingJobStatsDto> {
    this.logger.log('Getting job statistics');
    
    const stats = await this.processingJobRepository.getOverallStats();
    
    // Get detailed stats for each job type
    const byJobType: any = {};
    for (const jobType of ['clean_transcript', 'extract_insights', 'generate_posts'] as JobType[]) {
      const typeStats = await this.processingJobRepository.getStatsByJobType(jobType);
      byJobType[jobType] = {
        total: typeStats.total,
        completed: typeStats.completed,
        failed: typeStats.failed,
        processing: typeStats.processing,
        averageDuration: typeStats.averageDuration,
        averageCost: typeStats.averageCost
      };
    }
    
    return {
      byJobType,
      totals: stats.totals
    };
  }

  /**
   * Check and handle stale jobs
   */
  @Post('maintenance/check-stale')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check and handle stale processing jobs' })
  @ApiResponse({ 
    status: 200, 
    description: 'Stale jobs handled',
    type: CleanupStaleJobsResponseDto 
  })
  async checkStaleJobs(): Promise<CleanupStaleJobsResponseDto> {
    this.logger.log('Checking for stale jobs');
    
    const staleJobs = await this.processingJobStateService.checkStaleJobs();
    
    return {
      success: true,
      staleJobsFound: staleJobs.length,
      jobsMarkedFailed: staleJobs.filter(j => j.status === ProcessingJobStatus.FAILED).length,
      jobsRetried: staleJobs.filter(j => j.status === ProcessingJobStatus.RETRYING).length,
      affectedJobIds: staleJobs.map(j => j.id),
      message: `Processed ${staleJobs.length} stale jobs`
    };
  }

  /**
   * Clean up old completed jobs
   */
  @Post('maintenance/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up old completed jobs' })
  @ApiQuery({ 
    name: 'olderThanDays', 
    required: false,
    type: Number,
    description: 'Clean jobs older than this many days (default: 30)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cleanup completed'
  })
  async cleanupOldJobs(
    @Query('olderThanDays') olderThanDays: number = 30
  ): Promise<{ deletedCount: number; message: string }> {
    this.logger.log(`Cleaning up jobs older than ${olderThanDays} days`);
    
    const deletedCount = await this.processingJobRepository.cleanupOldJobs(olderThanDays);
    
    return {
      deletedCount,
      message: `Deleted ${deletedCount} old completed jobs`
    };
  }
}