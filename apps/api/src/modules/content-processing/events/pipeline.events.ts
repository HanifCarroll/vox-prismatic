/**
 * Pipeline Event Definitions
 * Events emitted throughout the content pipeline lifecycle
 */

import { PipelineState } from '@content-creation/types';
import { BlockingItem, PipelineMetrics } from '../state/pipeline-context.types';

/**
 * Base interface for all pipeline events
 */
export interface BasePipelineEvent {
  pipelineId: string;
  transcriptId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Pipeline lifecycle events
 */
export interface PipelineStartedEvent extends BasePipelineEvent {
  options: Record<string, any>;
  template: string;
  estimatedDuration?: number;
}

export interface PipelineProgressEvent extends BasePipelineEvent {
  currentState: PipelineState;
  currentStep: string;
  progress: number;
  completedSteps: number;
  totalSteps: number;
  estimatedCompletion?: Date;
}

export interface PipelineBlockedEvent extends BasePipelineEvent {
  blockingItems: BlockingItem[];
  currentState: PipelineState;
  message: string;
}

export interface PipelineCompletedEvent extends BasePipelineEvent {
  duration: number;
  insightCount: number;
  postCount: number;
  metrics: PipelineMetrics;
  successfulSteps: string[];
}

export interface PipelinePartiallyCompletedEvent extends BasePipelineEvent {
  duration: number;
  completedSteps: string[];
  failedSteps: string[];
  insightCount: number;
  postCount: number;
  metrics: PipelineMetrics;
}

export interface PipelineFailedEvent extends BasePipelineEvent {
  error: string;
  failedStep: string;
  failedSteps: string[];
  canRetry: boolean;
  retryCount: number;
  duration?: number;
}

export interface PipelinePausedEvent extends BasePipelineEvent {
  currentState: PipelineState;
  currentStep: string;
  progress: number;
  reason?: string;
}

export interface PipelineResumedEvent extends BasePipelineEvent {
  previousState: PipelineState;
  currentState: PipelineState;
  pauseDuration: number;
}

export interface PipelineCancelledEvent extends BasePipelineEvent {
  currentState: PipelineState;
  progress: number;
  reason?: string;
  duration?: number;
}

export interface PipelineRetryEvent extends BasePipelineEvent {
  previousError: string;
  retryCount: number;
  fromStep: string;
}

/**
 * Pipeline step events
 */
export interface PipelineStepStartedEvent extends BasePipelineEvent {
  stepId: string;
  stepName: string;
  stepType: string;
  estimatedDuration?: number;
}

export interface PipelineStepCompletedEvent extends BasePipelineEvent {
  stepId: string;
  stepName: string;
  duration: number;
  result?: any;
}

export interface PipelineStepFailedEvent extends BasePipelineEvent {
  stepId: string;
  stepName: string;
  error: string;
  canRetry: boolean;
  retryCount: number;
}

/**
 * Pipeline entity processing events
 */
export interface PipelineInsightProcessingEvent extends BasePipelineEvent {
  insightId: string;
  status: 'started' | 'approved' | 'rejected' | 'failed';
  score?: number;
  reason?: string;
}

export interface PipelinePostProcessingEvent extends BasePipelineEvent {
  postId: string;
  insightId: string;
  platform: string;
  status: 'started' | 'generated' | 'approved' | 'rejected' | 'scheduled' | 'failed';
  reason?: string;
}

export interface PipelineBatchProcessingEvent extends BasePipelineEvent {
  batchId: string;
  entityType: 'insight' | 'post';
  entityIds: string[];
  status: 'started' | 'completed' | 'failed';
  successCount?: number;
  failureCount?: number;
}

/**
 * Manual intervention events
 */
export interface PipelineManualInterventionRequiredEvent extends BasePipelineEvent {
  interventionType: 'insight_review' | 'post_review' | 'error_resolution';
  entityType: 'insight' | 'post' | 'transcript';
  entityIds: string[];
  priority: 'high' | 'medium' | 'low';
  description: string;
  actionUrl?: string;
  dueBy?: Date;
  assignedTo?: string;
}

export interface PipelineManualInterventionCompletedEvent extends BasePipelineEvent {
  interventionType: 'insight_review' | 'post_review' | 'error_resolution';
  entityType: 'insight' | 'post' | 'transcript';
  entityIds: string[];
  action: 'approved' | 'rejected' | 'resolved' | 'skipped';
  completedBy: string;
  notes?: string;
  duration: number; // Time taken to complete intervention in ms
}

/**
 * Pipeline notification events
 */
export interface PipelineNotificationEvent extends BasePipelineEvent {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  actionRequired?: boolean;
  actionUrl?: string;
}

/**
 * Pipeline metrics events
 */
export interface PipelineMetricsUpdatedEvent extends BasePipelineEvent {
  metrics: PipelineMetrics;
  performanceScore?: number;
  recommendations?: string[];
}

/**
 * Event name constants
 */
export const PIPELINE_EVENTS = {
  // Lifecycle events
  STARTED: 'pipeline.started',
  PROGRESS: 'pipeline.progress',
  BLOCKED: 'pipeline.blocked',
  COMPLETED: 'pipeline.completed',
  PARTIALLY_COMPLETED: 'pipeline.partially_completed',
  FAILED: 'pipeline.failed',
  PAUSED: 'pipeline.paused',
  RESUMED: 'pipeline.resumed',
  CANCELLED: 'pipeline.cancelled',
  RETRY: 'pipeline.retry',
  
  // Step events
  STEP_STARTED: 'pipeline.step.started',
  STEP_COMPLETED: 'pipeline.step.completed',
  STEP_FAILED: 'pipeline.step.failed',
  
  // Entity processing events
  INSIGHT_PROCESSING: 'pipeline.insight.processing',
  POST_PROCESSING: 'pipeline.post.processing',
  BATCH_PROCESSING: 'pipeline.batch.processing',
  
  // Notification events
  NOTIFICATION: 'pipeline.notification',
  
  // Metrics events
  METRICS_UPDATED: 'pipeline.metrics.updated',
  
  // Human intervention events
  REVIEW_REQUIRED: 'pipeline.review.required',
  REVIEW_COMPLETED: 'pipeline.review.completed',
  
  // Manual intervention events
  MANUAL_INTERVENTION_REQUIRED: 'pipeline.manual_intervention.required',
  MANUAL_INTERVENTION_COMPLETED: 'pipeline.manual_intervention.completed',
  MANUAL_INTERVENTION_TIMEOUT: 'pipeline.manual_intervention.timeout',
  
  // Template events
  TEMPLATE_APPLIED: 'pipeline.template.applied',
  TEMPLATE_CHANGED: 'pipeline.template.changed'
} as const;

/**
 * Type guard functions for event types
 */
export function isPipelineStartedEvent(event: any): event is PipelineStartedEvent {
  return event && 'pipelineId' in event && 'options' in event && 'template' in event;
}

export function isPipelineCompletedEvent(event: any): event is PipelineCompletedEvent {
  return event && 'pipelineId' in event && 'duration' in event && 'metrics' in event;
}

export function isPipelineFailedEvent(event: any): event is PipelineFailedEvent {
  return event && 'pipelineId' in event && 'error' in event && 'failedStep' in event;
}

export function isPipelineBlockedEvent(event: any): event is PipelineBlockedEvent {
  return event && 'pipelineId' in event && 'blockingItems' in event;
}

/**
 * Event factory functions
 */
export function createPipelineStartedEvent(
  pipelineId: string,
  transcriptId: string,
  options: Record<string, any>,
  template: string
): PipelineStartedEvent {
  return {
    pipelineId,
    transcriptId,
    options,
    template,
    timestamp: new Date()
  };
}

export function createPipelineProgressEvent(
  pipelineId: string,
  transcriptId: string,
  currentState: PipelineState,
  progress: number,
  completedSteps: number,
  totalSteps: number
): PipelineProgressEvent {
  return {
    pipelineId,
    transcriptId,
    currentState,
    currentStep: currentState,
    progress,
    completedSteps,
    totalSteps,
    timestamp: new Date()
  };
}

export function createPipelineBlockedEvent(
  pipelineId: string,
  transcriptId: string,
  blockingItems: BlockingItem[],
  currentState: PipelineState
): PipelineBlockedEvent {
  return {
    pipelineId,
    transcriptId,
    blockingItems,
    currentState,
    message: `Pipeline blocked: ${blockingItems.length} items require attention`,
    timestamp: new Date()
  };
}

export function createPipelineFailedEvent(
  pipelineId: string,
  transcriptId: string,
  error: string,
  failedStep: string,
  canRetry: boolean,
  retryCount: number
): PipelineFailedEvent {
  return {
    pipelineId,
    transcriptId,
    error,
    failedStep,
    failedSteps: [failedStep],
    canRetry,
    retryCount,
    timestamp: new Date()
  };
}

export function createManualInterventionRequiredEvent(
  pipelineId: string,
  transcriptId: string,
  interventionType: 'insight_review' | 'post_review' | 'error_resolution',
  entityType: 'insight' | 'post' | 'transcript',
  entityIds: string[],
  description: string,
  priority: 'high' | 'medium' | 'low' = 'medium'
): PipelineManualInterventionRequiredEvent {
  return {
    pipelineId,
    transcriptId,
    interventionType,
    entityType,
    entityIds,
    priority,
    description,
    timestamp: new Date()
  };
}

export function createManualInterventionCompletedEvent(
  pipelineId: string,
  transcriptId: string,
  interventionType: 'insight_review' | 'post_review' | 'error_resolution',
  entityType: 'insight' | 'post' | 'transcript',
  entityIds: string[],
  action: 'approved' | 'rejected' | 'resolved' | 'skipped',
  completedBy: string,
  duration: number
): PipelineManualInterventionCompletedEvent {
  return {
    pipelineId,
    transcriptId,
    interventionType,
    entityType,
    entityIds,
    action,
    completedBy,
    duration,
    timestamp: new Date()
  };
}