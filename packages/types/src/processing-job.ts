/**
 * Processing Job Extension Types
 * Domain logic types for processing jobs, state machines, and event handling
 */

import { ProcessingJobStatus, JobType, ProcessingJobEventPriority } from './enums';

// =====================================================================
// JOB CONFIGURATION TYPES
// =====================================================================

export interface JobTypeConfig {
  maxAttempts: number;
  backoffDelay: number; // Base delay in milliseconds
  maxBackoffDelay: number; // Maximum delay in milliseconds
  timeout: number; // Job timeout in milliseconds
  stalledInterval: number; // How often to check for stalled jobs
  maxStalledCount: number; // Max times a job can be stalled before failing
}

export const JOB_TYPE_CONFIG: Record<JobType, JobTypeConfig> = {
  [JobType.CLEAN_TRANSCRIPT]: {
    maxAttempts: 3,
    backoffDelay: 5000, // 5 seconds
    maxBackoffDelay: 30000, // 30 seconds
    timeout: 300000, // 5 minutes
    stalledInterval: 30000, // 30 seconds
    maxStalledCount: 3,
  },
  [JobType.EXTRACT_INSIGHTS]: {
    maxAttempts: 2,
    backoffDelay: 10000, // 10 seconds
    maxBackoffDelay: 60000, // 1 minute
    timeout: 600000, // 10 minutes
    stalledInterval: 60000, // 1 minute
    maxStalledCount: 2,
  },
  [JobType.GENERATE_POSTS]: {
    maxAttempts: 2,
    backoffDelay: 15000, // 15 seconds
    maxBackoffDelay: 120000, // 2 minutes
    timeout: 900000, // 15 minutes
    stalledInterval: 90000, // 1.5 minutes
    maxStalledCount: 2,
  },
};

// =====================================================================
// PROCESSING JOB METRICS AND METADATA
// =====================================================================

export interface ProcessingJobMetrics {
  startTime: Date;
  endTime?: Date;
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  memoryUsage?: number;
  cpuTime?: number;
}

export interface ProgressUpdate {
  progress: number; // 0-100
  message?: string;
  estimatedTimeRemaining?: number; // seconds
  metadata?: Record<string, any>;
}

export interface JobError {
  message: string;
  stack?: string;
  code?: string;
  retryable?: boolean;
  metadata?: Record<string, any>;
}

export interface JobMetadata {
  userId?: string;
  entityId: string;
  entityType: string;
  parentJobId?: string;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high' | 'critical';
  source?: string;
  retryCount?: number;
  originalJobId?: string;
}

// =====================================================================
// COMPLETE PROCESSING JOB INTERFACE
// =====================================================================

export interface ProcessingJob {
  id: string;
  type: JobType;
  status: ProcessingJobStatus;
  progress: number;
  entityId: string;
  entityType: string;
  data?: Record<string, any>;
  result?: Record<string, any>;
  error?: JobError;
  attemptsMade: number;
  maxAttempts: number;
  metrics?: ProcessingJobMetrics;
  metadata?: JobMetadata;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
}

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

/**
 * Check if a job can be retried based on its current state
 */
export function canRetryJob(job: ProcessingJob): boolean {
  if (job.status !== ProcessingJobStatus.FAILED) {
    return false;
  }
  
  if (job.attemptsMade >= job.maxAttempts) {
    return false;
  }
  
  // Check if the error is retryable
  if (job.error && job.error.retryable === false) {
    return false;
  }
  
  return true;
}

/**
 * Calculate exponential backoff delay for retries
 */
export function calculateBackoffDelay(
  baseDelay: number,
  attemptNumber: number,
  maxDelay: number
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Check if a job is stale (processing for too long)
 */
export function isJobStale(job: ProcessingJob, stalledInterval: number): boolean {
  if (job.status !== ProcessingJobStatus.PROCESSING) {
    return false;
  }
  
  if (!job.startedAt) {
    return false;
  }
  
  const now = new Date();
  const processingTime = now.getTime() - job.startedAt.getTime();
  
  return processingTime > stalledInterval;
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: ProcessingJobStatus): string {
  const descriptions: Record<ProcessingJobStatus, string> = {
    [ProcessingJobStatus.PENDING]: 'Waiting to be processed',
    [ProcessingJobStatus.QUEUED]: 'Queued for processing',
    [ProcessingJobStatus.PROCESSING]: 'Currently being processed',
    [ProcessingJobStatus.COMPLETED]: 'Successfully completed',
    [ProcessingJobStatus.FAILED]: 'Failed and can be retried',
    [ProcessingJobStatus.RETRYING]: 'Being retried after failure',
    [ProcessingJobStatus.PERMANENTLY_FAILED]: 'Failed permanently',
    [ProcessingJobStatus.CANCELLED]: 'Cancelled by user or system',
  };
  
  return descriptions[status] || 'Unknown status';
}

/**
 * Type guard to check if status is terminal (no further processing)
 */
export function isTerminalStatus(status: ProcessingJobStatus): boolean {
  return [
    ProcessingJobStatus.COMPLETED,
    ProcessingJobStatus.PERMANENTLY_FAILED,
    ProcessingJobStatus.CANCELLED,
  ].includes(status);
}

/**
 * Type guard to check if status allows progress updates
 */
export function canUpdateProgress(status: ProcessingJobStatus): boolean {
  return [
    ProcessingJobStatus.PROCESSING,
    ProcessingJobStatus.RETRYING,
  ].includes(status);
}

// =====================================================================
// EVENT TYPES
// =====================================================================

export interface ProcessingJobStateChangedEvent {
  type: 'PROCESSING_JOB_STATE_CHANGED';
  jobId: string;
  entityType: string;
  entityId: string;
  previousStatus: ProcessingJobStatus;
  newStatus: ProcessingJobStatus;
  timestamp: string;
  metadata?: JobMetadata;
  priority: ProcessingJobEventPriority;
}

export interface ProcessingJobStartedEvent {
  type: 'PROCESSING_JOB_STARTED';
  jobId: string;
  entityType: string;
  entityId: string;
  jobType: JobType;
  timestamp: string;
  metadata?: JobMetadata;
  priority: ProcessingJobEventPriority;
}

export interface ProcessingJobProgressEvent {
  type: 'PROCESSING_JOB_PROGRESS';
  jobId: string;
  entityType: string;
  entityId: string;
  progress: number;
  message?: string;
  estimatedTimeRemaining?: number;
  timestamp: string;
  metadata?: JobMetadata;
  priority: ProcessingJobEventPriority;
}

export interface ProcessingJobCompletedEvent {
  type: 'PROCESSING_JOB_COMPLETED';
  jobId: string;
  entityType: string;
  entityId: string;
  result?: Record<string, any>;
  processingDurationMs: number;
  timestamp: string;
  metadata?: JobMetadata;
  priority: ProcessingJobEventPriority;
}

export interface ProcessingJobFailedEvent {
  type: 'PROCESSING_JOB_FAILED';
  jobId: string;
  entityType: string;
  entityId: string;
  error: JobError;
  attemptsMade: number;
  maxAttempts: number;
  canRetry: boolean;
  timestamp: string;
  metadata?: JobMetadata;
  priority: ProcessingJobEventPriority;
}

export interface ProcessingJobRetryingEvent {
  type: 'PROCESSING_JOB_RETRYING';
  jobId: string;
  entityType: string;
  entityId: string;
  attemptNumber: number;
  maxAttempts: number;
  backoffDelay: number;
  timestamp: string;
  metadata?: JobMetadata;
  priority: ProcessingJobEventPriority;
}

export interface ProcessingJobCancelledEvent {
  type: 'PROCESSING_JOB_CANCELLED';
  jobId: string;
  entityType: string;
  entityId: string;
  reason: string;
  timestamp: string;
  metadata?: JobMetadata;
  priority: ProcessingJobEventPriority;
}

export interface ProcessingJobPermanentlyFailedEvent {
  type: 'PROCESSING_JOB_PERMANENTLY_FAILED';
  jobId: string;
  entityType: string;
  entityId: string;
  error: JobError;
  attemptsMade: number;
  finalFailureReason: string;
  timestamp: string;
  metadata?: JobMetadata;
  priority: ProcessingJobEventPriority;
}

export interface ProcessingJobInvalidTransitionEvent {
  type: 'PROCESSING_JOB_INVALID_TRANSITION';
  jobId: string;
  entityType: string;
  entityId: string;
  fromStatus: ProcessingJobStatus;
  toStatus: ProcessingJobStatus;
  reason: string;
  timestamp: string;
  metadata?: JobMetadata;
  priority: ProcessingJobEventPriority;
}

export interface ProcessingJobBatchEvent {
  type: 'PROCESSING_JOB_BATCH';
  batchId: string;
  jobIds: string[];
  batchType: 'started' | 'completed' | 'failed';
  entityType: string;
  timestamp: string;
  metadata?: Record<string, any>;
  priority: ProcessingJobEventPriority;
}

export interface ProcessingJobStaleDetectedEvent {
  type: 'PROCESSING_JOB_STALE_DETECTED';
  jobId: string;
  entityType: string;
  entityId: string;
  stalledDurationMs: number;
  timestamp: string;
  priority: ProcessingJobEventPriority;
}

// Union type of all processing job events
export type ProcessingJobEvent =
  | ProcessingJobStateChangedEvent
  | ProcessingJobStartedEvent
  | ProcessingJobProgressEvent
  | ProcessingJobCompletedEvent
  | ProcessingJobFailedEvent
  | ProcessingJobRetryingEvent
  | ProcessingJobCancelledEvent
  | ProcessingJobPermanentlyFailedEvent
  | ProcessingJobInvalidTransitionEvent
  | ProcessingJobBatchEvent
  | ProcessingJobStaleDetectedEvent;

// Event name constants for type safety
export const PROCESSING_JOB_EVENTS = {
  STATE_CHANGED: 'PROCESSING_JOB_STATE_CHANGED',
  STARTED: 'PROCESSING_JOB_STARTED',
  PROGRESS: 'PROCESSING_JOB_PROGRESS', 
  COMPLETED: 'PROCESSING_JOB_COMPLETED',
  FAILED: 'PROCESSING_JOB_FAILED',
  RETRYING: 'PROCESSING_JOB_RETRYING',
  CANCELLED: 'PROCESSING_JOB_CANCELLED',
  PERMANENTLY_FAILED: 'PROCESSING_JOB_PERMANENTLY_FAILED',
  INVALID_TRANSITION: 'PROCESSING_JOB_INVALID_TRANSITION',
  BATCH: 'PROCESSING_JOB_BATCH',
  STALE_DETECTED: 'PROCESSING_JOB_STALE_DETECTED',
} as const;

// =====================================================================
// STATE MACHINE TYPES
// =====================================================================

export interface ProcessingJobStateMachineContext {
  jobId: string;
  entityType: string;
  entityId: string;
  jobType: JobType;
  attemptsMade: number;
  maxAttempts: number;
  progress: number;
  error?: JobError;
  result?: Record<string, any>;
  metrics?: ProcessingJobMetrics;
  metadata?: JobMetadata;
}

export type ProcessingJobStateMachineEvent = 
  | { type: 'START'; data?: Record<string, any> }
  | { type: 'PROGRESS'; progress: number; message?: string }
  | { type: 'COMPLETE'; result?: Record<string, any> }
  | { type: 'FAIL'; error: JobError }
  | { type: 'RETRY' }
  | { type: 'CANCEL'; reason: string }
  | { type: 'MARK_PERMANENTLY_FAILED'; reason: string };

export type ProcessingJobStateMachineState = 
  | 'idle'
  | 'pending' 
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'permanentlyFailed'
  | 'cancelled';

// =====================================================================
// XSTATE UTILITY TYPES
// =====================================================================

export interface XStateActionParams<TContext, TEvent> {
  context: TContext;
  event: TEvent;
}

export interface XStateGuardParams<TContext, TEvent> {
  context: TContext;
  event: TEvent;
}

export interface XStateActor<TState, TEvent> {
  send: (event: TEvent) => void;
  getSnapshot: () => { value: TState; context: any };
}

export interface BaseStateMachineContext {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ExtractEventType<T extends { type: string }, K extends T['type']> = 
  T extends { type: K } ? T : never;

export function isEventOfType<T extends { type: string }, K extends T['type']>(
  event: T,
  type: K
): event is ExtractEventType<T, K> {
  return event.type === type;
}

// =====================================================================
// STATE MACHINE UTILITIES
// =====================================================================

/**
 * Get available transitions from current state
 */
export function getAvailableTransitions(
  state: ProcessingJobStateMachineState
): ProcessingJobStateMachineEvent['type'][] {
  const transitions: Record<ProcessingJobStateMachineState, ProcessingJobStateMachineEvent['type'][]> = {
    idle: ['START'],
    pending: ['START', 'CANCEL'],
    queued: ['START', 'CANCEL'], 
    processing: ['PROGRESS', 'COMPLETE', 'FAIL', 'CANCEL'],
    completed: [],
    failed: ['RETRY', 'MARK_PERMANENTLY_FAILED'],
    retrying: ['START', 'MARK_PERMANENTLY_FAILED', 'CANCEL'],
    permanentlyFailed: [],
    cancelled: [],
  };
  
  return transitions[state] || [];
}

/**
 * Check if transition is valid from current state
 */
export function canTransition(
  fromState: ProcessingJobStateMachineState,
  eventType: ProcessingJobStateMachineEvent['type']
): boolean {
  const availableTransitions = getAvailableTransitions(fromState);
  return availableTransitions.includes(eventType);
}

/**
 * Get human-readable state description
 */
export function getStateDescription(state: ProcessingJobStateMachineState): string {
  const descriptions: Record<ProcessingJobStateMachineState, string> = {
    idle: 'Not started',
    pending: 'Waiting to be queued',
    queued: 'Queued for processing',
    processing: 'Currently being processed',
    completed: 'Successfully completed',
    failed: 'Failed but can be retried',
    retrying: 'Being retried after failure',
    permanentlyFailed: 'Failed permanently',
    cancelled: 'Cancelled',
  };
  
  return descriptions[state] || 'Unknown state';
}