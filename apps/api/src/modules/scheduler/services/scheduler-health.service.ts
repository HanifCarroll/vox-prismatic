import { Injectable, Logger } from '@nestjs/common';
import { SchedulerQueueService } from './scheduler-queue.service';
import { ScheduledPostRepository } from '../scheduled-post.repository';
import { ScheduledPostStatus } from '@content-creation/types';

/**
 * Service for monitoring the health and status of the scheduler system
 * Provides diagnostics and monitoring capabilities for the scheduler-queue integration
 */
@Injectable()
export class SchedulerHealthService {
  private readonly logger = new Logger(SchedulerHealthService.name);

  constructor(
    private readonly schedulerQueueService: SchedulerQueueService,
    private readonly scheduledPostRepository: ScheduledPostRepository,
  ) {}

  /**
   * Comprehensive health check for the scheduler system
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    components: {
      queueConnection: boolean;
      database: boolean;
      pendingPostsCount: number;
      queuedPostsCount: number;
      failedPostsCount: number;
    };
    queueStats: any;
    recommendations: string[];
  }> {
    const components = {
      queueConnection: false,
      database: false,
      pendingPostsCount: 0,
      queuedPostsCount: 0,
      failedPostsCount: 0,
    };

    const recommendations: string[] = [];

    try {
      // Check queue connection
      components.queueConnection = await this.schedulerQueueService.isHealthy();
      if (!components.queueConnection) {
        recommendations.push('Queue connection is unhealthy - check Redis connection');
      }

      // Check database and get post counts
      try {
        const [pendingPosts, queuedPosts, failedPosts] = await Promise.all([
          this.scheduledPostRepository.findByStatus(ScheduledPostStatus.PENDING),
          this.scheduledPostRepository.findByStatus(ScheduledPostStatus.QUEUED),
          this.scheduledPostRepository.findByStatus(ScheduledPostStatus.FAILED),
        ]);

        components.database = true;
        components.pendingPostsCount = pendingPosts.length;
        components.queuedPostsCount = queuedPosts.length;
        components.failedPostsCount = failedPosts.length;

        // Add recommendations based on counts
        if (components.failedPostsCount > 10) {
          recommendations.push(`High number of failed posts (${components.failedPostsCount}) - investigate and retry failed jobs`);
        }

        if (components.pendingPostsCount > 50) {
          recommendations.push(`Large number of pending posts (${components.pendingPostsCount}) - monitor for processing delays`);
        }

        // Check for posts that might be stuck in pending state for too long
        const stuckPosts = await this.findStuckPendingPosts();
        if (stuckPosts.length > 0) {
          recommendations.push(`Found ${stuckPosts.length} posts stuck in pending state - may need manual intervention`);
        }

      } catch (dbError) {
        this.logger.error('Database health check failed:', dbError);
        recommendations.push('Database connectivity issues detected');
      }

      // Get queue statistics
      let queueStats = null;
      try {
        queueStats = await this.schedulerQueueService.getQueueStats();
      } catch (queueError) {
        this.logger.error('Failed to get queue stats:', queueError);
        recommendations.push('Unable to retrieve queue statistics');
      }

      const healthy = components.queueConnection && components.database && recommendations.length === 0;

      return {
        healthy,
        components,
        queueStats,
        recommendations,
      };

    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        healthy: false,
        components,
        queueStats: null,
        recommendations: ['Health check system failure - investigate immediately'],
      };
    }
  }

  /**
   * Find posts that have been stuck in PENDING state for too long
   * These might indicate a problem with the event system or queue integration
   */
  private async findStuckPendingPosts(): Promise<any[]> {
    try {
      // Find posts that are PENDING and scheduled more than 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const stuckPosts = await this.scheduledPostRepository.prisma.scheduledPost.findMany({
        where: {
          status: ScheduledPostStatus.PENDING,
          scheduledTime: {
            lte: fiveMinutesAgo,
          },
        },
        select: {
          id: true,
          scheduledTime: true,
          platform: true,
          createdAt: true,
        },
      });

      return stuckPosts;
    } catch (error) {
      this.logger.error('Failed to find stuck pending posts:', error);
      return [];
    }
  }

  /**
   * Get detailed statistics about the scheduler system
   */
  async getDetailedStats(): Promise<{
    postsByStatus: Record<ScheduledPostStatus, number>;
    queueStats: any;
    recentActivity: {
      postsScheduledLast24h: number;
      postsPublishedLast24h: number;
      postsFailedLast24h: number;
    };
    upcomingPosts: {
      nextHour: number;
      next24Hours: number;
      nextWeek: number;
    };
  }> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Get posts by status
      const statusCounts = await Promise.all(
        Object.values(ScheduledPostStatus).map(async (status) => ({
          status,
          count: await this.scheduledPostRepository.prisma.scheduledPost.count({
            where: { status },
          }),
        }))
      );

      const postsByStatus = statusCounts.reduce((acc, { status, count }) => {
        acc[status as ScheduledPostStatus] = count;
        return acc;
      }, {} as Record<ScheduledPostStatus, number>);

      // Get recent activity
      const [postsScheduledLast24h, postsPublishedLast24h, postsFailedLast24h] = await Promise.all([
        this.scheduledPostRepository.prisma.scheduledPost.count({
          where: {
            createdAt: { gte: yesterday },
          },
        }),
        this.scheduledPostRepository.prisma.scheduledPost.count({
          where: {
            status: ScheduledPostStatus.PUBLISHED,
            updatedAt: { gte: yesterday },
          },
        }),
        this.scheduledPostRepository.prisma.scheduledPost.count({
          where: {
            status: ScheduledPostStatus.FAILED,
            updatedAt: { gte: yesterday },
          },
        }),
      ]);

      // Get upcoming posts
      const [nextHourCount, next24HoursCount, nextWeekCount] = await Promise.all([
        this.scheduledPostRepository.prisma.scheduledPost.count({
          where: {
            status: { in: [ScheduledPostStatus.PENDING, ScheduledPostStatus.QUEUED] },
            scheduledTime: { gte: now, lte: nextHour },
          },
        }),
        this.scheduledPostRepository.prisma.scheduledPost.count({
          where: {
            status: { in: [ScheduledPostStatus.PENDING, ScheduledPostStatus.QUEUED] },
            scheduledTime: { gte: now, lte: tomorrow },
          },
        }),
        this.scheduledPostRepository.prisma.scheduledPost.count({
          where: {
            status: { in: [ScheduledPostStatus.PENDING, ScheduledPostStatus.QUEUED] },
            scheduledTime: { gte: now, lte: nextWeek },
          },
        }),
      ]);

      // Get queue stats
      const queueStats = await this.schedulerQueueService.getQueueStats();

      return {
        postsByStatus,
        queueStats,
        recentActivity: {
          postsScheduledLast24h,
          postsPublishedLast24h,
          postsFailedLast24h,
        },
        upcomingPosts: {
          nextHour: nextHourCount,
          next24Hours: next24HoursCount,
          nextWeek: nextWeekCount,
        },
      };

    } catch (error) {
      this.logger.error('Failed to get detailed stats:', error);
      throw error;
    }
  }

  /**
   * Retry all failed posts that are eligible for retry
   */
  async retryFailedPosts(): Promise<{
    attempted: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Find all failed posts
      const failedPosts = await this.scheduledPostRepository.findByStatus(ScheduledPostStatus.FAILED);
      result.attempted = failedPosts.length;

      this.logger.log(`Attempting to retry ${failedPosts.length} failed posts`);

      for (const post of failedPosts) {
        try {
          // Reset the post to PENDING status so it can be reprocessed
          await this.scheduledPostRepository.prisma.scheduledPost.update({
            where: { id: post.id },
            data: {
              status: ScheduledPostStatus.PENDING,
              retryCount: (post.retryCount || 0) + 1,
              errorMessage: null,
              updatedAt: new Date(),
            },
          });

          result.succeeded++;
          this.logger.debug(`Successfully reset failed post ${post.id} to PENDING`);

        } catch (error) {
          result.failed++;
          const errorMsg = `Failed to retry post ${post.id}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      this.logger.log(`Retry operation completed: ${result.succeeded} succeeded, ${result.failed} failed`);
      return result;

    } catch (error) {
      this.logger.error('Failed to retry failed posts:', error);
      throw error;
    }
  }
}