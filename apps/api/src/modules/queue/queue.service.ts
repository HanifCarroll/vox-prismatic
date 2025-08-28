import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { QueueManager, PublishJobData, PublishJobResult, Job } from '@content-creation/queue';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @Inject('QUEUE_MANAGER') private readonly queueManager: QueueManager,
  ) {}

  /**
   * Schedule a post for publishing
   */
  async schedulePost(
    data: PublishJobData,
    scheduledTime: Date
  ): Promise<{ jobId: string; delay: number }> {
    const delay = scheduledTime.getTime() - Date.now();
    
    this.logger.log(
      `Scheduling post ${data.scheduledPostId} for ${scheduledTime.toISOString()}`
    );

    const job = await this.queueManager.publisherQueue.schedulePost(data, scheduledTime);

    this.logger.log(`Job ${job.id} scheduled successfully`);
    
    return {
      jobId: job.id as string,
      delay: delay > 0 ? delay : 0,
    };
  }

  /**
   * Add a post to be published immediately
   */
  async publishImmediately(data: PublishJobData): Promise<{ jobId: string }> {
    this.logger.log(`Publishing post ${data.scheduledPostId} immediately`);

    const job = await this.queueManager.publisherQueue.addPublishJob(data, {
      priority: -10, // Higher priority for immediate posts
    });

    return { jobId: job.id as string };
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    this.logger.log(`Cancelling job ${jobId}`);
    return await this.queueManager.publisherQueue.cancelJob(jobId);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    state: string;
    progress: number;
    data?: PublishJobData;
    result?: PublishJobResult;
    failedReason?: string;
  } | null> {
    return await this.queueManager.publisherQueue.getJobStatus(jobId);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return await this.queueManager.publisherQueue.getQueueStats();
  }

  /**
   * Get overall system health
   */
  async getHealth(): Promise<{
    redis: boolean;
    queues: { publisher: boolean };
    stats?: any;
  }> {
    try {
      const health = await this.queueManager.healthCheck();
      const stats = await this.queueManager.getStats();
      
      return {
        redis: health.redis,
        queues: health.queues,
        stats,
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        redis: false,
        queues: { publisher: false },
      };
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queueManager.publisherQueue
        .getQueue()
        .getJob(jobId);
      
      if (!job) {
        this.logger.warn(`Job ${jobId} not found`);
        return false;
      }

      await job.retry();
      this.logger.log(`Job ${jobId} retried successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to retry job ${jobId}`, error);
      return false;
    }
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queueManager.publisherQueue
        .getQueue()
        .getJob(jobId);
      
      if (!job) {
        this.logger.warn(`Job ${jobId} not found`);
        return false;
      }

      await job.remove();
      this.logger.log(`Job ${jobId} removed successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove job ${jobId}`, error);
      return false;
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    await this.queueManager.publisherQueue.pause();
    this.logger.log('Queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    await this.queueManager.publisherQueue.resume();
    this.logger.log('Queue resumed');
  }

  /**
   * Clear completed jobs
   */
  async clearCompleted(): Promise<void> {
    await this.queueManager.publisherQueue.clearCompleted();
    this.logger.log('Cleared completed jobs');
  }

  /**
   * Clear failed jobs
   */
  async clearFailed(): Promise<void> {
    await this.queueManager.publisherQueue.clearFailed();
    this.logger.log('Cleared failed jobs');
  }

  /**
   * Get queue events for monitoring
   */
  getQueueEvents() {
    return this.queueManager.publisherQueue.getEvents();
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    this.logger.log('Shutting down queue connections');
    await this.queueManager.shutdown();
  }
}