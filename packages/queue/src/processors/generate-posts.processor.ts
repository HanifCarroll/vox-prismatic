import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { QueueLogger } from '../utils/logger';
import type { 
  GeneratePostsJobData, 
  GeneratePostsJobResult 
} from '../types/jobs';

const logger = new QueueLogger('GeneratePostsProcessor');

export interface GeneratePostsProcessorDependencies {
  // AI service for generating posts
  generatePosts: (insightId: string, insightContent: string, platforms: ('linkedin' | 'x')[]) => Promise<{
    posts: Array<{
      id: string;
      platform: 'linkedin' | 'x';
      title: string;
      content: string;
      characterCount: number;
    }>;
    processingDurationMs: number;
    estimatedTokens: number;
    estimatedCost: number;
  }>;
  
  // Database service for updating insight
  updateInsightProcessingStatus: (insightId: string, updates: {
    queueJobId?: string | null;
  }) => Promise<void>;
  
  // No auto-trigger for next stage - posts need human review before scheduling
}

export class GeneratePostsProcessor {
  private worker: Worker<GeneratePostsJobData, GeneratePostsJobResult>;
  private isRunning = false;

  constructor(
    private connection: Redis,
    private dependencies: GeneratePostsProcessorDependencies
  ) {
    this.worker = new Worker(
      'content:generate-posts',
      this.processJob.bind(this),
      {
        connection: this.connection,
        concurrency: 2, // Process 2 post generation jobs at once
        maxStalledCount: 1,
        stalledInterval: 60 * 1000, // 60 seconds
      }
    );

    this.setupEventHandlers();
    logger.log('Generate Posts Processor initialized');
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.log(`Job ${job.id} completed`, { 
        insightId: job.data.insightId,
        success: result.success,
        postsCreated: result.postsCreated,
        platforms: result.platforms,
        processingTime: result.processingDurationMs 
      });
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed for insight ${job?.data.insightId}`, err);
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} stalled`);
    });

    this.worker.on('error', (error) => {
      logger.error('Generate posts processor error', error);
    });
  }

  private async processJob(
    job: Job<GeneratePostsJobData, GeneratePostsJobResult>
  ): Promise<GeneratePostsJobResult> {
    const { insightId, insightContent, platforms, metadata } = job.data;
    const startTime = Date.now();

    logger.log(`Processing generate posts job ${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`, {
      insightId,
      platforms,
      contentLength: insightContent.length,
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      // Generate posts using AI
      logger.log(`✍️ [AI] Generating posts for insight ${insightId} on platforms: ${platforms.join(', ')}...`);
      const result = await this.dependencies.generatePosts(insightId, insightContent, platforms);
      
      await job.updateProgress(80);

      // Clear the processing job ID from insight
      logger.log(`💾 [Database] Clearing processing job for insight ${insightId}`);
      await this.dependencies.updateInsightProcessingStatus(insightId, {
        queueJobId: null,
      });

      await job.updateProgress(90);

      // Note: No auto-trigger for next stage - posts need human review before scheduling
      logger.log(`👤 [Human Review] ${result.posts.length} posts created for insight ${insightId} - awaiting human review before scheduling`);

      await job.updateProgress(100);

      const processingDurationMs = Date.now() - startTime;

      const jobResult: GeneratePostsJobResult = {
        success: true,
        insightId,
        postsCreated: result.posts.length,
        postIds: result.posts.map(post => post.id),
        platforms: result.posts.map(post => post.platform),
        processingDurationMs,
      };

      logger.log(`✅ [AI] Generated ${result.posts.length} posts for insight ${insightId}`, {
        postIds: result.posts.map(p => p.id),
        platforms: result.posts.map(p => `${p.platform} (${p.characterCount} chars)`),
        processingTime: processingDurationMs,
        estimatedCost: result.estimatedCost,
        estimatedTokens: result.estimatedTokens,
      });

      return jobResult;

    } catch (error) {
      const processingDurationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`❌ Failed to generate posts for insight ${insightId}`, error);

      // If this is the final attempt, clear the processing job ID
      if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
        try {
          await this.dependencies.updateInsightProcessingStatus(insightId, {
            queueJobId: null,
          });
          logger.log(`💾 [Database] Cleared processing job for insight ${insightId} after final attempt`);
        } catch (dbError) {
          logger.error(`Failed to clear processing job for insight ${insightId}`, dbError);
        }
      }

      return {
        success: false,
        insightId,
        postsCreated: 0,
        postIds: [],
        platforms: [],
        processingDurationMs,
        error: errorMessage,
      };
    }
  }

  async start(options?: { concurrency?: number }): Promise<void> {
    if (this.isRunning) {
      logger.warn('Generate posts processor is already running');
      return;
    }

    if (options?.concurrency) {
      this.worker.concurrency = options.concurrency;
    }

    this.isRunning = true;
    logger.log(`Starting generate posts processor with concurrency ${this.worker.concurrency}`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Generate posts processor is not running');
      return;
    }

    await this.worker.close();
    this.isRunning = false;
    logger.log('Generate posts processor stopped');
  }

  async pause(): Promise<void> {
    await this.worker.pause();
    logger.log('Generate posts processor paused');
  }

  async resume(): Promise<void> {
    await this.worker.resume();
    logger.log('Generate posts processor resumed');
  }

  isProcessorRunning(): boolean {
    return this.isRunning && !this.worker.isPaused();
  }

  isPaused(): boolean {
    return this.worker.isPaused();
  }

  async getStats(): Promise<{
    isRunning: boolean;
    isPaused: boolean;
    concurrency: number;
  }> {
    return {
      isRunning: this.isRunning,
      isPaused: this.worker.isPaused(),
      concurrency: this.worker.concurrency,
    };
  }
}