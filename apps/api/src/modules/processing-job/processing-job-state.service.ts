/**
 * ProcessingJobStateService
 * Service responsible for managing processing job state transitions using XState
 * Provides centralized state management with validation, event emission, and retry logic
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createActor } from 'xstate';
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
  private activeActors = new Map<string, any>(); // Track active state machine actors

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

    return this.transition(jobId, { type: 'START' });
  }

  /**
   * Update job progress without changing state
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

    // Use existing actor if available, or create temporary one
    const actor = this.activeActors.get(jobId) || this.createActor(job);
    
    // Send progress update event
    actor.send({ 
      type: 'UPDATE_PROGRESS', 
      progress, 
      message, 
      metadata 
    });

    const snapshot = actor.getSnapshot();
    const newContext = snapshot.context;

    // Update database with new progress
    const updatedJob = await this.processingJobRepository.update(jobId, {
      progress,
      updatedAt: new Date()
    });

    // Emit progress event
    this.eventEmitter.emit(PROCESSING_JOB_EVENTS.PROGRESS, {
      jobId,
      jobType: job.jobType,
      sourceId: job.sourceId,
      progress,
      message,
      metadata,
      estimatedTimeRemaining: newContext.estimatedTimeRemaining,
      timestamp: new Date()
    });

    // Clean up temporary actor if not tracked
    if (!this.activeActors.has(jobId)) {
      actor.stop();
    }

    return updatedJob;
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
    
    return this.transition(jobId, { 
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
    
    return this.transition(jobId, { 
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

    return this.transition(jobId, { type: 'RETRY' });
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

    return this.transition(jobId, { 
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
          const updatedJob = await this.transition(job.id, { type: 'MARK_STALE' });
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
   * Execute a state transition for a job
   */
  private async transition(
    jobId: string, 
    event: ProcessingJobStateMachineEvent
  ): Promise<ProcessingJobEntity> {
    this.logger.debug(`Attempting transition for job ${jobId}: ${event.type}`);

    // Get current job from database
    const job = await this.processingJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job ${jobId} not found`);
    }

    // Check if transition is valid
    if (!canTransition(job.status, event.type, this.createMachineContext(job))) {
      const availableTransitions = getAvailableTransitions(job.status);
      throw new BadRequestException(
        `Invalid transition: Cannot ${event.type} from ${job.status}. ` +
        `Available transitions: ${availableTransitions.join(', ')}`
      );
    }

    // Get or create actor
    let actor = this.activeActors.get(jobId);
    const isNewActor = !actor;
    
    if (!actor) {
      actor = this.createActor(job);
      actor.start();
    }

    const previousState = job.status;

    // Send event to get new state
    actor.send(event);
    const snapshot = actor.getSnapshot();
    
    const newState = snapshot.value as ProcessingJobStatus;
    const newContext = snapshot.context;

    this.logger.log(`Job ${jobId} transitioning from ${previousState} to ${newState}`);

    // Prepare update data
    const updateData: any = {
      status: newState,
      updatedAt: new Date()
    };

    // Add specific fields based on transition
    if (event.type === 'START') {
      updateData.startedAt = newContext.startedAt?.toISOString();
    } else if (event.type === 'COMPLETE') {
      updateData.completedAt = newContext.completedAt?.toISOString();
      updateData.progress = 100;
      updateData.durationMs = newContext.metrics.processingDurationMs;
      updateData.estimatedTokens = newContext.metrics.estimatedTokens;
      updateData.estimatedCost = newContext.metrics.estimatedCost;
    } else if (event.type === 'FAIL' || event.type === 'MARK_STALE') {
      updateData.errorMessage = newContext.lastError?.message;
      // Store lastError as JSON in metadata if we have that field
    } else if (event.type === 'RETRY') {
      updateData.retryCount = newContext.retryCount;
    }

    // Update database with new state
    const updatedJob = await this.processingJobRepository.update(jobId, updateData);

    // Emit appropriate event based on transition
    this.emitStateChangeEvent(
      updatedJob, 
      previousState, 
      newState, 
      event.type, 
      newContext
    );

    // Handle actor lifecycle
    if (isTerminalStatus(newState)) {
      // Clean up actor for terminal states
      actor.stop();
      this.activeActors.delete(jobId);
    } else if (isNewActor) {
      // Keep actor for non-terminal states if it's new
      this.activeActors.set(jobId, actor);
    }

    // Schedule retry if in RETRYING state
    if (newState === ProcessingJobStatus.RETRYING) {
      const delay = calculateBackoffDelay(job.jobType as JobType, newContext.retryCount);
      this.scheduleRetry(jobId, delay);
    }

    this.logger.log(`Job ${jobId} successfully transitioned to ${newState}`);
    return updatedJob;
  }

  /**
   * Create a state machine actor for a job
   */
  private createActor(job: ProcessingJobEntity): any {
    return createActor(processingJobStateMachine, {
      input: this.createMachineContext(job)
    });
  }

  /**
   * Create machine context from job entity
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
      progressHistory: []
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