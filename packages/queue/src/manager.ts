import Redis from 'ioredis';
import { QueueConfig } from './types/config';
import { PublisherQueue } from './queues/publisher.queue';
import { ContentQueue } from './queues/content.queue';
import { PublishPostProcessor, PublishPostProcessorDependencies } from './processors/publish-post.processor';
import { CleanTranscriptProcessor, CleanTranscriptProcessorDependencies } from './processors/clean-transcript.processor';
import { ExtractInsightsProcessor, ExtractInsightsProcessorDependencies } from './processors/extract-insights.processor';
import { GeneratePostsProcessor, GeneratePostsProcessorDependencies } from './processors/generate-posts.processor';
import { createRedisConnection, closeRedisConnection } from './connection';
import { defaultQueueConfig } from './config';
import { QueueLogger } from './utils/logger';

const logger = new QueueLogger('QueueManager');

export class QueueManager {
  private connection: Redis;
  private config: QueueConfig;
  
  // Queues
  public publisherQueue: PublisherQueue;
  public contentQueue: ContentQueue;
  
  // Processors
  private publishPostProcessor: PublishPostProcessor | null = null;
  private cleanTranscriptProcessor: CleanTranscriptProcessor | null = null;
  private extractInsightsProcessor: ExtractInsightsProcessor | null = null;
  private generatePostsProcessor: GeneratePostsProcessor | null = null;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      ...defaultQueueConfig,
      ...config,
      redis: {
        ...defaultQueueConfig.redis,
        ...(config?.redis || {}),
      },
    };

    // Create Redis connection
    this.connection = createRedisConnection(this.config.redis);
    
    // Initialize queues
    this.publisherQueue = new PublisherQueue(this.connection);
    this.contentQueue = new ContentQueue(this.connection);
    
    logger.log('Queue Manager initialized with publisher and content queues');
  }

  /**
   * Connect to Redis and verify connection
   */
  async connect(): Promise<void> {
    try {
      await this.connection.ping();
      logger.log('Redis connection verified');
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  /**
   * Register and start the publish post processor
   */
  async startPublishProcessor(
    dependencies: PublishPostProcessorDependencies,
    options?: {
      concurrency?: number;
      maxStalledCount?: number;
    }
  ): Promise<void> {
    if (this.publishPostProcessor?.isRunning()) {
      logger.warn('Publish processor is already running');
      return;
    }

    logger.log('Starting publish post processor');
    this.publishPostProcessor = new PublishPostProcessor(this.connection, dependencies);
    await this.publishPostProcessor.start(options);
  }

  /**
   * Stop the publish post processor
   */
  async stopPublishProcessor(): Promise<void> {
    if (!this.publishPostProcessor) {
      logger.warn('Publish processor is not initialized');
      return;
    }

    await this.publishPostProcessor.stop();
    this.publishPostProcessor = null;
  }

  /**
   * Start the clean transcript processor
   */
  async startCleanTranscriptProcessor(
    dependencies: CleanTranscriptProcessorDependencies,
    options?: {
      concurrency?: number;
    }
  ): Promise<void> {
    if (this.cleanTranscriptProcessor?.isProcessorRunning()) {
      logger.warn('Clean transcript processor is already running');
      return;
    }

    logger.log('Starting clean transcript processor');
    this.cleanTranscriptProcessor = new CleanTranscriptProcessor(this.connection, dependencies);
    await this.cleanTranscriptProcessor.start(options);
  }

  /**
   * Start the extract insights processor
   */
  async startExtractInsightsProcessor(
    dependencies: ExtractInsightsProcessorDependencies,
    options?: {
      concurrency?: number;
    }
  ): Promise<void> {
    if (this.extractInsightsProcessor?.isProcessorRunning()) {
      logger.warn('Extract insights processor is already running');
      return;
    }

    logger.log('Starting extract insights processor');
    this.extractInsightsProcessor = new ExtractInsightsProcessor(this.connection, dependencies);
    await this.extractInsightsProcessor.start(options);
  }

  /**
   * Start the generate posts processor
   */
  async startGeneratePostsProcessor(
    dependencies: GeneratePostsProcessorDependencies,
    options?: {
      concurrency?: number;
    }
  ): Promise<void> {
    if (this.generatePostsProcessor?.isProcessorRunning()) {
      logger.warn('Generate posts processor is already running');
      return;
    }

    logger.log('Starting generate posts processor');
    this.generatePostsProcessor = new GeneratePostsProcessor(this.connection, dependencies);
    await this.generatePostsProcessor.start(options);
  }

  /**
   * Stop all content processors
   */
  async stopContentProcessors(): Promise<void> {
    const processors = [
      { name: 'Clean Transcript', processor: this.cleanTranscriptProcessor },
      { name: 'Extract Insights', processor: this.extractInsightsProcessor },
      { name: 'Generate Posts', processor: this.generatePostsProcessor },
    ];

    for (const { name, processor } of processors) {
      if (processor) {
        logger.log(`Stopping ${name} processor`);
        await processor.stop();
      }
    }

    this.cleanTranscriptProcessor = null;
    this.extractInsightsProcessor = null;
    this.generatePostsProcessor = null;
    logger.log('All content processors stopped');
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    publisher: {
      queue: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
      };
      processor?: {
        isRunning: boolean;
        isPaused: boolean;
      };
    };
    content: {
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
      processors?: {
        cleanTranscript?: {
          isRunning: boolean;
          isPaused: boolean;
        };
        extractInsights?: {
          isRunning: boolean;
          isPaused: boolean;
        };
        generatePosts?: {
          isRunning: boolean;
          isPaused: boolean;
        };
      };
    };
  }> {
    const publisherQueueStats = await this.publisherQueue.getQueueStats();
    const publisherProcessorStats = this.publishPostProcessor 
      ? await this.publishPostProcessor.getStats()
      : undefined;
    
    const contentQueueStats = await this.contentQueue.getStats();
    const contentProcessorStats = {
      cleanTranscript: this.cleanTranscriptProcessor 
        ? await this.cleanTranscriptProcessor.getStats()
        : undefined,
      extractInsights: this.extractInsightsProcessor 
        ? await this.extractInsightsProcessor.getStats()
        : undefined,
      generatePosts: this.generatePostsProcessor 
        ? await this.generatePostsProcessor.getStats()
        : undefined,
    };

    return {
      publisher: {
        queue: publisherQueueStats,
        processor: publisherProcessorStats || undefined,
      },
      content: {
        ...contentQueueStats,
        processors: contentProcessorStats,
      },
    };
  }

  /**
   * Health check for all queues and processors
   */
  async healthCheck(): Promise<{
    redis: boolean;
    queues: {
      publisher: boolean;
    };
    processors: {
      publisher: boolean;
    };
  }> {
    let redisHealthy = false;
    
    try {
      await this.connection.ping();
      redisHealthy = true;
    } catch (error) {
      logger.error('Redis health check failed', error);
    }

    return {
      redis: redisHealthy,
      queues: {
        publisher: redisHealthy, // Queue is healthy if Redis is healthy
      },
      processors: {
        publisher: this.publishPostProcessor?.isRunning() || false,
      },
    };
  }

  /**
   * Pause all queues and processors
   */
  async pauseAll(): Promise<void> {
    logger.log('Pausing all queues and processors');
    
    await Promise.all([
      this.publisherQueue.pause(),
      this.publishPostProcessor?.pause(),
    ]);
    
    logger.log('All queues and processors paused');
  }

  /**
   * Resume all queues and processors
   */
  async resumeAll(): Promise<void> {
    logger.log('Resuming all queues and processors');
    
    await Promise.all([
      this.publisherQueue.resume(),
      this.publishPostProcessor?.resume(),
    ]);
    
    logger.log('All queues and processors resumed');
  }

  /**
   * Clear all completed jobs from queues
   */
  async clearAllCompleted(): Promise<void> {
    logger.log('Clearing completed jobs from all queues');
    await this.publisherQueue.clearCompleted();
    logger.log('Completed jobs cleared');
  }

  /**
   * Clear all failed jobs from queues
   */
  async clearAllFailed(): Promise<void> {
    logger.log('Clearing failed jobs from all queues');
    await this.publisherQueue.clearFailed();
    logger.log('Failed jobs cleared');
  }

  /**
   * Gracefully shutdown the queue manager
   */
  async shutdown(): Promise<void> {
    logger.log('Shutting down Queue Manager');
    
    try {
      // Stop all processors
      await this.stopPublishProcessor();
      
      // Close all queue connections
      await this.publisherQueue.close();
      
      // Close Redis connection
      await closeRedisConnection();
      
      logger.log('Queue Manager shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', error);
      throw error;
    }
  }

  /**
   * Get the Redis connection (for advanced use cases)
   */
  getConnection(): Redis {
    return this.connection;
  }
}