/**
 * ProcessingJob Types and Enums
 * Comprehensive type definitions for async job processing with state management
 */

import { JobType } from '@content-creation/types';

/**
 * Processing job states following the state machine pattern
 */
export enum ProcessingJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  PERMANENTLY_FAILED = 'permanently_failed',
  CANCELLED = 'cancelled'
}

/**
 * Configuration for different job types
 * Defines retry behavior, timeouts, and backoff strategies
 */
export interface JobTypeConfig {
  maxRetries: number;
  timeout: number; // milliseconds
  baseDelay: number; // base delay for exponential backoff
  maxDelay: number; // maximum delay for retries
  staleThreshold: number; // time after which a processing job is considered stale
}

/**
 * Default configuration for each job type
 */
export const JOB_TYPE_CONFIG: Record<JobType, JobTypeConfig> = {
  clean_transcript: {
    maxRetries: 3,
    timeout: 60000, // 1 minute
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    staleThreshold: 300000 // 5 minutes
  },
  extract_insights: {
    maxRetries: 5,
    timeout: 120000, // 2 minutes
    baseDelay: 2000, // 2 seconds
    maxDelay: 60000, // 1 minute
    staleThreshold: 600000 // 10 minutes
  },
  generate_posts: {
    maxRetries: 4,
    timeout: 90000, // 1.5 minutes
    baseDelay: 1500, // 1.5 seconds
    maxDelay: 45000, // 45 seconds
    staleThreshold: 450000 // 7.5 minutes
  }
};

/**
 * Metrics tracked for each processing job
 */
export interface ProcessingJobMetrics {
  processingDurationMs: number;
  estimatedTokens: number;
  estimatedCost: number;
  progressUpdates: number; // count of progress updates
  retryAttempts: number;
}

/**
 * Progress update payload
 */
export interface ProgressUpdate {
  progress: number; // 0-100
  message?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Error details for failed jobs
 */
export interface JobError {
  message: string;
  code?: string;
  stack?: string;
  timestamp: Date;
  isRetryable: boolean;
}

/**
 * Job metadata that can be attached to any job
 */
export interface JobMetadata {
  userId?: string;
  source?: string;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  [key: string]: any;
}

/**
 * Complete ProcessingJob interface matching Prisma schema
 */
export interface ProcessingJob {
  id: string;
  jobType: JobType;
  sourceId: string;
  status: ProcessingJobStatus;
  progress: number;
  resultCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  estimatedTokens: number | null;
  estimatedCost: number | null;
  createdAt: Date;
  updatedAt: Date;
  // Additional fields to be added via migration
  retryCount?: number;
  maxRetries?: number;
  lastError?: JobError | null;
  metadata?: JobMetadata | null;
}

/**
 * Helper to determine if a job can be retried
 */
export function canRetryJob(job: ProcessingJob): boolean {
  const config = JOB_TYPE_CONFIG[job.jobType as JobType];
  const retryCount = job.retryCount || 0;
  const maxRetries = job.maxRetries || config.maxRetries;
  
  return (
    job.status === ProcessingJobStatus.FAILED &&
    retryCount < maxRetries &&
    job.lastError?.isRetryable !== false
  );
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(jobType: JobType, retryCount: number): number {
  const config = JOB_TYPE_CONFIG[jobType];
  const delay = config.baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, config.maxDelay);
}

/**
 * Check if a job is stale (processing for too long)
 */
export function isJobStale(job: ProcessingJob): boolean {
  if (job.status !== ProcessingJobStatus.PROCESSING || !job.startedAt) {
    return false;
  }
  
  const config = JOB_TYPE_CONFIG[job.jobType as JobType];
  const processingTime = Date.now() - new Date(job.startedAt).getTime();
  return processingTime > config.staleThreshold;
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: ProcessingJobStatus): string {
  const descriptions: Record<ProcessingJobStatus, string> = {
    [ProcessingJobStatus.QUEUED]: 'Waiting to process',
    [ProcessingJobStatus.PROCESSING]: 'Currently processing',
    [ProcessingJobStatus.COMPLETED]: 'Successfully completed',
    [ProcessingJobStatus.FAILED]: 'Failed to process',
    [ProcessingJobStatus.RETRYING]: 'Retrying after failure',
    [ProcessingJobStatus.PERMANENTLY_FAILED]: 'Failed after maximum retries',
    [ProcessingJobStatus.CANCELLED]: 'Cancelled by user or system'
  };
  
  return descriptions[status] || 'Unknown status';
}

/**
 * Type guard to check if status is terminal (final state)
 */
export function isTerminalStatus(status: ProcessingJobStatus): boolean {
  return [
    ProcessingJobStatus.COMPLETED,
    ProcessingJobStatus.PERMANENTLY_FAILED,
    ProcessingJobStatus.CANCELLED
  ].includes(status);
}

/**
 * Type guard to check if status allows progress updates
 */
export function canUpdateProgress(status: ProcessingJobStatus): boolean {
  return status === ProcessingJobStatus.PROCESSING;
}