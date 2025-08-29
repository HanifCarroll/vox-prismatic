/**
 * ProcessingJob State Machine
 * XState v5 implementation for comprehensive async job state management
 */

import { createMachine, assign } from 'xstate';
import { ProcessingJobStatus, JobError, ProcessingJobMetrics, JobMetadata, calculateBackoffDelay, JOB_TYPE_CONFIG } from '../types/processing-job.types';
import { JobType } from '@content-creation/types';
import { ProcessingJobRepository } from '../processing-job.repository';
import { ProcessingJobEntity } from '../processing-job.entity';
import { 
  XStateActionParams, 
  ExtractEventType,
  BaseStateMachineContext 
} from '../../common/types/xstate.types';

/**
 * Enhanced context data for the processing job state machine
 * Phase 1: Now includes repository for database persistence and updated entity storage
 */
export interface ProcessingJobStateMachineContext extends BaseStateMachineContext {
  jobId: string;
  jobType: JobType;
  sourceId: string;
  progress: number;
  retryCount: number;
  maxRetries: number;
  lastError: JobError | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  metrics: ProcessingJobMetrics;
  metadata: JobMetadata | null;
  estimatedTimeRemaining: number | null; // milliseconds
  progressHistory: Array<{ progress: number; timestamp: Date }>;
  // Phase 1: Repository injection support
  repository?: ProcessingJobRepository;
  updatedEntity?: ProcessingJobEntity;
}

/**
 * Events that can trigger state transitions
 */
export type ProcessingJobStateMachineEvent =
  | { type: 'START' }
  | { type: 'UPDATE_PROGRESS'; progress: number; message?: string; metadata?: Record<string, any> }
  | { type: 'COMPLETE'; result?: any; metrics?: Partial<ProcessingJobMetrics> }
  | { type: 'FAIL'; error: JobError }
  | { type: 'RETRY' }
  | { type: 'CANCEL'; reason?: string }
  | { type: 'MARK_STALE' }
  | { type: 'PERMANENTLY_FAIL' };

/**
 * Processing job state machine definition
 * Manages the complete lifecycle of async processing jobs
 */
export const processingJobStateMachine = createMachine(
  {
    id: 'processingJob',
    initial: ProcessingJobStatus.QUEUED,
    types: {
      context: {} as ProcessingJobStateMachineContext,
      events: {} as ProcessingJobStateMachineEvent,
    },
    context: ({ input }: { input?: Partial<ProcessingJobStateMachineContext> }) => ({
      jobId: input?.jobId || '',
      jobType: input?.jobType || 'clean_transcript' as JobType,
      sourceId: input?.sourceId || '',
      progress: input?.progress || 0,
      retryCount: input?.retryCount || 0,
      maxRetries: input?.maxRetries || 3,
      lastError: input?.lastError || null,
      startedAt: input?.startedAt || null,
      completedAt: input?.completedAt || null,
      cancelledAt: input?.cancelledAt || null,
      cancelReason: input?.cancelReason || null,
      metrics: input?.metrics || {
        processingDurationMs: 0,
        estimatedTokens: 0,
        estimatedCost: 0,
        progressUpdates: 0,
        retryAttempts: 0
      },
      metadata: input?.metadata || null,
      estimatedTimeRemaining: input?.estimatedTimeRemaining || null,
      progressHistory: input?.progressHistory || [],
    } as ProcessingJobStateMachineContext),
    states: {
      [ProcessingJobStatus.QUEUED]: {
        on: {
          START: {
            target: ProcessingJobStatus.PROCESSING,
            actions: ['recordStartTime', 'clearError']
          },
          CANCEL: {
            target: ProcessingJobStatus.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },

      [ProcessingJobStatus.PROCESSING]: {
        on: {
          UPDATE_PROGRESS: {
            target: ProcessingJobStatus.PROCESSING, // Stay in same state
            actions: ['updateProgress', 'calculateEstimatedTime'],
            guard: 'isValidProgress'
          },
          COMPLETE: {
            target: ProcessingJobStatus.COMPLETED,
            actions: ['recordCompletion', 'recordMetrics']
          },
          FAIL: {
            target: ProcessingJobStatus.FAILED,
            actions: 'recordFailure'
          },
          CANCEL: {
            target: ProcessingJobStatus.CANCELLED,
            actions: 'recordCancellation'
          },
          MARK_STALE: {
            target: ProcessingJobStatus.FAILED,
            actions: 'markAsStale'
          }
        },
        // Check for stale jobs after a certain period
        after: {
          STALE_CHECK_DELAY: {
            target: ProcessingJobStatus.FAILED,
            actions: 'markAsStale',
            guard: 'isStale'
          }
        }
      },

      [ProcessingJobStatus.FAILED]: {
        on: {
          RETRY: {
            target: ProcessingJobStatus.RETRYING,
            guard: 'canRetry',
            actions: 'prepareRetry'
          },
          PERMANENTLY_FAIL: {
            target: ProcessingJobStatus.PERMANENTLY_FAILED,
            actions: 'recordPermanentFailure'
          },
          CANCEL: {
            target: ProcessingJobStatus.CANCELLED,
            actions: 'recordCancellation'
          }
        },
        // Automatically determine if should retry or permanently fail
        always: [
          {
            target: ProcessingJobStatus.RETRYING,
            guard: 'canRetry',
            actions: 'prepareRetry'
          },
          {
            target: ProcessingJobStatus.PERMANENTLY_FAILED,
            actions: 'recordPermanentFailure'
          }
        ]
      },

      [ProcessingJobStatus.RETRYING]: {
        // Automatically transition to PROCESSING after backoff delay
        after: {
          BACKOFF_DELAY: {
            target: ProcessingJobStatus.PROCESSING,
            actions: ['incrementRetryCount', 'recordStartTime']
          }
        },
        on: {
          CANCEL: {
            target: ProcessingJobStatus.CANCELLED,
            actions: 'recordCancellation'
          }
        }
      },

      [ProcessingJobStatus.COMPLETED]: {
        type: 'final'
      },

      [ProcessingJobStatus.PERMANENTLY_FAILED]: {
        type: 'final'
      },

      [ProcessingJobStatus.CANCELLED]: {
        type: 'final'
      }
    }
  },
  {
    actions: {
      recordStartTime: assign({
        startedAt: () => new Date(),
        progress: 0,
        progressHistory: []
      }),

      updateProgress: assign({
        progress: ({ event }) => {
          const progressEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'UPDATE_PROGRESS' }>;
          return Math.min(100, Math.max(0, progressEvent.progress));
        },
        progressHistory: ({ context, event }) => {
          const progressEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'UPDATE_PROGRESS' }>;
          return [
            ...context.progressHistory,
            { progress: progressEvent.progress, timestamp: new Date() }
          ];
        },
        metrics: ({ context }) => ({
          ...context.metrics,
          progressUpdates: context.metrics.progressUpdates + 1
        })
      }),

      calculateEstimatedTime: assign({
        estimatedTimeRemaining: ({ context }) => {
          if (context.progress === 0 || !context.startedAt) {
            return null;
          }

          const elapsedMs = Date.now() - context.startedAt.getTime();
          const progressPercent = context.progress / 100;
          
          if (progressPercent === 0) {
            return null;
          }

          const estimatedTotalMs = elapsedMs / progressPercent;
          const remainingMs = estimatedTotalMs - elapsedMs;
          
          return Math.max(0, Math.round(remainingMs));
        }
      }),

      recordCompletion: assign({
        completedAt: () => new Date(),
        progress: 100,
        metrics: ({ context, event }) => {
          const completeEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'COMPLETE' }>;
          const duration = context.startedAt 
            ? Date.now() - context.startedAt.getTime() 
            : 0;

          return {
            ...context.metrics,
            ...completeEvent.metrics,
            processingDurationMs: duration
          };
        }
      }),

      recordMetrics: assign({
        metrics: ({ context, event }) => {
          const completeEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'COMPLETE' }>;
          return {
            ...context.metrics,
            ...completeEvent.metrics
          };
        }
      }),

      recordFailure: assign({
        lastError: ({ event }) => {
          const failEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'FAIL' }>;
          return failEvent.error;
        }
      }),

      prepareRetry: assign({
        lastError: ({ context }) => context.lastError,
        progress: 0,
        progressHistory: []
      }),

      incrementRetryCount: assign({
        retryCount: ({ context }) => context.retryCount + 1,
        metrics: ({ context }) => ({
          ...context.metrics,
          retryAttempts: context.retryCount + 1
        })
      }),

      recordPermanentFailure: assign({
        completedAt: () => new Date()
      }),

      recordCancellation: assign({
        cancelledAt: () => new Date(),
        cancelReason: ({ event }) => {
          const cancelEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'CANCEL' }>;
          return cancelEvent.reason || 'Cancelled by user or system';
        }
      }),

      clearError: assign({
        lastError: null
      }),

      markAsStale: assign({
        lastError: () => ({
          message: 'Job processing exceeded timeout threshold',
          code: 'STALE_JOB',
          timestamp: new Date(),
          isRetryable: true
        })
      }),

      // Phase 2: Database persistence actions with proper typing
      persistStart: async ({ context }: XStateActionParams<ProcessingJobStateMachineContext, ProcessingJobStateMachineEvent>) => {
        if (!context.repository) {
          console.warn('Repository not injected into processing job state machine');
          return;
        }

        try {
          // Update processing job with start time
          const updated = await context.repository.update(context.jobId, {
            startedAt: new Date().toISOString(),
            progress: 0,
            updatedAt: new Date()
          });

          // Update status directly via Prisma (bypassing DTO restrictions)
          const statusUpdated = await context.repository.prisma.processingJob.update({
            where: { id: context.jobId },
            data: { status: ProcessingJobStatus.PROCESSING }
          });

          context.updatedEntity = context.repository.mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist start:', error);
          throw error;
        }
      },

      persistProgress: async ({ context, event }: XStateActionParams<ProcessingJobStateMachineContext, ProcessingJobStateMachineEvent>) => {
        if (!context.repository) {
          console.warn('Repository not injected into processing job state machine');
          return;
        }

        try {
          const progressEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'UPDATE_PROGRESS' }>;
          
          // Update processing job with progress
          const updated = await context.repository.update(context.jobId, {
            progress: Math.min(100, Math.max(0, progressEvent.progress)),
            updatedAt: new Date()
          });

          // No status change for progress updates, just data update
          const freshEntity = await context.repository.findById(context.jobId);
          context.updatedEntity = freshEntity;
        } catch (error) {
          console.error('Failed to persist progress:', error);
          throw error;
        }
      },

      persistCompletion: async ({ context, event }: XStateActionParams<ProcessingJobStateMachineContext, ProcessingJobStateMachineEvent>) => {
        if (!context.repository) {
          console.warn('Repository not injected into processing job state machine');
          return;
        }

        try {
          const completeEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'COMPLETE' }>;
          const duration = context.startedAt 
            ? Date.now() - context.startedAt.getTime() 
            : 0;

          // Update processing job with completion data
          const updated = await context.repository.update(context.jobId, {
            completedAt: new Date().toISOString(),
            progress: 100,
            durationMs: duration,
            estimatedTokens: completeEvent.metrics?.estimatedTokens || 0,
            estimatedCost: completeEvent.metrics?.estimatedCost || 0,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await context.repository.prisma.processingJob.update({
            where: { id: context.jobId },
            data: { status: ProcessingJobStatus.COMPLETED }
          });

          context.updatedEntity = context.repository.mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist completion:', error);
          throw error;
        }
      },

      persistFailure: async ({ context, event }: XStateActionParams<ProcessingJobStateMachineContext, ProcessingJobStateMachineEvent>) => {
        if (!context.repository) {
          console.warn('Repository not injected into processing job state machine');
          return;
        }

        try {
          const failEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'FAIL' }>;
          
          // Update processing job with failure data
          const updated = await context.repository.update(context.jobId, {
            errorMessage: failEvent.error.message,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await context.repository.prisma.processingJob.update({
            where: { id: context.jobId },
            data: { status: ProcessingJobStatus.FAILED }
          });

          context.updatedEntity = context.repository.mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist failure:', error);
          throw error;
        }
      },

      persistRetry: async ({ context }: XStateActionParams<ProcessingJobStateMachineContext, ProcessingJobStateMachineEvent>) => {
        if (!context.repository) {
          console.warn('Repository not injected into processing job state machine');
          return;
        }

        try {
          // Update processing job with retry data
          const updated = await context.repository.update(context.jobId, {
            retryCount: context.retryCount + 1,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await context.repository.prisma.processingJob.update({
            where: { id: context.jobId },
            data: { status: ProcessingJobStatus.RETRYING }
          });

          context.updatedEntity = context.repository.mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist retry:', error);
          throw error;
        }
      },

      persistCancellation: async ({ context, event }: XStateActionParams<ProcessingJobStateMachineContext, ProcessingJobStateMachineEvent>) => {
        if (!context.repository) {
          console.warn('Repository not injected into processing job state machine');
          return;
        }

        try {
          const cancelEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'CANCEL' }>;
          
          // Update processing job with cancellation data
          const updated = await context.repository.update(context.jobId, {
            errorMessage: cancelEvent.reason || 'Job cancelled by user or system',
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await context.repository.prisma.processingJob.update({
            where: { id: context.jobId },
            data: { status: ProcessingJobStatus.CANCELLED }
          });

          context.updatedEntity = context.repository.mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist cancellation:', error);
          throw error;
        }
      },

      persistStaleMarking: async ({ context }: XStateActionParams<ProcessingJobStateMachineContext, ProcessingJobStateMachineEvent>) => {
        if (!context.repository) {
          console.warn('Repository not injected into processing job state machine');
          return;
        }

        try {
          // Update processing job with stale error
          const updated = await context.repository.update(context.jobId, {
            errorMessage: 'Job processing exceeded timeout threshold',
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await context.repository.prisma.processingJob.update({
            where: { id: context.jobId },
            data: { status: ProcessingJobStatus.FAILED }
          });

          context.updatedEntity = context.repository.mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist stale marking:', error);
          throw error;
        }
      }
    },

    guards: {
      canRetry: ({ context }) => {
        return (
          context.retryCount < context.maxRetries &&
          context.lastError?.isRetryable !== false
        );
      },

      isValidProgress: ({ event }) => {
        const progressEvent = event as Extract<ProcessingJobStateMachineEvent, { type: 'UPDATE_PROGRESS' }>;
        return progressEvent.progress >= 0 && progressEvent.progress <= 100;
      },

      isStale: ({ context }) => {
        if (!context.startedAt) {
          return false;
        }

        const config = JOB_TYPE_CONFIG[context.jobType];
        const processingTime = Date.now() - context.startedAt.getTime();
        return processingTime > config.staleThreshold;
      }
    },

    delays: {
      BACKOFF_DELAY: ({ context }) => {
        return calculateBackoffDelay(context.jobType, context.retryCount);
      },

      STALE_CHECK_DELAY: ({ context }) => {
        const config = JOB_TYPE_CONFIG[context.jobType];
        return config.staleThreshold;
      }
    }
  }
);

/**
 * Type-safe state values that correspond to ProcessingJobStatus enum
 */
export type ProcessingJobStateMachineState = ProcessingJobStatus;

/**
 * Helper function to get available transitions from current state
 */
export function getAvailableTransitions(currentState: ProcessingJobStatus): string[] {
  const stateConfig = processingJobStateMachine.config.states?.[currentState as any];
  if (!stateConfig || !stateConfig.on) {
    return [];
  }
  
  return Object.keys(stateConfig.on);
}

/**
 * Helper function to check if a transition is valid from current state
 */
export function canTransition(
  currentState: ProcessingJobStatus, 
  eventType: string,
  context?: Partial<ProcessingJobStateMachineContext>
): boolean {
  const state = processingJobStateMachine.resolveState({ 
    value: currentState,
    context: {
      jobId: '',
      jobType: 'clean_transcript' as JobType,
      sourceId: '',
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      lastError: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      metrics: {
        processingDurationMs: 0,
        estimatedTokens: 0,
        estimatedCost: 0,
        progressUpdates: 0,
        retryAttempts: 0
      },
      metadata: null,
      estimatedTimeRemaining: null,
      progressHistory: [],
      ...context
    }
  });
  
  return state.can({ type: eventType } as ProcessingJobStateMachineEvent);
}

/**
 * Get human-readable description of current state
 */
export function getStateDescription(state: ProcessingJobStatus, context?: ProcessingJobStateMachineContext): string {
  const baseDescriptions: Record<ProcessingJobStatus, string> = {
    [ProcessingJobStatus.QUEUED]: 'Job is waiting in queue',
    [ProcessingJobStatus.PROCESSING]: 'Job is currently being processed',
    [ProcessingJobStatus.COMPLETED]: 'Job completed successfully',
    [ProcessingJobStatus.FAILED]: 'Job failed during processing',
    [ProcessingJobStatus.RETRYING]: 'Job is preparing to retry',
    [ProcessingJobStatus.PERMANENTLY_FAILED]: 'Job failed after maximum retry attempts',
    [ProcessingJobStatus.CANCELLED]: 'Job was cancelled'
  };

  let description = baseDescriptions[state];

  if (context) {
    if (state === ProcessingJobStatus.PROCESSING && context.progress > 0) {
      description += ` (${context.progress}% complete)`;
    }
    if (state === ProcessingJobStatus.RETRYING) {
      description += ` (attempt ${context.retryCount + 1} of ${context.maxRetries})`;
    }
    if (state === ProcessingJobStatus.FAILED && context.lastError) {
      description += `: ${context.lastError.message}`;
    }
  }

  return description;
}