/**
 * ProcessingJob Event Definitions
 * Event interfaces and constants for processing job state changes and notifications
 */

import { ProcessingJobStatus, JobError, ProcessingJobMetrics } from '../types/processing-job.types';
import { ProcessingJobStateMachineContext } from '../state/processing-job-state-machine';
import { JobType } from '@content-creation/types';

/**
 * Event emitted when a processing job's state changes
 */
export interface ProcessingJobStateChangedEvent {
  jobId: string;
  jobType: string;
  sourceId: string;
  previousState: ProcessingJobStatus;
  newState: ProcessingJobStatus;
  event: string;
  context: ProcessingJobStateMachineContext;
  timestamp: Date;
}

/**
 * Event emitted when a processing job starts
 */
export interface ProcessingJobStartedEvent {
  jobId: string;
  jobType: string;
  sourceId: string;
  timestamp: Date;
}

/**
 * Event emitted when a processing job's progress is updated
 */
export interface ProcessingJobProgressEvent {
  jobId: string;
  jobType: string;
  sourceId: string;
  progress: number; // 0-100
  message?: string;
  metadata?: Record<string, any>;
  estimatedTimeRemaining: number | null; // milliseconds
  timestamp: Date;
}

/**
 * Event emitted when a processing job completes successfully
 */
export interface ProcessingJobCompletedEvent {
  jobId: string;
  jobType: string;
  sourceId: string;
  result?: any;
  metrics: ProcessingJobMetrics;
  timestamp: Date;
}

/**
 * Event emitted when a processing job fails
 */
export interface ProcessingJobFailedEvent {
  jobId: string;
  jobType: string;
  sourceId: string;
  error: JobError | null;
  canRetry: boolean;
  timestamp: Date;
}

/**
 * Event emitted when a processing job is retrying
 */
export interface ProcessingJobRetryingEvent {
  jobId: string;
  jobType: string;
  sourceId: string;
  attempt: number; // Current attempt number
  maxAttempts: number;
  backoffDelay: number; // milliseconds until retry
  timestamp: Date;
}

/**
 * Event emitted when a processing job is cancelled
 */
export interface ProcessingJobCancelledEvent {
  jobId: string;
  jobType: string;
  sourceId: string;
  reason: string | null;
  timestamp: Date;
}

/**
 * Event emitted when a processing job permanently fails
 */
export interface ProcessingJobPermanentlyFailedEvent {
  jobId: string;
  jobType: string;
  sourceId: string;
  lastError: JobError | null;
  attempts: number; // Total attempts made
  timestamp: Date;
}

/**
 * Event emitted when an invalid state transition is attempted
 */
export interface ProcessingJobInvalidTransitionEvent {
  jobId: string;
  currentState: ProcessingJobStatus;
  attemptedEvent: string;
  availableTransitions: string[];
  timestamp: Date;
}

/**
 * Event emitted when a batch of jobs is processed
 */
export interface ProcessingJobBatchEvent {
  batchId: string;
  jobIds: string[];
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  progress: number;
  timestamp: Date;
}

/**
 * Event emitted when stale jobs are detected and handled
 */
export interface ProcessingJobStaleDetectedEvent {
  jobIds: string[];
  count: number;
  timestamp: Date;
}

/**
 * Event name constants for type safety
 */
export const PROCESSING_JOB_EVENTS = {
  // Core state events
  STATE_CHANGED: 'processing-job.state.changed',
  STARTED: 'processing-job.started',
  PROGRESS: 'processing-job.progress',
  COMPLETED: 'processing-job.completed',
  FAILED: 'processing-job.failed',
  RETRYING: 'processing-job.retrying',
  CANCELLED: 'processing-job.cancelled',
  PERMANENTLY_FAILED: 'processing-job.permanently-failed',
  
  // Validation events
  INVALID_TRANSITION: 'processing-job.transition.invalid',
  
  // Batch processing events
  BATCH_STARTED: 'processing-job.batch.started',
  BATCH_PROGRESS: 'processing-job.batch.progress',
  BATCH_COMPLETED: 'processing-job.batch.completed',
  
  // Monitoring events
  STALE_DETECTED: 'processing-job.stale.detected',
  STALE_CLEANED: 'processing-job.stale.cleaned',
  
  // Analytics events
  METRICS_UPDATED: 'processing-job.metrics.updated',
  COST_CALCULATED: 'processing-job.cost.calculated',
} as const;

/**
 * Event priorities for notification and handling
 */
export enum ProcessingJobEventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Get event priority based on event type and context
 */
export function getEventPriority(
  eventType: keyof typeof PROCESSING_JOB_EVENTS,
  context?: { retryCount?: number; jobType?: JobType }
): ProcessingJobEventPriority {
  // Critical events
  if (eventType === 'PERMANENTLY_FAILED') {
    return ProcessingJobEventPriority.CRITICAL;
  }
  
  // High priority events
  if (eventType === 'FAILED' && context?.retryCount && context.retryCount >= 2) {
    return ProcessingJobEventPriority.HIGH;
  }
  
  if (eventType === 'STALE_DETECTED') {
    return ProcessingJobEventPriority.HIGH;
  }
  
  // Low priority events
  if (eventType === 'PROGRESS') {
    return ProcessingJobEventPriority.LOW;
  }
  
  // Default to normal
  return ProcessingJobEventPriority.NORMAL;
}

/**
 * Helper to create standardized event payloads
 */
export class ProcessingJobEventFactory {
  static createStateChangedEvent(
    jobId: string,
    jobType: string,
    sourceId: string,
    previousState: ProcessingJobStatus,
    newState: ProcessingJobStatus,
    event: string,
    context: ProcessingJobStateMachineContext
  ): ProcessingJobStateChangedEvent {
    return {
      jobId,
      jobType,
      sourceId,
      previousState,
      newState,
      event,
      context,
      timestamp: new Date()
    };
  }

  static createProgressEvent(
    jobId: string,
    jobType: string,
    sourceId: string,
    progress: number,
    estimatedTimeRemaining: number | null = null,
    message?: string,
    metadata?: Record<string, any>
  ): ProcessingJobProgressEvent {
    return {
      jobId,
      jobType,
      sourceId,
      progress,
      message,
      metadata,
      estimatedTimeRemaining,
      timestamp: new Date()
    };
  }

  static createFailedEvent(
    jobId: string,
    jobType: string,
    sourceId: string,
    error: JobError | null,
    canRetry: boolean
  ): ProcessingJobFailedEvent {
    return {
      jobId,
      jobType,
      sourceId,
      error,
      canRetry,
      timestamp: new Date()
    };
  }
}