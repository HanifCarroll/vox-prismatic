import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { QueueLogger } from '../utils/logger';
import { CONTENT_QUEUE_NAMES } from '../config';
import type { 
  CleanTranscriptJobData,
  ExtractInsightsJobData,
  GeneratePostsJobData,
  CleanTranscriptJobResult,
  ExtractInsightsJobResult,
  GeneratePostsJobResult
} from '../types/jobs';

const logger = new QueueLogger('ContentQueue');

export class ContentQueue {
  private cleanTranscriptQueue: Queue<CleanTranscriptJobData, CleanTranscriptJobResult>;
  private extractInsightsQueue: Queue<ExtractInsightsJobData, ExtractInsightsJobResult>;
  private generatePostsQueue: Queue<GeneratePostsJobData, GeneratePostsJobResult>;
  
  // Queue events for monitoring
  private cleanTranscriptEvents: QueueEvents;
  private extractInsightsEvents: QueueEvents;
  private generatePostsEvents: QueueEvents;

  constructor(private connection: Redis) {
    // Initialize queues with valid names
    this.cleanTranscriptQueue = new Queue(CONTENT_QUEUE_NAMES.CLEAN_TRANSCRIPT, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 seconds
        },
      },
    });

    this.extractInsightsQueue = new Queue(CONTENT_QUEUE_NAMES.EXTRACT_INSIGHTS, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000, // Start with 10 seconds (AI processing is slower)
        },
      },
    });

    this.generatePostsQueue = new Queue(CONTENT_QUEUE_NAMES.GENERATE_POSTS, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000, // Start with 10 seconds
        },
      },
    });

    // Initialize queue events for monitoring
    this.cleanTranscriptEvents = new QueueEvents(CONTENT_QUEUE_NAMES.CLEAN_TRANSCRIPT, {
      connection: this.connection,
    });

    this.extractInsightsEvents = new QueueEvents(CONTENT_QUEUE_NAMES.EXTRACT_INSIGHTS, {
      connection: this.connection,
    });

    this.generatePostsEvents = new QueueEvents(CONTENT_QUEUE_NAMES.GENERATE_POSTS, {
      connection: this.connection,
    });

    logger.log('Content processing queues and events initialized');
  }

  /**
   * Add a transcript cleaning job
   */
  async cleanTranscript(
    data: CleanTranscriptJobData,
    options?: {
      priority?: number;
      delay?: number;
    }
  ): Promise<{ jobId: string }> {
    const job = await this.cleanTranscriptQueue.add(
      `clean-transcript-${data.transcriptId}`,
      data,
      {
        priority: options?.priority || 0,
        delay: options?.delay || 0,
        jobId: `clean_${data.transcriptId}_${Date.now()}`,
      }
    );

    logger.log(`Queued transcript cleaning job for transcript ${data.transcriptId}`);
    
    return { jobId: job.id! };
  }

  /**
   * Add an insights extraction job
   */
  async extractInsights(
    data: ExtractInsightsJobData,
    options?: {
      priority?: number;
      delay?: number;
    }
  ): Promise<{ jobId: string }> {
    const job = await this.extractInsightsQueue.add(
      `extract-insights-${data.transcriptId}`,
      data,
      {
        priority: options?.priority || 0,
        delay: options?.delay || 0,
        jobId: `insights_${data.transcriptId}_${Date.now()}`,
      }
    );

    logger.log(`Queued insight extraction job for transcript ${data.transcriptId}`);
    
    return { jobId: job.id! };
  }

  /**
   * Add a post generation job
   */
  async generatePosts(
    data: GeneratePostsJobData,
    options?: {
      priority?: number;
      delay?: number;
    }
  ): Promise<{ jobId: string }> {
    const job = await this.generatePostsQueue.add(
      `generate-posts-${data.insightId}`,
      data,
      {
        priority: options?.priority || 0,
        delay: options?.delay || 0,
        jobId: `posts_${data.insightId}_${Date.now()}`,
      }
    );

    logger.log(`Queued post generation job for insight ${data.insightId}`);
    
    return { jobId: job.id! };
  }

  /**
   * Get statistics for all content processing queues
   */
  async getStats(): Promise<{
    cleanTranscript: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    extractInsights: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    generatePosts: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  }> {
    // Get counts using BullMQ's getJobCounts method
    const [cleanTranscriptCounts, extractInsightsCounts, generatePostsCounts] = await Promise.all([
      this.cleanTranscriptQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.extractInsightsQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.generatePostsQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    ]);

    return {
      cleanTranscript: {
        waiting: cleanTranscriptCounts.waiting || 0,
        active: cleanTranscriptCounts.active || 0,
        completed: cleanTranscriptCounts.completed || 0,
        failed: cleanTranscriptCounts.failed || 0,
        delayed: cleanTranscriptCounts.delayed || 0,
      },
      extractInsights: {
        waiting: extractInsightsCounts.waiting || 0,
        active: extractInsightsCounts.active || 0,
        completed: extractInsightsCounts.completed || 0,
        failed: extractInsightsCounts.failed || 0,
        delayed: extractInsightsCounts.delayed || 0,
      },
      generatePosts: {
        waiting: generatePostsCounts.waiting || 0,
        active: generatePostsCounts.active || 0,
        completed: generatePostsCounts.completed || 0,
        failed: generatePostsCounts.failed || 0,
        delayed: generatePostsCounts.delayed || 0,
      },
    };
  }

  /**
   * Pause all content processing queues
   */
  async pauseAll(): Promise<void> {
    await Promise.all([
      this.cleanTranscriptQueue.pause(),
      this.extractInsightsQueue.pause(),
      this.generatePostsQueue.pause(),
    ]);
    logger.log('All content processing queues paused');
  }

  /**
   * Resume all content processing queues
   */
  async resumeAll(): Promise<void> {
    await Promise.all([
      this.cleanTranscriptQueue.resume(),
      this.extractInsightsQueue.resume(),
      this.generatePostsQueue.resume(),
    ]);
    logger.log('All content processing queues resumed');
  }

  /**
   * Clear completed jobs from all queues
   */
  async clearCompleted(): Promise<void> {
    await Promise.all([
      this.cleanTranscriptQueue.clean(0, 100, 'completed'),
      this.extractInsightsQueue.clean(0, 100, 'completed'),
      this.generatePostsQueue.clean(0, 100, 'completed'),
    ]);
    logger.log('Completed jobs cleared from all content processing queues');
  }

  /**
   * Clear failed jobs from all queues
   */
  async clearFailed(): Promise<void> {
    await Promise.all([
      this.cleanTranscriptQueue.clean(0, 100, 'failed'),
      this.extractInsightsQueue.clean(0, 100, 'failed'),
      this.generatePostsQueue.clean(0, 100, 'failed'),
    ]);
    logger.log('Failed jobs cleared from all content processing queues');
  }

  /**
   * Get individual queue references for processors
   */
  getQueues() {
    return {
      cleanTranscriptQueue: this.cleanTranscriptQueue,
      extractInsightsQueue: this.extractInsightsQueue,
      generatePostsQueue: this.generatePostsQueue,
    };
  }

  /**
   * Get queue events for monitoring
   */
  getQueueEvents() {
    return {
      [CONTENT_QUEUE_NAMES.CLEAN_TRANSCRIPT]: this.cleanTranscriptEvents,
      [CONTENT_QUEUE_NAMES.EXTRACT_INSIGHTS]: this.extractInsightsEvents,
      [CONTENT_QUEUE_NAMES.GENERATE_POSTS]: this.generatePostsEvents,
    };
  }

  /**
   * Close all queues
   */
  async close(): Promise<void> {
    await Promise.all([
      this.cleanTranscriptQueue.close(),
      this.extractInsightsQueue.close(),
      this.generatePostsQueue.close(),
      this.cleanTranscriptEvents.close(),
      this.extractInsightsEvents.close(),
      this.generatePostsEvents.close(),
    ]);
    logger.log('All content processing queues and events closed');
  }
}