/**
 * ProcessingJobSchedulerService
 * Scheduled tasks for ProcessingJob maintenance and monitoring
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProcessingJobStateService } from './processing-job-state.service';
import { ProcessingJobRepository } from './processing-job.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PROCESSING_JOB_EVENTS } from './events/processing-job.events';
import { ProcessingJobStatus } from './types/processing-job.types';

/**
 * Service for scheduled ProcessingJob maintenance tasks
 */
@Injectable()
export class ProcessingJobSchedulerService {
  private readonly logger = new Logger(ProcessingJobSchedulerService.name);

  constructor(
    private readonly processingJobStateService: ProcessingJobStateService,
    private readonly processingJobRepository: ProcessingJobRepository,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Check for stale jobs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkStaleJobs(): Promise<void> {
    this.logger.debug('Running stale job check');
    
    try {
      const staleJobs = await this.processingJobStateService.checkStaleJobs();
      
      if (staleJobs.length > 0) {
        this.logger.warn(`Found ${staleJobs.length} stale jobs`);
        
        // Emit event for monitoring
        this.eventEmitter.emit(PROCESSING_JOB_EVENTS.STALE_DETECTED, {
          jobIds: staleJobs.map(j => j.id),
          count: staleJobs.length,
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error checking stale jobs:', error);
    }
  }

  /**
   * Clean up inactive state machine actors every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupInactiveActors(): Promise<void> {
    this.logger.debug('Cleaning up inactive state machine actors');
    
    try {
      this.processingJobStateService.cleanupInactiveActors();
    } catch (error) {
      this.logger.error('Error cleaning up actors:', error);
    }
  }

  /**
   * Clean up old completed jobs daily at 2 AM
   */
  @Cron('0 2 * * *')
  async cleanupOldJobs(): Promise<void> {
    this.logger.log('Running daily cleanup of old completed jobs');
    
    try {
      const deletedCount = await this.processingJobRepository.cleanupOldJobs(30);
      
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old completed jobs`);
        
        // Emit event for monitoring
        this.eventEmitter.emit(PROCESSING_JOB_EVENTS.STALE_CLEANED, {
          jobIds: [],
          count: deletedCount,
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error cleaning up old jobs:', error);
    }
  }

  /**
   * Check for retryable failed jobs every 10 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkRetryableJobs(): Promise<void> {
    this.logger.debug('Checking for retryable failed jobs');
    
    try {
      const retryableJobs = await this.processingJobRepository.findRetryableJobs();
      
      if (retryableJobs.length > 0) {
        this.logger.log(`Found ${retryableJobs.length} retryable failed jobs`);
        
        // Auto-retry jobs that have been failed for more than their backoff period
        for (const job of retryableJobs) {
          if (!job.updatedAt) continue;
          
          const timeSinceFailed = Date.now() - job.updatedAt.getTime();
          const backoffDelay = this.processingJobStateService.getBackoffDelay(
            job.jobType,
            job.retryCount
          );
          
          if (timeSinceFailed > backoffDelay) {
            try {
              await this.processingJobStateService.retryJob(job.id);
              this.logger.log(`Auto-retried job ${job.id} after backoff period`);
            } catch (error) {
              this.logger.error(`Failed to auto-retry job ${job.id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking retryable jobs:', error);
    }
  }

  /**
   * Log job statistics every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async logJobStatistics(): Promise<void> {
    this.logger.debug('Logging job statistics');
    
    try {
      const stats = await this.processingJobRepository.getOverallStats();
      
      this.logger.log('=== Processing Job Statistics ===');
      this.logger.log(`Total jobs: ${stats.totals.all}`);
      this.logger.log(`Completed: ${stats.totals.completed}`);
      this.logger.log(`Failed: ${stats.totals.failed}`);
      this.logger.log(`Processing: ${stats.totals.processing}`);
      this.logger.log(`Queued: ${stats.totals.queued}`);
      
      for (const [jobType, typeStats] of Object.entries(stats.byJobType)) {
        this.logger.log(`--- ${jobType} ---`);
        this.logger.log(`  Total: ${typeStats.total}`);
        this.logger.log(`  Completed: ${typeStats.completed}`);
        this.logger.log(`  Failed: ${typeStats.failed}`);
        this.logger.log(`  Processing: ${typeStats.processing}`);
      }
      
      // Emit metrics event
      this.eventEmitter.emit(PROCESSING_JOB_EVENTS.METRICS_UPDATED, {
        stats,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error logging job statistics:', error);
    }
  }

  /**
   * Monitor job processing health every 2 minutes
   */
  @Cron('*/2 * * * *')
  async monitorJobHealth(): Promise<void> {
    this.logger.debug('Monitoring job processing health');
    
    try {
      // Check for jobs stuck in QUEUED state for too long
      const queuedJobs = await this.processingJobRepository.findByStatus(ProcessingJobStatus.QUEUED);
      const stuckQueuedJobs = queuedJobs.filter(job => {
        const ageMs = Date.now() - job.createdAt.getTime();
        return ageMs > 600000; // 10 minutes
      });
      
      if (stuckQueuedJobs.length > 0) {
        this.logger.warn(`Found ${stuckQueuedJobs.length} jobs stuck in QUEUED state`);
        
        // Try to start processing for stuck jobs
        for (const job of stuckQueuedJobs) {
          try {
            await this.processingJobStateService.startProcessing(job.id);
            this.logger.log(`Started processing for stuck queued job ${job.id}`);
          } catch (error) {
            this.logger.error(`Failed to start stuck queued job ${job.id}:`, error);
          }
        }
      }
      
      // Check for jobs in RETRYING state that should have transitioned
      const retryingJobs = await this.processingJobRepository.findByStatus('retrying' as any);
      for (const job of retryingJobs) {
        if (!job.updatedAt) continue;
        
        const timeSinceRetrying = Date.now() - job.updatedAt.getTime();
        const expectedDelay = this.processingJobStateService.getBackoffDelay(
          job.jobType,
          job.retryCount
        );
        
        // If it's been more than 2x the expected delay, force transition
        if (timeSinceRetrying > expectedDelay * 2) {
          this.logger.warn(`Job ${job.id} stuck in RETRYING state, forcing transition`);
          try {
            await this.processingJobStateService.startProcessing(job.id);
          } catch (error) {
            this.logger.error(`Failed to force transition for job ${job.id}:`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error monitoring job health:', error);
    }
  }
}