import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PublishJobData, PublishJobResult } from '../types/jobs';
import { QUEUE_NAMES, platformRateLimits } from '../config';
import { QueueLogger } from '../utils/logger';
import { JobProcessingError, isRateLimitError, PublishingError } from '../utils/errors';

const logger = new QueueLogger('PublishPostProcessor');

export interface PublishPostProcessorDependencies {
  publishToLinkedIn: (content: string, credentials: any) => Promise<{ success: boolean; externalPostId?: string; error?: Error }>;
  publishToX: (content: string, credentials: any) => Promise<{ success: boolean; externalPostId?: string; error?: Error }>;
  markPostAsPublished: (scheduledPostId: string, externalPostId: string, platform: string) => Promise<void>;
  markPostAsFailed: (scheduledPostId: string, error: string, attemptNumber: number) => Promise<void>;
}

export class PublishPostProcessor {
  private worker: Worker<PublishJobData, PublishJobResult> | null = null;
  private dependencies: PublishPostProcessorDependencies;
  private connection: Redis;
  private isProcessing = false;

  constructor(
    connection: Redis,
    dependencies: PublishPostProcessorDependencies
  ) {
    this.connection = connection;
    this.dependencies = dependencies;
  }

  /**
   * Start processing jobs from the queue
   */
  async start(options?: {
    concurrency?: number;
    maxStalledCount?: number;
  }): Promise<void> {
    if (this.worker) {
      logger.warn('Worker is already running');
      return;
    }

    const { concurrency = 5, maxStalledCount = 1 } = options || {};

    logger.log(`Starting publish post processor with concurrency: ${concurrency}`);

    this.worker = new Worker<PublishJobData, PublishJobResult>(
      QUEUE_NAMES.PUBLISHER,
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection: this.connection,
        concurrency,
        maxStalledCount,
        autorun: true,
        // Global rate limiter for all jobs
        limiter: {
          max: 100,
          duration: 60000, // Max 100 jobs per minute globally
        },
      }
    );

    this.setupWorkerEventListeners();
    logger.log('Publish post processor started');
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job<PublishJobData>): Promise<PublishJobResult> {
    const { scheduledPostId, platform, content, credentials } = job.data;
    const attemptNumber = job.attemptsMade + 1;

    logger.log(`Processing job ${job.id} (attempt ${attemptNumber}/${job.opts.attempts})`, {
      scheduledPostId,
      platform,
    });

    try {
      // Update progress: Starting
      await job.updateProgress(10);

      // Publish to the appropriate platform
      let publishResult: { success: boolean; externalPostId?: string; error?: Error };

      if (platform === 'linkedin') {
        await job.updateProgress(20);
        publishResult = await this.dependencies.publishToLinkedIn(content, credentials);
      } else if (platform === 'x') {
        await job.updateProgress(20);
        publishResult = await this.dependencies.publishToX(content, credentials);
      } else {
        throw new PublishingError(
          `Unsupported platform: ${platform}`,
          platform,
          job.data.postId
        );
      }

      await job.updateProgress(80);

      if (!publishResult.success) {
        // Check if this is a rate limit error
        if (publishResult.error && isRateLimitError(publishResult.error)) {
          logger.warn(`Rate limit hit for ${platform}, will retry`);
          // Let BullMQ handle the retry with exponential backoff
          throw publishResult.error;
        }

        // For other errors, mark as failed in database
        await this.dependencies.markPostAsFailed(
          scheduledPostId,
          publishResult.error?.message || 'Unknown error',
          attemptNumber
        );

        throw new PublishingError(
          publishResult.error?.message || 'Publishing failed',
          platform,
          job.data.postId,
          publishResult.error
        );
      }

      // Success! Update database
      await job.updateProgress(90);
      
      if (publishResult.externalPostId) {
        await this.dependencies.markPostAsPublished(
          scheduledPostId,
          publishResult.externalPostId,
          platform
        );
      }

      await job.updateProgress(100);

      const result: PublishJobResult = {
        success: true,
        externalPostId: publishResult.externalPostId,
        publishedAt: new Date(),
        platform,
      };

      logger.log(`Job ${job.id} completed successfully`, result);
      return result;

    } catch (error) {
      // Log the error
      logger.error(`Job ${job.id} failed`, error);

      // Update database with failure
      await this.dependencies.markPostAsFailed(
        scheduledPostId,
        error instanceof Error ? error.message : 'Unknown error',
        attemptNumber
      );

      // If this is the last attempt, return a failure result
      if (attemptNumber >= (job.opts.attempts || 3)) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          publishedAt: new Date(),
          platform,
        };
      }

      // Otherwise, throw to trigger retry
      throw error;
    }
  }

  /**
   * Setup event listeners for the worker
   */
  private setupWorkerEventListeners(): void {
    if (!this.worker) return;

    this.worker.on('completed', (job, result) => {
      logger.log(`Job ${job.id} completed`, result);
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed after all retries`, error);
    });

    this.worker.on('active', (job) => {
      logger.debug(`Job ${job.id} is now active`);
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} has stalled`);
    });

    this.worker.on('error', (error) => {
      logger.error('Worker error', error);
    });

    this.worker.on('paused', () => {
      logger.log('Worker paused');
    });

    this.worker.on('resumed', () => {
      logger.log('Worker resumed');
    });
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.worker) {
      logger.warn('Worker is not running');
      return;
    }

    logger.log('Stopping publish post processor...');
    await this.worker.close();
    this.worker = null;
    logger.log('Publish post processor stopped');
  }

  /**
   * Pause processing
   */
  async pause(): Promise<void> {
    if (!this.worker) {
      logger.warn('Worker is not running');
      return;
    }

    await this.worker.pause();
    logger.log('Worker paused');
  }

  /**
   * Resume processing
   */
  async resume(): Promise<void> {
    if (!this.worker) {
      logger.warn('Worker is not running');
      return;
    }

    await this.worker.resume();
    logger.log('Worker resumed');
  }

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return this.worker !== null;
  }

  /**
   * Get worker statistics
   */
  async getStats(): Promise<{
    isRunning: boolean;
    isPaused: boolean;
  } | null> {
    if (!this.worker) return null;

    return {
      isRunning: !this.worker.closing,
      isPaused: await this.worker.isPaused(),
    };
  }
}