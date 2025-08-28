import Redis from 'ioredis';
import { QueueConfig } from './types/config';
import { PublisherQueue } from './queues/publisher.queue';
import { PublishPostProcessor, PublishPostProcessorDependencies } from './processors/publish-post.processor';
import { createRedisConnection, closeRedisConnection } from './connection';
import { defaultQueueConfig } from './config';
import { QueueLogger } from './utils/logger';

const logger = new QueueLogger('QueueManager');

export class QueueManager {
  private connection: Redis;
  private config: QueueConfig;
  
  // Queues
  public publisherQueue: PublisherQueue;
  
  // Processors
  private publishPostProcessor: PublishPostProcessor | null = null;

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
    
    logger.log('Queue Manager initialized');
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
  }> {
    const publisherQueueStats = await this.publisherQueue.getQueueStats();
    const publisherProcessorStats = this.publishPostProcessor 
      ? await this.publishPostProcessor.getStats()
      : undefined;

    return {
      publisher: {
        queue: publisherQueueStats,
        processor: publisherProcessorStats || undefined,
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