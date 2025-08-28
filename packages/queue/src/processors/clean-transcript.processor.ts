import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { QueueLogger } from '../utils/logger';
import { CONTENT_QUEUE_NAMES } from '../config';
import type { 
  CleanTranscriptJobData, 
  CleanTranscriptJobResult 
} from '../types/jobs';

const logger = new QueueLogger('CleanTranscriptProcessor');

export interface CleanTranscriptProcessorDependencies {
  // AI service for cleaning transcripts
  cleanTranscript: (transcriptId: string, rawContent: string) => Promise<{
    cleanedContent: string;
    wordCount: number;
    processingDurationMs: number;
  }>;
  
  // Database service for updating transcript
  updateTranscript: (transcriptId: string, updates: {
    cleanedContent: string;
    status: string;
    wordCount: number;
    queueJobId?: string | null;
  }) => Promise<void>;
  
  // Content queue for triggering next stage
  triggerInsightExtraction: (transcriptId: string, cleanedContent: string) => Promise<void>;
}

export class CleanTranscriptProcessor {
  private worker: Worker<CleanTranscriptJobData, CleanTranscriptJobResult>;
  private isRunning = false;

  constructor(
    private connection: Redis,
    private dependencies: CleanTranscriptProcessorDependencies
  ) {
    this.worker = new Worker(
      CONTENT_QUEUE_NAMES.CLEAN_TRANSCRIPT,
      this.processJob.bind(this),
      {
        connection: this.connection,
        concurrency: 2, // Process 2 transcript cleaning jobs at once
        maxStalledCount: 1,
        stalledInterval: 30 * 1000, // 30 seconds
      }
    );

    this.setupEventHandlers();
    logger.log('Clean Transcript Processor initialized');
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.log(`Job ${job.id} completed`, { 
        transcriptId: job.data.transcriptId,
        success: result.success,
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
      logger.error('Clean transcript processor error', error);
    });
  }

  private async processJob(
    job: Job<CleanTranscriptJobData, CleanTranscriptJobResult>
  ): Promise<CleanTranscriptJobResult> {
    const { transcriptId, rawContent, metadata } = job.data;
    const startTime = Date.now();

    logger.log(`Processing clean transcript job ${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`, {
      transcriptId,
      contentLength: rawContent.length,
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      // Clean the transcript using AI
      logger.log(`🧹 [AI] Cleaning transcript ${transcriptId}...`);
      const result = await this.dependencies.cleanTranscript(transcriptId, rawContent);
      
      await job.updateProgress(70);

      // Update the transcript in database
      logger.log(`💾 [Database] Updating transcript ${transcriptId} with cleaned content`);
      await this.dependencies.updateTranscript(transcriptId, {
        cleanedContent: result.cleanedContent,
        status: 'cleaned',
        wordCount: result.wordCount,
        queueJobId: null, // Clear the job ID since processing is complete
      });

      await job.updateProgress(90);

      // Auto-trigger the next stage (insight extraction)
      logger.log(`🔄 [Pipeline] Triggering insight extraction for transcript ${transcriptId}`);
      await this.dependencies.triggerInsightExtraction(transcriptId, result.cleanedContent);

      await job.updateProgress(100);

      const processingDurationMs = Date.now() - startTime;

      const jobResult: CleanTranscriptJobResult = {
        success: true,
        transcriptId,
        cleanedContent: result.cleanedContent,
        wordCount: result.wordCount,
        processingDurationMs,
      };

      logger.log(`✅ [Database] Transcript ${transcriptId} cleaned successfully`, {
        wordCount: result.wordCount,
        processingTime: processingDurationMs,
      });

      return jobResult;

    } catch (error) {
      const processingDurationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`❌ Failed to clean transcript ${transcriptId}`, error);

      // If this is the final attempt, update the transcript status to failed
      if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
        try {
          await this.dependencies.updateTranscript(transcriptId, {
            cleanedContent: '',
            status: 'failed',
            wordCount: 0,
            queueJobId: null,
          });
          logger.log(`💾 [Database] Marked transcript ${transcriptId} as failed after final attempt`);
        } catch (dbError) {
          logger.error(`Failed to update transcript ${transcriptId} status to failed`, dbError);
        }
      }

      return {
        success: false,
        transcriptId,
        processingDurationMs,
        error: errorMessage,
      };
    }
  }

  async start(options?: { concurrency?: number }): Promise<void> {
    if (this.isRunning) {
      logger.warn('Clean transcript processor is already running');
      return;
    }

    if (options?.concurrency) {
      this.worker.concurrency = options.concurrency;
    }

    this.isRunning = true;
    logger.log(`Starting clean transcript processor with concurrency ${this.worker.concurrency}`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Clean transcript processor is not running');
      return;
    }

    await this.worker.close();
    this.isRunning = false;
    logger.log('Clean transcript processor stopped');
  }

  async pause(): Promise<void> {
    await this.worker.pause();
    logger.log('Clean transcript processor paused');
  }

  async resume(): Promise<void> {
    await this.worker.resume();
    logger.log('Clean transcript processor resumed');
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