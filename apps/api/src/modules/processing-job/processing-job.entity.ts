/**
 * ProcessingJobEntity
 * Domain entity representing a processing job with state management
 */

import { ProcessingJobStatus, JobError, JobMetadata, isTerminalStatus, getStatusDescription } from './types/processing-job.types';
import { JobType } from '@content-creation/types';

/**
 * ProcessingJob entity class
 * Encapsulates business logic and domain rules for processing jobs
 */
export class ProcessingJobEntity {
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
  
  // Extended fields (to be added via migration)
  retryCount: number;
  maxRetries?: number;
  lastError: JobError | null;
  metadata: JobMetadata | null;

  constructor(data: {
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
    retryCount?: number;
    maxRetries?: number;
    lastError?: JobError | null;
    metadata?: JobMetadata | null;
  }) {
    this.id = data.id;
    this.jobType = data.jobType;
    this.sourceId = data.sourceId;
    this.status = data.status;
    this.progress = data.progress;
    this.resultCount = data.resultCount;
    this.errorMessage = data.errorMessage;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.durationMs = data.durationMs;
    this.estimatedTokens = data.estimatedTokens;
    this.estimatedCost = data.estimatedCost;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.retryCount = data.retryCount || 0;
    this.maxRetries = data.maxRetries;
    this.lastError = data.lastError || null;
    this.metadata = data.metadata || null;
  }

  /**
   * Check if the job is in a terminal state
   */
  isTerminal(): boolean {
    return isTerminalStatus(this.status);
  }

  /**
   * Check if the job can be retried
   */
  canRetry(): boolean {
    if (this.status !== ProcessingJobStatus.FAILED) {
      return false;
    }

    if (this.lastError?.isRetryable === false) {
      return false;
    }

    const maxRetries = this.getMaxRetries();
    return this.retryCount < maxRetries;
  }

  /**
   * Check if the job is currently processing
   */
  isProcessing(): boolean {
    return this.status === ProcessingJobStatus.PROCESSING;
  }

  /**
   * Check if the job is queued
   */
  isQueued(): boolean {
    return this.status === ProcessingJobStatus.QUEUED;
  }

  /**
   * Check if the job has completed successfully
   */
  isCompleted(): boolean {
    return this.status === ProcessingJobStatus.COMPLETED;
  }

  /**
   * Check if the job has failed
   */
  isFailed(): boolean {
    return this.status === ProcessingJobStatus.FAILED || 
           this.status === ProcessingJobStatus.PERMANENTLY_FAILED;
  }

  /**
   * Get the maximum number of retries for this job type
   */
  getMaxRetries(): number {
    if (this.maxRetries !== undefined) {
      return this.maxRetries;
    }

    // Default max retries based on job type
    const defaults: Record<JobType, number> = {
      clean_transcript: 3,
      extract_insights: 5,
      generate_posts: 4
    };

    return defaults[this.jobType] || 3;
  }

  /**
   * Get processing duration in seconds
   */
  getProcessingDurationSeconds(): number | null {
    if (!this.durationMs) {
      return null;
    }
    return Math.round(this.durationMs / 1000);
  }

  /**
   * Get human-readable status description
   */
  getStatusDescription(): string {
    return getStatusDescription(this.status);
  }

  /**
   * Get formatted error message
   */
  getFormattedError(): string | null {
    if (this.lastError) {
      return `${this.lastError.message}${this.lastError.code ? ` (${this.lastError.code})` : ''}`;
    }
    return this.errorMessage;
  }

  /**
   * Calculate progress percentage
   */
  getProgressPercentage(): string {
    return `${this.progress}%`;
  }

  /**
   * Check if job has been running for too long
   */
  isStale(thresholdMs: number): boolean {
    if (this.status !== ProcessingJobStatus.PROCESSING || !this.startedAt) {
      return false;
    }

    const processingTime = Date.now() - new Date(this.startedAt).getTime();
    return processingTime > thresholdMs;
  }

  /**
   * Get job age in milliseconds
   */
  getAge(): number {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Get job age in human-readable format
   */
  getFormattedAge(): string {
    const ageMs = this.getAge();
    const seconds = Math.floor(ageMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  }

  /**
   * Get formatted processing duration
   */
  getFormattedDuration(): string | null {
    if (!this.durationMs) {
      return null;
    }

    const seconds = Math.floor(this.durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Get estimated cost in formatted currency
   */
  getFormattedCost(): string | null {
    if (this.estimatedCost === null || this.estimatedCost === undefined) {
      return null;
    }
    return `$${this.estimatedCost.toFixed(4)}`;
  }

  /**
   * Convert entity to plain object
   */
  toObject(): Record<string, any> {
    return {
      id: this.id,
      jobType: this.jobType,
      sourceId: this.sourceId,
      status: this.status,
      progress: this.progress,
      resultCount: this.resultCount,
      errorMessage: this.errorMessage,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      durationMs: this.durationMs,
      estimatedTokens: this.estimatedTokens,
      estimatedCost: this.estimatedCost,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      lastError: this.lastError,
      metadata: this.metadata
    };
  }

  /**
   * Convert entity to summary object for API responses
   */
  toSummary(): Record<string, any> {
    return {
      id: this.id,
      jobType: this.jobType,
      sourceId: this.sourceId,
      status: this.status,
      statusDescription: this.getStatusDescription(),
      progress: this.progress,
      progressPercentage: this.getProgressPercentage(),
      isTerminal: this.isTerminal(),
      canRetry: this.canRetry(),
      retryCount: this.retryCount,
      duration: this.getFormattedDuration(),
      cost: this.getFormattedCost(),
      error: this.getFormattedError(),
      age: this.getFormattedAge(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}