import { Queue, QueueEvents, Job } from 'bullmq';
import Redis from 'ioredis';
import { PublishJobData, PublishJobResult } from '../types/jobs';
import { QUEUE_NAMES, platformRateLimits } from '../config';
import { QueueLogger } from '../utils/logger';

const logger = new QueueLogger('PublisherQueue');

export class PublisherQueue {
  private queue: Queue<PublishJobData, PublishJobResult>;
  private events: QueueEvents;

  constructor(connection: Redis) {
    // Create the queue with default job options
    this.queue = new Queue<PublishJobData, PublishJobResult>(QUEUE_NAMES.PUBLISHER, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // 7 days
          count: 500,
        },
      },
    });

    // Create queue events for monitoring
    this.events = new QueueEvents(QUEUE_NAMES.PUBLISHER, { connection });

    this.setupEventListeners();
    logger.log('Publisher queue initialized');
  }

  private setupEventListeners(): void {
    this.events.on('completed', ({ jobId, returnvalue }) => {
      logger.log(`Job ${jobId} completed successfully`, returnvalue);
    });

    this.events.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Job ${jobId} failed`, failedReason);
    });

    this.events.on('progress', ({ jobId, data }) => {
      logger.debug(`Job ${jobId} progress: ${data}%`);
    });

    this.events.on('delayed', ({ jobId, delay }) => {
      logger.debug(`Job ${jobId} delayed for ${delay}ms`);
    });

    this.events.on('waiting', ({ jobId }) => {
      logger.debug(`Job ${jobId} is waiting to be processed`);
    });
  }

  /**
   * Add a publish job to the queue
   */
  async addPublishJob(
    data: PublishJobData,
    options?: {
      delay?: number;
      priority?: number;
      jobId?: string;
    }
  ): Promise<Job<PublishJobData, PublishJobResult>> {
    const { delay, priority, jobId } = options || {};

    // Apply rate limiting based on platform
    const rateLimitKey = `publish-${data.platform}`;
    const rateLimit = platformRateLimits[data.platform];

    logger.log(`Adding publish job for ${data.platform}`, {
      scheduledPostId: data.scheduledPostId,
      delay,
      priority,
      jobId,
    });

    const job = await this.queue.add(rateLimitKey, data, {
      delay,
      priority,
      jobId,
      // Platform-specific rate limiting
      ...(rateLimit && {
        limiter: {
          max: rateLimit.max,
          duration: rateLimit.duration,
        },
      }),
    });

    logger.log(`Job ${job.id} added to queue`);
    return job;
  }

  /**
   * Schedule a post for future publishing
   */
  async schedulePost(
    data: PublishJobData,
    scheduledTime: Date
  ): Promise<Job<PublishJobData, PublishJobResult>> {
    const delay = scheduledTime.getTime() - Date.now();
    
    if (delay < 0) {
      logger.warn('Scheduled time is in the past, publishing immediately');
      return this.addPublishJob(data);
    }

    logger.log(`Scheduling post for ${scheduledTime.toISOString()}`);
    return this.addPublishJob(data, { 
      delay, 
      jobId: data.scheduledPostId 
    });
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) {
        logger.warn(`Job ${jobId} not found`);
        return false;
      }

      await job.remove();
      logger.log(`Job ${jobId} cancelled successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}`, error);
      return false;
    }
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
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress as number;

    return {
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
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
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    logger.log('Queue paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    logger.log('Queue resumed');
  }

  /**
   * Clear completed jobs
   */
  async clearCompleted(): Promise<void> {
    await this.queue.clean(0, 0, 'completed');
    logger.log('Cleared completed jobs');
  }

  /**
   * Clear failed jobs
   */
  async clearFailed(): Promise<void> {
    await this.queue.clean(0, 0, 'failed');
    logger.log('Cleared failed jobs');
  }

  /**
   * Close the queue connections
   */
  async close(): Promise<void> {
    await this.events.close();
    await this.queue.close();
    logger.log('Queue connections closed');
  }

  /**
   * Get the underlying BullMQ queue instance
   */
  getQueue(): Queue<PublishJobData, PublishJobResult> {
    return this.queue;
  }

  /**
   * Get queue events instance for external monitoring
   */
  getEvents(): QueueEvents {
    return this.events;
  }
}