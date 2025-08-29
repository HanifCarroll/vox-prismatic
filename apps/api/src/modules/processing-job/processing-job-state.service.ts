/**
 * ProcessingJobStateService
 * Service responsible for managing processing job state transitions using XState
 * Provides centralized state management with validation, event emission, and retry logic
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createActor, ActorRefFrom } from 'xstate';
import { 
  processingJobStateMachine, 
  type ProcessingJobStateMachineContext,
  type ProcessingJobStateMachineEvent,
  canTransition,
  getAvailableTransitions,
  getStateDescription
} from './state/processing-job-state-machine';
import { ProcessingJobRepository } from './processing-job.repository';
import { ProcessingJobEntity } from './processing-job.entity';
import { 
  ProcessingJobStatus, 
  JobError, 
  ProcessingJobMetrics,
  ProgressUpdate,
  JobMetadata,
  JOB_TYPE_CONFIG,
  calculateBackoffDelay,
  isTerminalStatus,
  canUpdateProgress
} from './types/processing-job.types';
import { JobType } from '@content-creation/types';
import { PROCESSING_JOB_EVENTS } from './events/processing-job.events';

/**
 * Service for managing processing job state transitions
 */
@Injectable()
export class ProcessingJobStateService {
  private readonly logger = new Logger(ProcessingJobStateService.name);
  private activeActors = new Map<string, ActorRefFrom<typeof processingJobStateMachine>>(); // Track active state machine actors

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly processingJobRepository: ProcessingJobRepository
  ) {}

  /**
   * Start processing a queued job
   */
  async startProcessing(jobId: string): Promise<ProcessingJobEntity> {
    this.logger.log(`Starting processing for job ${jobId}`);
    
    const job = await this.processingJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job ${jobId} not found`);
    }

    if (job.status !== ProcessingJobStatus.QUEUED) {
      throw new BadRequestException(
        `Job ${jobId} must be in QUEUED state to start processing (current: ${job.status})`
      );
    }

    return this.executeTransition(jobId, { type: 'START' });
  }

  /**
   * Update job progress without changing state
   * Uses state machine persistence actions for consistent database updates
   */
  async updateProgress(
    jobId: string, 
    progress: number, 
    message?: string,
    metadata?: Record<string, any>
  ): Promise<ProcessingJobEntity> {
    this.logger.debug(`Updating progress for job ${jobId}: ${progress}%`);
    
    const job = await this.processingJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job ${jobId} not found`);
    }

    if (!canUpdateProgress(job.status)) {
      this.logger.warn(`Cannot update progress for job ${jobId} in ${job.status} state`);
      return job;
    }

    // Validate progress value
    if (progress < 0 || progress > 100) {
      throw new BadRequestException(`Invalid progress value: ${progress}. Must be between 0 and 100.`);
    }

    // Create actor with repository injection for consistent persistence
    const actor = createActor(processingJobStateMachine, {
      input: this.createMachineContext(job)
    });

    try {
      // Start machine and send progress event
      actor.start();
      actor.send({ 
        type: 'UPDATE_PROGRESS', 
        progress, 
        message, 
        metadata 
      });

      const snapshot = actor.getSnapshot();
      const context = snapshot.context;

      // State machine persistence actions handle database updates
      // Return updated entity from context if available, otherwise fetch fresh
      const updatedJob = context.updatedEntity || await this.processingJobRepository.findById(jobId);
      
      if (!updatedJob) {
        throw new Error(`Failed to retrieve updated processing job ${jobId} after progress update`);
      }

      // Emit progress event
      this.eventEmitter.emit(PROCESSING_JOB_EVENTS.PROGRESS, {
        jobId,
        jobType: job.jobType,
        sourceId: job.sourceId,
        progress,
        message,
        metadata,
        estimatedTimeRemaining: context.estimatedTimeRemaining,
        timestamp: new Date()
      });

      return updatedJob;

    } catch (error) {
      this.logger.error(`Progress update failed for processing job ${jobId}:`, error);
      throw error;
    } finally {
      actor.stop();
    }
  }

  /**
   * Complete a job successfully
   */
  async completeJob(
    jobId: string, 
    result?: any, 
    metrics?: Partial<ProcessingJobMetrics>
  ): Promise<ProcessingJobEntity> {
    this.logger.log(`Completing job ${jobId}`);
    
    return this.executeTransition(jobId, { 
      type: 'COMPLETE', 
      result, 
      metrics 
    });
  }

  /**
   * Mark a job as failed
   */
  async failJob(
    jobId: string, 
    error: string | Error | JobError,
    isRetryable: boolean = true
  ): Promise<ProcessingJobEntity> {
    this.logger.error(`Failing job ${jobId}:`, error);
    
    // Convert error to JobError format
    const jobError: JobError = this.normalizeError(error, isRetryable);
    
    return this.executeTransition(jobId, { 
      type: 'FAIL', 
      error: jobError 
    });
  }

  /**
   * Retry a failed job with exponential backoff
   */
  async retryJob(jobId: string): Promise<ProcessingJobEntity> {
    this.logger.log(`Retrying job ${jobId}`);
    
    const job = await this.processingJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job ${jobId} not found`);
    }

    if (job.status !== ProcessingJobStatus.FAILED) {
      throw new BadRequestException(
        `Job ${jobId} must be in FAILED state to retry (current: ${job.status})`
      );
    }

    // Check if can retry
    const config = JOB_TYPE_CONFIG[job.jobType as JobType];
    const maxRetries = job.maxRetries || config.maxRetries;
    
    if (job.retryCount >= maxRetries) {
      throw new BadRequestException(
        `Job ${jobId} has exceeded maximum retry attempts (${maxRetries})`
      );
    }

    return this.executeTransition(jobId, { type: 'RETRY' });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, reason?: string): Promise<ProcessingJobEntity> {
    this.logger.log(`Cancelling job ${jobId}: ${reason || 'No reason provided'}`);
    
    const job = await this.processingJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job ${jobId} not found`);
    }

    if (isTerminalStatus(job.status)) {
      throw new BadRequestException(
        `Job ${jobId} is already in terminal state ${job.status}`
      );
    }

    return this.executeTransition(jobId, { 
      type: 'CANCEL', 
      reason 
    });
  }

  /**
   * Get backoff delay for a job based on retry count
   */
  getBackoffDelay(jobType: JobType, retryCount: number): number {
    return calculateBackoffDelay(jobType, retryCount);
  }

  /**
   * Check and handle stale jobs
   */
  async checkStaleJobs(): Promise<ProcessingJobEntity[]> {
    this.logger.log('Checking for stale processing jobs');
    
    const processingJobs = await this.processingJobRepository.findByStatus(
      ProcessingJobStatus.PROCESSING
    );
    
    const staleJobs: ProcessingJobEntity[] = [];
    
    for (const job of processingJobs) {
      if (!job.startedAt) continue;
      
      const config = JOB_TYPE_CONFIG[job.jobType as JobType];
      const processingTime = Date.now() - new Date(job.startedAt).getTime();
      
      if (processingTime > config.staleThreshold) {
        this.logger.warn(`Job ${job.id} is stale (processing for ${processingTime}ms)`);
        
        try {
          const updatedJob = await this.executeTransition(job.id, { type: 'MARK_STALE' });
          staleJobs.push(updatedJob);
        } catch (error) {
          this.logger.error(`Failed to mark job ${job.id} as stale:`, error);
        }
      }
    }
    
    if (staleJobs.length > 0) {
      this.logger.log(`Marked ${staleJobs.length} jobs as stale`);
    }
    
    return staleJobs;
  }

  /**
   * Phase 3: Simplified state transition execution with repository injection
   * Replaces the old transition() method with XState-owned persistence
   * Public method for external access to state transitions
   */
  async executeTransition(
    jobId: string,
    event: ProcessingJobStateMachineEvent
  ): Promise<ProcessingJobEntity> {
    this.logger.debug(`Executing transition for processing job ${jobId}: ${event.type}`);

    // Get current job
    const currentJob = await this.processingJobRepository.findById(jobId);
    if (!currentJob) {
      throw new NotFoundException(`Processing job ${jobId} not found`);
    }

    // Validate transition
    if (!canTransition(currentJob.status, event.type, this.createMachineContext(currentJob))) {
      const availableTransitions = getAvailableTransitions(currentJob.status);
      throw new BadRequestException(
        `Invalid transition: Cannot ${event.type} from ${currentJob.status}. ` +
        `Available transitions: ${availableTransitions.join(', ')}`
      );
    }

    // Create actor with repository injection
    const actor = createActor(processingJobStateMachine, {
      input: this.createMachineContext(currentJob)
    });

    try {
      // Start machine and execute transition
      actor.start();
      actor.send(event);
      
      const snapshot = actor.getSnapshot();
      const context = snapshot.context;
      const newState = snapshot.value as ProcessingJobStatus;

      // State machine persistence actions handle database updates
      // Return updated entity from context if available, otherwise fetch fresh
      const updatedJob = context.updatedEntity || await this.processingJobRepository.findById(jobId);
      
      if (!updatedJob) {
        throw new Error(`Failed to retrieve updated processing job ${jobId} after transition`);
      }

      // Emit state change event
      this.emitStateChangeEvent(
        updatedJob,
        currentJob.status,
        newState,
        event.type,
        context
      );

      // Handle actor lifecycle for long-running jobs
      if (isTerminalStatus(newState)) {
        this.activeActors.delete(jobId);
      } else {
        this.activeActors.set(jobId, actor);
      }

      // Schedule retry if in RETRYING state
      if (newState === ProcessingJobStatus.RETRYING) {
        const delay = calculateBackoffDelay(currentJob.jobType as JobType, context.retryCount);
        this.scheduleRetry(jobId, delay);
      }

      this.logger.log(`Processing job ${jobId} successfully transitioned from ${currentJob.status} to ${newState}`);
      return updatedJob;

    } catch (error) {
      this.logger.error(`State transition failed for processing job ${jobId}:`, error);
      throw error;
    } finally {
      actor.stop();
    }
  }


  /**
   * Create a state machine actor for a job
   */
  private createActor(job: ProcessingJobEntity): ActorRefFrom<typeof processingJobStateMachine> {
    return createActor(processingJobStateMachine, {
      input: this.createMachineContext(job)
    });
  }

  /**
   * Create machine context from job entity
   * Phase 1: Now includes repository injection for state machine persistence
   */
  private createMachineContext(job: ProcessingJobEntity): ProcessingJobStateMachineContext {
    const config = JOB_TYPE_CONFIG[job.jobType as JobType];
    
    return {
      jobId: job.id,
      jobType: job.jobType as JobType,
      sourceId: job.sourceId,
      progress: job.progress,
      retryCount: job.retryCount || 0,
      maxRetries: job.maxRetries || config.maxRetries,
      lastError: job.lastError || null,
      startedAt: job.startedAt ? new Date(job.startedAt) : null,
      completedAt: job.completedAt ? new Date(job.completedAt) : null,
      cancelledAt: null,
      cancelReason: null,
      metrics: {
        processingDurationMs: job.durationMs || 0,
        estimatedTokens: job.estimatedTokens || 0,
        estimatedCost: job.estimatedCost || 0,
        progressUpdates: 0,
        retryAttempts: job.retryCount || 0
      },
      metadata: job.metadata || null,
      estimatedTimeRemaining: null,
      progressHistory: [],
      repository: this.processingJobRepository, // Phase 1: Repository injection
    };
  }

  /**
   * Emit state change events
   */
  private emitStateChangeEvent(
    job: ProcessingJobEntity,
    previousState: ProcessingJobStatus,
    newState: ProcessingJobStatus,
    eventType: string,
    context: ProcessingJobStateMachineContext
  ): void {
    // Emit general state change event
    this.eventEmitter.emit(PROCESSING_JOB_EVENTS.STATE_CHANGED, {
      jobId: job.id,
      jobType: job.jobType,
      sourceId: job.sourceId,
      previousState,
      newState,
      event: eventType,
      context,
      timestamp: new Date()
    });

    // Emit specific events based on new state
    switch (newState) {
      case ProcessingJobStatus.PROCESSING:
        if (previousState === ProcessingJobStatus.QUEUED) {
          this.eventEmitter.emit(PROCESSING_JOB_EVENTS.STARTED, {
            jobId: job.id,
            jobType: job.jobType,
            sourceId: job.sourceId,
            timestamp: new Date()
          });
        }
        break;
      
      case ProcessingJobStatus.COMPLETED:
        this.eventEmitter.emit(PROCESSING_JOB_EVENTS.COMPLETED, {
          jobId: job.id,
          jobType: job.jobType,
          sourceId: job.sourceId,
          result: job.resultCount,
          metrics: context.metrics,
          timestamp: new Date()
        });
        break;
      
      case ProcessingJobStatus.FAILED:
        this.eventEmitter.emit(PROCESSING_JOB_EVENTS.FAILED, {
          jobId: job.id,
          jobType: job.jobType,
          sourceId: job.sourceId,
          error: context.lastError,
          canRetry: context.retryCount < context.maxRetries,
          timestamp: new Date()
        });
        break;
      
      case ProcessingJobStatus.RETRYING:
        const backoffDelay = calculateBackoffDelay(job.jobType as JobType, context.retryCount);
        this.eventEmitter.emit(PROCESSING_JOB_EVENTS.RETRYING, {
          jobId: job.id,
          jobType: job.jobType,
          sourceId: job.sourceId,
          attempt: context.retryCount + 1,
          maxAttempts: context.maxRetries,
          backoffDelay,
          timestamp: new Date()
        });
        break;
      
      case ProcessingJobStatus.CANCELLED:
        this.eventEmitter.emit(PROCESSING_JOB_EVENTS.CANCELLED, {
          jobId: job.id,
          jobType: job.jobType,
          sourceId: job.sourceId,
          reason: context.cancelReason,
          timestamp: new Date()
        });
        break;
      
      case ProcessingJobStatus.PERMANENTLY_FAILED:
        this.eventEmitter.emit(PROCESSING_JOB_EVENTS.PERMANENTLY_FAILED, {
          jobId: job.id,
          jobType: job.jobType,
          sourceId: job.sourceId,
          lastError: context.lastError,
          attempts: context.retryCount,
          timestamp: new Date()
        });
        break;
    }
  }

  /**
   * Schedule automatic retry after backoff delay
   */
  private scheduleRetry(jobId: string, delay: number): void {
    this.logger.log(`Scheduling retry for job ${jobId} after ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.startProcessing(jobId);
        this.logger.log(`Automatically retried job ${jobId} after backoff`);
      } catch (error) {
        this.logger.error(`Failed to automatically retry job ${jobId}:`, error);
      }
    }, delay);
  }

  /**
   * Normalize error to JobError format
   */
  private normalizeError(error: string | Error | JobError, isRetryable: boolean): JobError {
    if (typeof error === 'string') {
      return {
        message: error,
        timestamp: new Date(),
        isRetryable
      };
    }
    
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
        isRetryable
      };
    }
    
    return {
      ...error,
      timestamp: error.timestamp || new Date(),
      isRetryable: error.isRetryable !== undefined ? error.isRetryable : isRetryable
    };
  }

  /**
   * Get current state and context for a job
   */
  async getJobState(jobId: string): Promise<{
    state: ProcessingJobStatus;
    context: ProcessingJobStateMachineContext;
    description: string;
    availableActions: string[];
  }> {
    const job = await this.processingJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job ${jobId} not found`);
    }

    const context = this.createMachineContext(job);
    const availableActions = getAvailableTransitions(job.status);
    const description = getStateDescription(job.status, context);

    return {
      state: job.status,
      context,
      description,
      availableActions
    };
  }

  /**
   * Cleanup inactive actors (for memory management)
   */
  cleanupInactiveActors(): void {
    const activeCount = this.activeActors.size;
    
    if (activeCount > 100) {
      this.logger.warn(`High number of active actors: ${activeCount}. Cleaning up...`);
      
      // Stop and remove all actors for terminal states
      for (const [jobId, actor] of this.activeActors.entries()) {
        const snapshot = actor.getSnapshot();
        if (isTerminalStatus(snapshot.value as ProcessingJobStatus)) {
          actor.stop();
          this.activeActors.delete(jobId);
        }
      }
      
      this.logger.log(`Cleaned up actors. Remaining: ${this.activeActors.size}`);
    }
  }
}