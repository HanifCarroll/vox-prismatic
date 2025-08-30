import { QueueManager, PublishPostProcessorDependencies } from '@content-creation/queue';
import { PrismaClient } from '@prisma/client';
import { Platform, ApiResponse } from '@content-creation/types';

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
    console.log('📅 [QueueProcessor] Jobs will be processed when their scheduled time arrives');
    console.log('🔗 [QueueProcessor] Using API at:', process.env.API_BASE_URL || 'http://localhost:3000');

    // Create dependencies for the publish processor
    const processorDependencies: PublishPostProcessorDependencies = {
      publishToLinkedIn: this.createLinkedInPublisher(),
      publishToX: this.createXPublisher(),
      markPostAsPublished: this.createPublishSuccessHandler(),
      markPostAsFailed: this.createPublishFailureHandler(),
    };

    // Start the publish processor
    // BullMQ will automatically handle delayed jobs and only deliver them when scheduled
    await this.queueManager.startPublishProcessor(processorDependencies, {
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
      maxStalledCount: 1,
    });

    this.isRunning = true;
    console.log('✅ [QueueProcessor] Job processing started');
    console.log('⏰ [QueueProcessor] Waiting for scheduled jobs...');
  }

  /**
   * Create LinkedIn publisher function
   */
  private createLinkedInPublisher() {
    return async (content: string, credentials: any) => {
      console.log('📱 [LinkedIn] Publishing post...');
      console.log('📱 [LinkedIn] Content preview:', content.substring(0, 100) + '...');
      
      try {
        // Call the API service to actually publish to LinkedIn
        const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/social-media/linkedin/post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${credentials.accessToken}`,
          },
          body: JSON.stringify({
            content,
            visibility: 'PUBLIC',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [LinkedIn] API call failed:', response.status, errorText);
          throw new Error(`LinkedIn API returned ${response.status}: ${errorText}`);
        }

        const result = await response.json() as ApiResponse<{ id: string }>;
        
        if (result.success && result.data?.id) {
          console.log('✅ [LinkedIn] Published successfully:', result.data.id);
          return {
            success: true,
            externalPostId: result.data.id,
          };
        } else {
          throw new Error(result.error || 'LinkedIn publishing failed');
        }
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
      console.log('🐦 [X] Content preview:', content.substring(0, 100) + '...');
      
      try {
        // Call the API service to actually publish to X/Twitter
        const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/social-media/x/tweet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${credentials.accessToken}`,
          },
          body: JSON.stringify({
            content,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [X] API call failed:', response.status, errorText);
          throw new Error(`X API returned ${response.status}: ${errorText}`);
        }

        const result = await response.json() as ApiResponse<{ id: string } | Array<{ id: string }>>;
        
        // Handle both single tweet and thread responses
        let externalPostId: string;
        if (result.success && result.data) {
          if (Array.isArray(result.data)) {
            // Thread - use the first tweet's ID
            externalPostId = result.data[0].id;
          } else {
            // Single tweet
            externalPostId = result.data.id;
          }
          
          console.log('✅ [X] Published successfully:', externalPostId);
          return {
            success: true,
            externalPostId,
          };
        } else {
          throw new Error(result.error || 'X publishing failed');
        }
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