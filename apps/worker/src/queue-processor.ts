import { QueueManager, PublishPostProcessorDependencies } from '@content-creation/queue';
import { PrismaClient } from '@prisma/client';

/**
 * Queue Processor for the Worker Service
 * Handles job processing from the queue system
 */

export class WorkerQueueProcessor {
  private queueManager: QueueManager;
  private prisma: PrismaClient;
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.queueManager = new QueueManager({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    });
  }

  /**
   * Initialize and connect to the queue system
   */
  async initialize(): Promise<void> {
    console.log('🔄 [QueueProcessor] Initializing queue system...');
    
    try {
      await this.queueManager.connect();
      console.log('✅ [QueueProcessor] Connected to Redis');
    } catch (error) {
      console.error('❌ [QueueProcessor] Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Start processing jobs from the queue
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️ [QueueProcessor] Already running');
      return;
    }

    console.log('🚀 [QueueProcessor] Starting job processing...');

    // Create dependencies for the publish processor
    const processorDependencies: PublishPostProcessorDependencies = {
      publishToLinkedIn: this.createLinkedInPublisher(),
      publishToX: this.createXPublisher(),
      markPostAsPublished: this.createPublishSuccessHandler(),
      markPostAsFailed: this.createPublishFailureHandler(),
    };

    // Start the publish processor
    await this.queueManager.startPublishProcessor(processorDependencies, {
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
      maxStalledCount: 1,
    });

    this.isRunning = true;
    console.log('✅ [QueueProcessor] Job processing started');
  }

  /**
   * Create LinkedIn publisher function
   */
  private createLinkedInPublisher() {
    return async (content: string, credentials: any) => {
      console.log('📱 [LinkedIn] Publishing post...');
      
      try {
        // For now, simulate publishing
        // In production, this would call the actual LinkedIn API
        console.log('📱 [LinkedIn] Simulating publish with content:', content.substring(0, 100) + '...');
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate success
        const externalPostId = `linkedin_${Date.now()}`;
        console.log('✅ [LinkedIn] Published successfully:', externalPostId);
        
        return {
          success: true,
          externalPostId,
        };
      } catch (error) {
        console.error('❌ [LinkedIn] Publishing failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error : new Error('LinkedIn publishing failed'),
        };
      }
    };
  }

  /**
   * Create X (Twitter) publisher function
   */
  private createXPublisher() {
    return async (content: string, credentials: any) => {
      console.log('🐦 [X] Publishing post...');
      
      try {
        // For now, simulate publishing
        // In production, this would call the actual X/Twitter API
        console.log('🐦 [X] Simulating publish with content:', content.substring(0, 100) + '...');
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Simulate success
        const externalPostId = `x_${Date.now()}`;
        console.log('✅ [X] Published successfully:', externalPostId);
        
        return {
          success: true,
          externalPostId,
        };
      } catch (error) {
        console.error('❌ [X] Publishing failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error : new Error('X publishing failed'),
        };
      }
    };
  }

  /**
   * Create handler for successful publishing
   */
  private createPublishSuccessHandler() {
    return async (scheduledPostId: string, externalPostId: string, platform: string) => {
      console.log(`✅ [Database] Marking post ${scheduledPostId} as published on ${platform}`);
      
      try {
        // Update scheduled post
        await this.prisma.scheduledPost.update({
          where: { id: scheduledPostId },
          data: {
            status: 'published',
            externalPostId,
            lastAttempt: new Date(),
            errorMessage: null,
          },
        });

        // Update original post if it exists
        const scheduledPost = await this.prisma.scheduledPost.findUnique({
          where: { id: scheduledPostId },
        });

        if (scheduledPost?.postId) {
          await this.prisma.post.update({
            where: { id: scheduledPost.postId },
            data: {
              status: 'published',
            },
          });
        }

        console.log(`✅ [Database] Post ${scheduledPostId} marked as published`);
      } catch (error) {
        console.error(`❌ [Database] Failed to mark post ${scheduledPostId} as published:`, error);
        throw error;
      }
    };
  }

  /**
   * Create handler for failed publishing
   */
  private createPublishFailureHandler() {
    return async (scheduledPostId: string, error: string, attemptNumber: number) => {
      console.log(`⚠️ [Database] Recording failure for post ${scheduledPostId} (attempt ${attemptNumber})`);
      
      try {
        const scheduledPost = await this.prisma.scheduledPost.findUnique({
          where: { id: scheduledPostId },
        });

        if (!scheduledPost) {
          console.warn(`⚠️ [Database] Scheduled post ${scheduledPostId} not found`);
          return;
        }

        const maxRetries = parseInt(process.env.WORKER_RETRY_ATTEMPTS || '3', 10);
        const isFinalFailure = attemptNumber >= maxRetries;

        // Update scheduled post
        await this.prisma.scheduledPost.update({
          where: { id: scheduledPostId },
          data: {
            status: isFinalFailure ? 'failed' : 'pending',
            retryCount: attemptNumber,
            lastAttempt: new Date(),
            errorMessage: error,
          },
        });

        // If final failure, reset original post status
        if (isFinalFailure && scheduledPost.postId) {
          await this.prisma.post.update({
            where: { id: scheduledPost.postId },
            data: {
              status: 'approved', // Reset to approved so it can be rescheduled
            },
          });
        }

        console.log(`✅ [Database] Failure recorded for post ${scheduledPostId}`);
      } catch (dbError) {
        console.error(`❌ [Database] Failed to record failure for post ${scheduledPostId}:`, dbError);
        throw dbError;
      }
    };
  }

  /**
   * Get current processing statistics
   */
  async getStats(): Promise<any> {
    try {
      return await this.queueManager.getStats();
    } catch (error) {
      console.error('❌ [QueueProcessor] Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: any;
  }> {
    try {
      const health = await this.queueManager.healthCheck();
      const stats = await this.getStats();
      
      return {
        healthy: health.redis && health.processors.publisher,
        details: {
          ...health,
          stats,
        },
      };
    } catch (error) {
      console.error('❌ [QueueProcessor] Health check failed:', error);
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Stop processing jobs
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('⚠️ [QueueProcessor] Not running');
      return;
    }

    console.log('🛑 [QueueProcessor] Stopping job processing...');
    
    try {
      await this.queueManager.shutdown();
      this.isRunning = false;
      console.log('✅ [QueueProcessor] Stopped successfully');
    } catch (error) {
      console.error('❌ [QueueProcessor] Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Pause processing
   */
  async pause(): Promise<void> {
    console.log('⏸️ [QueueProcessor] Pausing job processing...');
    await this.queueManager.pauseAll();
    console.log('✅ [QueueProcessor] Paused');
  }

  /**
   * Resume processing
   */
  async resume(): Promise<void> {
    console.log('▶️ [QueueProcessor] Resuming job processing...');
    await this.queueManager.resumeAll();
    console.log('✅ [QueueProcessor] Resumed');
  }
}