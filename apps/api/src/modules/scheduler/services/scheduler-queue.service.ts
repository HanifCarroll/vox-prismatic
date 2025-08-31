import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { QueueManager, PublishJobData } from '@content-creation/queue';
import { 
  SocialPlatform, 
  ScheduledPostStatus, 
  platformToSocialPlatform, 
  isSocialPlatform 
} from '@content-creation/types';
import { ScheduledPostStateService } from './scheduled-post-state.service';
import { ScheduledPostRepository } from '../scheduled-post.repository';
import { 
  SCHEDULER_EVENTS, 
  type PostScheduleRequestedEvent,
  type PostUnscheduleRequestedEvent 
} from '../events/scheduler.events';

/**
 * Service that bridges the scheduler event system with the BullMQ queue system.
 * Handles the complete lifecycle of scheduling posts for publishing.
 */
@Injectable()
export class SchedulerQueueService {
  private readonly logger = new Logger(SchedulerQueueService.name);
  private queueManager: QueueManager | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly scheduledPostStateService: ScheduledPostStateService,
    private readonly scheduledPostRepository: ScheduledPostRepository,
  ) {
    this.initializeQueueManager();
  }

  /**
   * Initialize the queue manager with Redis configuration
   */
  private async initializeQueueManager(): Promise<void> {
    try {
      this.queueManager = new QueueManager({
        redis: {
          host: this.configService.get<string>('REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('REDIS_PORT', 6379),
          password: this.configService.get<string>('REDIS_PASSWORD'),
          db: this.configService.get<number>('REDIS_DB', 0),
        },
      });

      await this.queueManager.connect();
      this.logger.log('Queue manager initialized and connected to Redis');
    } catch (error) {
      this.logger.error('Failed to initialize queue manager:', error);
      throw error;
    }
  }

  /**
   * Event listener for post schedule requests
   * Handles adding jobs to the BullMQ queue and managing state transitions
   */
  @OnEvent(SCHEDULER_EVENTS.SCHEDULE_REQUESTED)
  async handleScheduleRequested(event: PostScheduleRequestedEvent): Promise<void> {
    const { scheduledPostId, platform, scheduledTime, jobData } = event;
    
    this.logger.log(
      `Processing schedule request for post ${scheduledPostId} ` +
      `on platform ${platform} at ${scheduledTime.toISOString()}`
    );

    try {
      // Validate queue manager is ready
      if (!this.queueManager) {
        throw new Error('Queue manager not initialized');
      }

      // Validate platform
      if (!isSocialPlatform(platform)) {
        throw new Error(`Invalid platform: ${platform}`);
      }

      // Validate scheduled post exists and is in correct state
      const scheduledPost = await this.scheduledPostRepository.findById(scheduledPostId);
      if (!scheduledPost) {
        throw new Error(`Scheduled post not found: ${scheduledPostId}`);
      }

      if (scheduledPost.status !== ScheduledPostStatus.PENDING) {
        this.logger.warn(
          `Scheduled post ${scheduledPostId} is not in PENDING state (current: ${scheduledPost.status}). ` +
          'Skipping queue addition.'
        );
        return;
      }

      // Prepare job data with proper types
      const publishJobData: PublishJobData = {
        scheduledPostId: jobData.scheduledPostId,
        postId: jobData.postId,
        platform: platform as SocialPlatform,
        content: jobData.content,
        credentials: {
          accessToken: jobData.credentials.accessToken,
          clientId: jobData.credentials.clientId,
          clientSecret: jobData.credentials.clientSecret,
        },
        metadata: {
          ...jobData.metadata,
          retryCount: 0,
          originalScheduledTime: scheduledTime,
        },
      };

      // Determine if this is an immediate or delayed job
      const now = new Date();
      const delay = scheduledTime.getTime() - now.getTime();
      const isImmediate = delay <= 0;

      if (isImmediate) {
        this.logger.log(`Scheduling immediate job for scheduled post ${scheduledPostId}`);
        
        // For immediate jobs, queue the post first to transition to QUEUED state
        await this.scheduledPostStateService.queueForPublishing(scheduledPostId);
        
        // Then add to queue without delay
        const job = await this.queueManager.publisherQueue.addPublishJob(publishJobData, {
          jobId: scheduledPostId,
          priority: 1, // Higher priority for immediate jobs
        });

        this.logger.log(
          `Added immediate job ${job.id} to queue for scheduled post ${scheduledPostId}`
        );
      } else {
        this.logger.log(
          `Scheduling delayed job for scheduled post ${scheduledPostId} ` +
          `with delay of ${Math.round(delay / 1000)} seconds`
        );

        // For delayed jobs, add to queue with delay
        // The job will automatically transition to QUEUED when picked up by worker
        const job = await this.queueManager.publisherQueue.schedulePost(
          publishJobData, 
          scheduledTime
        );

        // Update the scheduled post with the queue job ID
        await this.scheduledPostRepository.updateQueueJobId(scheduledPostId, job.id || scheduledPostId);

        this.logger.log(
          `Added delayed job ${job.id} to queue for scheduled post ${scheduledPostId} ` +
          `(will execute at ${scheduledTime.toISOString()})`
        );
      }

      // Emit success event
      this.logger.log(`Successfully processed schedule request for ${scheduledPostId}`);

    } catch (error) {
      this.logger.error(
        `Failed to process schedule request for ${scheduledPostId}:`, 
        error instanceof Error ? error.message : String(error)
      );

      // Try to mark the scheduled post as failed if it exists
      try {
        const exists = await this.scheduledPostRepository.findById(scheduledPostId);
        if (exists) {
          await this.scheduledPostStateService.markFailed(
            scheduledPostId, 
            `Queue scheduling failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } catch (updateError) {
        this.logger.error(
          `Failed to mark scheduled post ${scheduledPostId} as failed:`, 
          updateError
        );
      }

      // Re-throw to ensure the error is visible
      throw error;
    }
  }

  /**
   * Event listener for post unschedule requests
   * Handles removing jobs from the BullMQ queue
   */
  @OnEvent(SCHEDULER_EVENTS.UNSCHEDULE_REQUESTED)
  async handleUnscheduleRequested(event: PostUnscheduleRequestedEvent): Promise<void> {
    const { scheduledPostId, queueJobId, reason } = event;
    
    this.logger.log(
      `Processing unschedule request for scheduled post ${scheduledPostId} ` +
      `(job: ${queueJobId})${reason ? ` - Reason: ${reason}` : ''}`
    );

    try {
      // Validate queue manager is ready
      if (!this.queueManager) {
        throw new Error('Queue manager not initialized');
      }

      // Cancel the job in the queue
      const cancelled = await this.queueManager.publisherQueue.cancelJob(queueJobId);
      
      if (cancelled) {
        this.logger.log(`Successfully cancelled queue job ${queueJobId}`);
      } else {
        this.logger.warn(`Queue job ${queueJobId} was not found or already processed`);
      }

      // Cancel the scheduled post using state machine
      await this.scheduledPostStateService.cancel(scheduledPostId, reason || 'Unscheduled by user');

      this.logger.log(`Successfully processed unschedule request for ${scheduledPostId}`);

    } catch (error) {
      this.logger.error(
        `Failed to process unschedule request for ${scheduledPostId}:`, 
        error instanceof Error ? error.message : String(error)
      );

      // Try to mark as failed if cancellation didn't work
      try {
        await this.scheduledPostStateService.markFailed(
          scheduledPostId, 
          `Unscheduling failed: ${error instanceof Error ? error.message : String(error)}`
        );
      } catch (updateError) {
        this.logger.error(
          `Failed to mark scheduled post ${scheduledPostId} as failed after unschedule failure:`, 
          updateError
        );
      }

      throw error;
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  async getQueueStats(): Promise<{
    publisher: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  } | null> {
    if (!this.queueManager) {
      return null;
    }

    try {
      const publisherStats = await this.queueManager.publisherQueue.getQueueStats();
      return {
        publisher: publisherStats,
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Health check for the queue connection
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.queueManager) {
        return false;
      }

      // Try to get stats as a health check
      await this.queueManager.publisherQueue.getQueueStats();
      return true;
    } catch (error) {
      this.logger.error('Queue health check failed:', error);
      return false;
    }
  }

  /**
   * Gracefully shutdown the queue connections
   */
  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Shutting down scheduler queue service...');
    
    try {
      if (this.queueManager) {
        await this.queueManager.shutdown();
        this.queueManager = null;
        this.logger.log('Queue manager disconnected');
      }
    } catch (error) {
      this.logger.error('Error during queue service shutdown:', error);
    }
  }
}