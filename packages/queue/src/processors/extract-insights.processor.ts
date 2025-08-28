import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { QueueLogger } from '../utils/logger';
import { CONTENT_QUEUE_NAMES } from '../config';
import type { 
  ExtractInsightsJobData, 
  ExtractInsightsJobResult 
} from '../types/jobs';

const logger = new QueueLogger('ExtractInsightsProcessor');

export interface ExtractInsightsProcessorDependencies {
  // AI service for extracting insights
  extractInsights: (transcriptId: string, cleanedContent: string) => Promise<{
    insights: Array<{
      id: string;
      title: string;
      summary: string;
      verbatimQuote: string;
      category: string;
      postType: string;
      urgencyScore: number;
      relatabilityScore: number;
      specificityScore: number;
      authorityScore: number;
      totalScore: number;
    }>;
    processingDurationMs: number;
    estimatedTokens: number;
    estimatedCost: number;
  }>;
  
  // Database service for updating transcript
  updateTranscriptProcessingStatus: (transcriptId: string, updates: {
    queueJobId?: string | null;
  }) => Promise<void>;
  
  // No auto-trigger for next stage - insights need human review
}

export class ExtractInsightsProcessor {
  private worker: Worker<ExtractInsightsJobData, ExtractInsightsJobResult>;
  private isRunning = false;

  constructor(
    private connection: Redis,
    private dependencies: ExtractInsightsProcessorDependencies
  ) {
    this.worker = new Worker(
      CONTENT_QUEUE_NAMES.EXTRACT_INSIGHTS,
      this.processJob.bind(this),
      {
        connection: this.connection,
        concurrency: 1, // Process 1 insight extraction at a time (AI intensive)
        maxStalledCount: 1,
        stalledInterval: 60 * 1000, // 60 seconds
      }
    );

    this.setupEventHandlers();
    logger.log('Extract Insights Processor initialized');
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.log(`Job ${job.id} completed`, { 
        transcriptId: job.data.transcriptId,
        success: result.success,
        insightsCreated: result.insightsCreated,
        processingTime: result.processingDurationMs 
      });
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed for transcript ${job?.data.transcriptId}`, err);
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} stalled`);
    });

    this.worker.on('error', (error) => {
      logger.error('Extract insights processor error', error);
    });
  }

  private async processJob(
    job: Job<ExtractInsightsJobData, ExtractInsightsJobResult>
  ): Promise<ExtractInsightsJobResult> {
    const { transcriptId, cleanedContent, metadata } = job.data;
    const startTime = Date.now();

    logger.log(`Processing extract insights job ${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`, {
      transcriptId,
      contentLength: cleanedContent.length,
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      // Extract insights using AI
      logger.log(`🧠 [AI] Extracting insights from transcript ${transcriptId}...`);
      const result = await this.dependencies.extractInsights(transcriptId, cleanedContent);
      
      await job.updateProgress(80);

      // Clear the processing job ID from transcript
      logger.log(`💾 [Database] Clearing processing job for transcript ${transcriptId}`);
      await this.dependencies.updateTranscriptProcessingStatus(transcriptId, {
        queueJobId: null,
      });

      await job.updateProgress(90);

      // Note: No auto-trigger for next stage - insights need human review
      logger.log(`👤 [Human Review] ${result.insights.length} insights created for transcript ${transcriptId} - awaiting human review`);

      await job.updateProgress(100);

      const processingDurationMs = Date.now() - startTime;

      const jobResult: ExtractInsightsJobResult = {
        success: true,
        transcriptId,
        insightsCreated: result.insights.length,
        insightIds: result.insights.map(insight => insight.id),
        processingDurationMs,
      };

      logger.log(`✅ [AI] Extracted ${result.insights.length} insights from transcript ${transcriptId}`, {
        insightIds: result.insights.map(i => i.id),
        processingTime: processingDurationMs,
        estimatedCost: result.estimatedCost,
        estimatedTokens: result.estimatedTokens,
      });

      return jobResult;

    } catch (error) {
      const processingDurationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`❌ Failed to extract insights from transcript ${transcriptId}`, error);

      // If this is the final attempt, clear the processing job ID
      if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
        try {
          await this.dependencies.updateTranscriptProcessingStatus(transcriptId, {
            queueJobId: null,
          });
          logger.log(`💾 [Database] Cleared processing job for transcript ${transcriptId} after final attempt`);
        } catch (dbError) {
          logger.error(`Failed to clear processing job for transcript ${transcriptId}`, dbError);
        }
      }

      return {
        success: false,
        transcriptId,
        insightsCreated: 0,
        insightIds: [],
        processingDurationMs,
        error: errorMessage,
      };
    }
  }

  async start(options?: { concurrency?: number }): Promise<void> {
    if (this.isRunning) {
      logger.warn('Extract insights processor is already running');
      return;
    }

    if (options?.concurrency) {
      this.worker.concurrency = options.concurrency;
    }

    this.isRunning = true;
    logger.log(`Starting extract insights processor with concurrency ${this.worker.concurrency}`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Extract insights processor is not running');
      return;
    }

    await this.worker.close();
    this.isRunning = false;
    logger.log('Extract insights processor stopped');
  }

  async pause(): Promise<void> {
    await this.worker.pause();
    logger.log('Extract insights processor paused');
  }

  async resume(): Promise<void> {
    await this.worker.resume();
    logger.log('Extract insights processor resumed');
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