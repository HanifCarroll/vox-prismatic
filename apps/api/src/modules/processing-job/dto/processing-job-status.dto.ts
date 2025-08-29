/**
 * ProcessingJob DTOs
 * Data transfer objects for ProcessingJob API responses
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsObject, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProcessingJobStatus, JobType } from '@content-creation/types';
import type { JobError, ProcessingJobMetrics, JobMetadata } from '../types/processing-job.types';

/**
 * Job error details DTO
 */
export class ProcessingJobErrorDto {
  @ApiProperty({ description: 'Error message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Error code', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Error stack trace', required: false })
  @IsOptional()
  @IsString()
  stack?: string;

  @ApiProperty({ description: 'Error timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Whether the job can be retried' })
  isRetryable: boolean;
}

/**
 * Job metrics DTO
 */
export class ProcessingJobMetricsDto {
  @ApiProperty({ description: 'Processing duration in milliseconds' })
  @IsNumber()
  processingDurationMs: number;

  @ApiProperty({ description: 'Estimated tokens used' })
  @IsNumber()
  estimatedTokens: number;

  @ApiProperty({ description: 'Estimated cost in USD' })
  @IsNumber()
  estimatedCost: number;

  @ApiProperty({ description: 'Number of progress updates' })
  @IsNumber()
  progressUpdates: number;

  @ApiProperty({ description: 'Number of retry attempts' })
  @IsNumber()
  retryAttempts: number;
}

/**
 * Processing job status DTO
 */
export class ProcessingJobStatusDto {
  @ApiProperty({ description: 'Job ID' })
  @IsString()
  id: string;

  @ApiProperty({ 
    description: 'Job type',
    enum: ['clean_transcript', 'extract_insights', 'generate_posts']
  })
  @IsEnum(['clean_transcript', 'extract_insights', 'generate_posts'])
  jobType: JobType;

  @ApiProperty({ description: 'Source entity ID' })
  @IsString()
  sourceId: string;

  @ApiProperty({ 
    description: 'Job status',
    enum: ProcessingJobStatus 
  })
  @IsEnum(ProcessingJobStatus)
  status: ProcessingJobStatus;

  @ApiProperty({ 
    description: 'Job progress percentage',
    minimum: 0,
    maximum: 100 
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiProperty({ description: 'Number of results produced' })
  @IsNumber()
  resultCount: number;

  @ApiProperty({ 
    description: 'Error details if job failed',
    type: ProcessingJobErrorDto,
    required: false 
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProcessingJobErrorDto)
  error?: ProcessingJobErrorDto;

  @ApiProperty({ description: 'Number of retry attempts made' })
  @IsNumber()
  retryCount: number;

  @ApiProperty({ description: 'Maximum number of retries allowed' })
  @IsNumber()
  maxRetries: number;

  @ApiProperty({ description: 'Job started timestamp', required: false })
  @IsOptional()
  startedAt?: Date;

  @ApiProperty({ description: 'Job completed timestamp', required: false })
  @IsOptional()
  completedAt?: Date;

  @ApiProperty({ description: 'Processing duration in milliseconds', required: false })
  @IsOptional()
  @IsNumber()
  durationMs?: number;

  @ApiProperty({ 
    description: 'Job metrics',
    type: ProcessingJobMetricsDto,
    required: false 
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProcessingJobMetricsDto)
  metrics?: ProcessingJobMetricsDto;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: JobMetadata;

  @ApiProperty({ description: 'Estimated time remaining in milliseconds', required: false })
  @IsOptional()
  @IsNumber()
  estimatedTimeRemaining?: number;

  @ApiProperty({ description: 'Whether the job is in a terminal state' })
  isTerminal: boolean;

  @ApiProperty({ description: 'Whether the job can be retried' })
  canRetry: boolean;

  @ApiProperty({ description: 'Human-readable status description' })
  @IsString()
  statusDescription: string;

  @ApiProperty({ description: 'Job creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Job last update timestamp' })
  updatedAt: Date;
}

/**
 * Progress update request DTO
 */
export class UpdateProgressDto {
  @ApiProperty({ 
    description: 'Progress percentage',
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiProperty({ description: 'Progress message', required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Start processing request DTO
 */
export class StartProcessingDto {
  @ApiProperty({ description: 'Job ID to start processing' })
  @IsString()
  jobId: string;
}

/**
 * Cancel job request DTO
 */
export class CancelJobDto {
  @ApiProperty({ description: 'Cancellation reason', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Retry job response DTO
 */
export class RetryJobResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Job ID' })
  @IsString()
  jobId: string;

  @ApiProperty({ description: 'Retry attempt number' })
  @IsNumber()
  attemptNumber: number;

  @ApiProperty({ description: 'Backoff delay in milliseconds' })
  @IsNumber()
  backoffDelay: number;

  @ApiProperty({ description: 'Response message' })
  @IsString()
  message: string;
}

/**
 * Batch job status response DTO
 */
export class BatchJobStatusDto {
  @ApiProperty({ 
    description: 'Map of job ID to job status',
    type: 'object',
    additionalProperties: {
      type: 'object',
      $ref: '#/components/schemas/ProcessingJobStatusDto'
    }
  })
  jobs: Record<string, ProcessingJobStatusDto>;

  @ApiProperty({ description: 'Total number of jobs' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Number of completed jobs' })
  @IsNumber()
  completed: number;

  @ApiProperty({ description: 'Number of failed jobs' })
  @IsNumber()
  failed: number;

  @ApiProperty({ description: 'Number of processing jobs' })
  @IsNumber()
  processing: number;

  @ApiProperty({ description: 'Number of queued jobs' })
  @IsNumber()
  queued: number;
}

/**
 * Job statistics DTO
 */
export class ProcessingJobStatsDto {
  @ApiProperty({ 
    description: 'Statistics by job type',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        completed: { type: 'number' },
        failed: { type: 'number' },
        processing: { type: 'number' },
        averageDuration: { type: 'number', nullable: true },
        averageCost: { type: 'number', nullable: true }
      }
    }
  })
  byJobType: Record<JobType, {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    averageDuration: number | null;
    averageCost: number | null;
  }>;

  @ApiProperty({ 
    description: 'Overall totals',
    type: 'object',
    properties: {
      all: { type: 'number' },
      completed: { type: 'number' },
      failed: { type: 'number' },
      processing: { type: 'number' },
      queued: { type: 'number' }
    }
  })
  totals: {
    all: number;
    completed: number;
    failed: number;
    processing: number;
    queued: number;
  };
}

/**
 * Stale jobs cleanup response DTO
 */
export class CleanupStaleJobsResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Number of stale jobs found' })
  @IsNumber()
  staleJobsFound: number;

  @ApiProperty({ description: 'Number of jobs marked as failed' })
  @IsNumber()
  jobsMarkedFailed: number;

  @ApiProperty({ description: 'Number of jobs retried' })
  @IsNumber()
  jobsRetried: number;

  @ApiProperty({ description: 'List of affected job IDs' })
  affectedJobIds: string[];

  @ApiProperty({ description: 'Response message' })
  @IsString()
  message: string;
}