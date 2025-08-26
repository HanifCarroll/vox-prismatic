import * as cron from 'node-cron';
import { WorkerPublisher } from './publisher';

/**
 * Worker Scheduler
 * Manages the cron job that triggers publishing of scheduled posts
 */

export class WorkerScheduler {
  private publisher: WorkerPublisher;
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;
  private lastRun: Date | null = null;
  private stats = {
    totalRuns: 0,
    totalProcessed: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    errors: [] as string[]
  };

  constructor() {
    this.publisher = new WorkerPublisher();
  }

  /**
   * Start the scheduler
   */
  start(): void {
    const interval = process.env.WORKER_INTERVAL_SECONDS || '60';
    const cronExpression = `*/${interval} * * * * *`; // Every N seconds
    
    console.log(`🚀 [Scheduler] Starting with interval: every ${interval} seconds`);
    
    // Validate credentials before starting
    const credentialCheck = this.publisher.validateCredentials();
    if (!credentialCheck.valid) {
      console.warn(`⚠️ [Scheduler] Missing credentials: ${credentialCheck.missing.join(', ')}`);
      console.warn('⚠️ [Scheduler] Worker will start but publishing may fail');
    }

    this.task = cron.schedule(cronExpression, async () => {
      await this.runPublishingCycle();
    }, {
      scheduled: false,
      timezone: "UTC"
    });

    this.task.start();
    console.log('✅ [Scheduler] Started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('🛑 [Scheduler] Stopped');
    }
  }

  /**
   * Run a single publishing cycle
   */
  private async runPublishingCycle(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ [Scheduler] Previous cycle still running, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();
    this.stats.totalRuns++;

    const startTime = Date.now();
    
    try {
      console.log(`🔄 [Scheduler] Running publishing cycle #${this.stats.totalRuns}`);
      
      // Check health before processing
      const health = await this.publisher.healthCheck();
      if (health.status === 'unhealthy') {
        console.error(`❌ [Scheduler] Health check failed: ${health.details}`);
        this.stats.errors.push(`Health check failed: ${health.details}`);
        return;
      }

      if (health.postsDue === 0) {
        console.log('✨ [Scheduler] No posts due for publishing');
        return;
      }

      console.log(`📋 [Scheduler] Found ${health.postsDue} posts due for publishing`);

      // Process scheduled posts
      const result = await this.publisher.processScheduledPosts();
      
      // Update stats
      this.stats.totalProcessed += result.processed;
      this.stats.totalSuccessful += result.successful;
      this.stats.totalFailed += result.failed;
      this.stats.errors.push(...result.errors);

      // Keep only last 50 errors to prevent memory issues
      if (this.stats.errors.length > 50) {
        this.stats.errors = this.stats.errors.slice(-50);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [Scheduler] Cycle completed in ${duration}ms: ${result.successful} successful, ${result.failed} failed`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [Scheduler] Cycle failed after ${duration}ms:`, errorMessage);
      this.stats.errors.push(`Cycle failed: ${errorMessage}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Force run a publishing cycle (for testing/manual trigger)
   */
  async forceRun(): Promise<void> {
    console.log('🚀 [Scheduler] Forcing publishing cycle...');
    await this.runPublishingCycle();
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      ...this.stats,
      recentErrors: this.stats.errors.slice(-5) // Only show last 5 errors
    };
  }

  /**
   * Get scheduler status
   */
  async getStatus() {
    const health = await this.publisher.healthCheck();
    const stats = this.getStats();
    
    return {
      scheduler: {
        running: this.task !== null,
        isProcessing: this.isRunning,
        lastRun: this.lastRun,
        nextRun: this.task ? 'Scheduled' : 'Not scheduled'
      },
      publisher: health,
      statistics: stats
    };
  }
}