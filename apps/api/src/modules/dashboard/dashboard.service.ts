import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import {
  DashboardDataEntity,
  DashboardCountsEntity,
  DashboardActivityEntity,
  DashboardStatsEntity,
  DashboardItemCount,
  DashboardScheduledCount,
  ItemCount
} from './entities';

interface DashboardStatistics {
  posts: {
    total: number;
    byStatus: Record<string, number>;
    byPlatform: Record<string, number>;
  };
  scheduled: {
    total: number;
    pending: number;
    published: number;
    failed: number;
    upcoming24h: number;
  };
  content: {
    transcripts: number;
    insights: number;
    averagePostsPerInsight: number;
  };
}

interface ActivityFeedItem {
  id: string;
  type: 'post_created' | 'post_scheduled' | 'post_published' | 'post_failed' | 'insight_created' | 'transcript_created';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface PostPerformanceMetrics {
  postId: string;
  title: string;
  platform: string;
  status: string;
  scheduledTime?: string;
  publishedTime?: string;
  externalPostId?: string;
  retryCount: number;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STATS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Get comprehensive dashboard data with efficient aggregations and caching
   */
  async getDashboardData(): Promise<DashboardDataEntity> {
    return this.cacheService.getOrSet(
      'dashboard:data',
      async () => {
        this.logger.log('Fetching fresh dashboard data');
        
        const [counts, activity, stats, workflowPipeline] = await Promise.all([
          this.getCounts(),
          this.getActivity(),
          this.getStats(),
          this.getWorkflowPipelineStats()
        ]);

        return {
          counts,
          activity,  // Now directly an array
          stats,
          workflowPipeline
        };
      },
      this.CACHE_TTL
    );
  }

  /**
   * Get dashboard counts using efficient aggregations
   */
  async getCounts(): Promise<DashboardCountsEntity> {
    return this.cacheService.getOrSet(
      'dashboard:counts',
      async () => {
        this.logger.log('Getting dashboard counts with aggregations');

        // Use database aggregations instead of loading all records
        const [
          transcriptCounts,
          insightCounts,
          postCounts,
          scheduledCounts
        ] = await Promise.all([
          this.getTranscriptCounts(),
          this.getInsightCounts(),
          this.getPostCounts(),
          this.getScheduledPostCounts()
        ]);

        return {
          transcripts: transcriptCounts,
          insights: insightCounts,
          posts: postCounts,
          scheduled: scheduledCounts  // Fix property name
        };
      },
      this.STATS_CACHE_TTL
    );
  }

  /**
   * Get transcript counts by status
   */
  private async getTranscriptCounts(): Promise<DashboardItemCount> {
    const counts = await this.prisma.transcript.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    // Initialize with all possible transcript statuses
    const byStatus: Record<string, number> = {
      raw: 0,
      processing: 0,
      cleaned: 0,
      insights_generated: 0,
      posts_created: 0,
      error: 0
    };

    // Fill in actual counts
    counts.forEach(item => {
      byStatus[item.status] = item._count._all;
    });

    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    return {
      total,
      byStatus
    } as DashboardItemCount;
  }

  /**
   * Get insight counts by status
   */
  private async getInsightCounts(): Promise<DashboardItemCount> {
    const counts = await this.prisma.insight.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    // Initialize with all possible insight statuses
    const byStatus: Record<string, number> = {
      draft: 0,
      needs_review: 0,
      approved: 0,
      rejected: 0,
      archived: 0
    };

    // Fill in actual counts
    counts.forEach(item => {
      byStatus[item.status] = item._count._all;
    });

    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    return {
      total,
      byStatus
    } as DashboardItemCount;
  }

  /**
   * Get post counts by status
   */
  private async getPostCounts(): Promise<DashboardItemCount> {
    const counts = await this.prisma.post.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    // Initialize with all possible post statuses
    const byStatus: Record<string, number> = {
      draft: 0,
      needs_review: 0,
      approved: 0,
      scheduled: 0,
      published: 0,
      failed: 0,
      archived: 0
    };

    // Fill in actual counts
    counts.forEach(item => {
      byStatus[item.status] = item._count._all;
    });

    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    return {
      total,
      byStatus
    } as DashboardItemCount;
  }

  /**
   * Get scheduled post counts with platform breakdown
   */
  private async getScheduledPostCounts(): Promise<DashboardScheduledCount> {
    // Get counts by status
    const statusCounts = await this.prisma.scheduledPost.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    // Get counts by platform
    const platformCounts = await this.prisma.scheduledPost.groupBy({
      by: ['platform'],
      _count: { _all: true }
    });

    const byPlatform = platformCounts.reduce((acc, item) => {
      acc[item.platform] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    // Get upcoming count (next 24 hours)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingCount = await this.prisma.scheduledPost.count({
      where: {
        scheduledTime: {
          gte: new Date(),
          lte: tomorrow
        },
        status: 'pending'
      }
    });

    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    return {
      total,
      byPlatform,
      upcoming24h: upcomingCount
    } as DashboardScheduledCount;
  }

  /**
   * Get recent activity with pagination
   */
  async getActivity(limit: number = 10): Promise<DashboardActivityEntity[]> {
    const cacheKey = `dashboard:activity:${limit}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.log(`Getting recent activity (limit: ${limit})`);

        // Fetch recent items from each table with proper limits
        const [
          recentPosts,
          recentScheduled,
          recentInsights,
          recentTranscripts
        ] = await Promise.all([
          this.prisma.post.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              status: true,
              platform: true,
              createdAt: true,
              updatedAt: true
            }
          }),
          this.prisma.scheduledPost.findMany({
            take: limit,
            orderBy: { updatedAt: 'desc' },
            where: {
              status: { in: ['published', 'failed'] }
            },
            select: {
              id: true,
              postId: true,
              platform: true,
              status: true,
              scheduledTime: true,
              updatedAt: true,
              post: {
                select: { title: true }
              }
            }
          }),
          this.prisma.insight.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              status: true,
              category: true,
              createdAt: true
            }
          }),
          this.prisma.transcript.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              status: true,
              sourceType: true,
              createdAt: true
            }
          })
        ]);

        // Build activity feed with more meaningful state transitions
        const activities: ActivityFeedItem[] = [];

        // Add post activities with better context
        recentPosts.forEach(post => {
          let description = '';
          if (post.status === 'needs_review') {
            description = `New ${post.platform} post ready for review`;
          } else if (post.status === 'approved') {
            description = `${post.platform} post approved and ready to schedule`;
          } else if (post.status === 'scheduled') {
            description = `${post.platform} post scheduled for publication`;
          } else {
            description = `${post.platform} post status: ${post.status}`;
          }

          activities.push({
            id: post.id,
            type: 'post_created',
            title: post.title,
            description,
            timestamp: post.updatedAt.toISOString(),
            metadata: {
              platform: post.platform,
              status: post.status
            }
          });
        });

        // Add scheduled post activities with context
        recentScheduled.forEach(scheduled => {
          const type = scheduled.status === 'published' ? 'post_published' : 'post_failed';
          const description = scheduled.status === 'published' 
            ? `Successfully published on ${scheduled.platform}`
            : `⚠️ Failed to publish on ${scheduled.platform} - needs attention`;

          activities.push({
            id: scheduled.id,
            type,
            title: scheduled.post?.title || 'Unknown Post',
            description,
            timestamp: scheduled.updatedAt.toISOString(),
            metadata: {
              platform: scheduled.platform,
              scheduledTime: scheduled.scheduledTime,
              isFailure: scheduled.status === 'failed'
            }
          });
        });

        // Add insight activities with workflow context
        recentInsights.forEach(insight => {
          let description = '';
          if (insight.status === 'needs_review') {
            description = `${insight.category} insight ready for review`;
          } else if (insight.status === 'approved') {
            description = `${insight.category} insight approved - ready for post generation`;
          } else if (insight.status === 'rejected') {
            description = `${insight.category} insight rejected`;
          } else {
            description = `${insight.category} insight: ${insight.status}`;
          }

          activities.push({
            id: insight.id,
            type: 'insight_created',
            title: insight.title,
            description,
            timestamp: insight.createdAt.toISOString(),
            metadata: {
              category: insight.category,
              status: insight.status
            }
          });
        });

        // Add transcript activities with workflow status
        recentTranscripts.forEach(transcript => {
          let description = '';
          if (transcript.status === 'raw') {
            description = `New ${transcript.sourceType || 'text'} transcript needs cleaning`;
          } else if (transcript.status === 'cleaned') {
            description = `${transcript.sourceType || 'Text'} transcript cleaned - ready for insights`;
          } else if (transcript.status === 'processing') {
            description = `Processing ${transcript.sourceType || 'text'} transcript...`;
          } else if (transcript.status === 'insights_generated') {
            description = `Insights generated from ${transcript.sourceType || 'text'} transcript`;
          } else {
            description = `${transcript.sourceType || 'Text'} transcript: ${transcript.status}`;
          }

          activities.push({
            id: transcript.id,
            type: 'transcript_created',
            title: transcript.title || 'Untitled Transcript',
            description,
            timestamp: transcript.createdAt.toISOString(),
            metadata: {
              sourceType: transcript.sourceType,
              status: transcript.status
            }
          });
        });

        // Sort by priority (failures first) then by timestamp
        activities.sort((a, b) => {
          // Prioritize failures and items needing attention
          const aPriority = a.metadata?.isFailure || a.description.includes('needs') ? 1 : 0;
          const bPriority = b.metadata?.isFailure || b.description.includes('needs') ? 1 : 0;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
          }
          
          // Then sort by timestamp (most recent first)
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        const recentActivity = activities.slice(0, limit);

        // Map to match DashboardActivityEntity structure
        return recentActivity.map(activity => ({
          id: activity.id,
          type: activity.type as any,
          title: activity.title,
          timestamp: activity.timestamp,
          status: activity.metadata?.status || 'unknown'
        }));
      },
      this.STATS_CACHE_TTL
    );
  }

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStatsEntity> {
    return this.cacheService.getOrSet(
      'dashboard:stats',
      async () => {
        this.logger.log('Getting dashboard statistics');

        // Get counts for the stats entity
        const [transcriptCount, insightCount, postCount, scheduledCount] = await Promise.all([
          this.prisma.transcript.count(),
          this.prisma.insight.count(),
          this.prisma.post.count(),
          this.prisma.scheduledPost.count()
        ]);

        return {
          transcripts: { count: transcriptCount },
          insights: { count: insightCount },
          posts: { count: postCount },
          scheduledPosts: { count: scheduledCount }
        } as DashboardStatsEntity;
      },
      this.CACHE_TTL
    );
  }

  /**
   * Get workflow-based pipeline statistics
   * Shows content as it flows through the actual workflow stages
   */
  async getWorkflowPipelineStats(): Promise<any> {
    return this.cacheService.getOrSet(
      'dashboard:workflow-pipeline',
      async () => {
        this.logger.log('Getting workflow pipeline statistics');

        // Calculate date for "published this week"
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const [
          rawInputCount,
          processingTranscripts,
          insightsNeedingReview,
          postsNeedingReview,
          approvedPosts,
          scheduledPosts,
          publishedThisWeek
        ] = await Promise.all([
          // Raw Input: Transcripts that need cleaning
          this.prisma.transcript.count({
            where: { status: 'raw' }
          }),
          
          // Processing: Transcripts being processed
          this.prisma.transcript.count({
            where: { status: 'processing' }
          }),
          
          // Review Queue: Insights needing review
          this.prisma.insight.count({
            where: { status: 'needs_review' }
          }),
          
          // Review Queue: Posts needing review
          this.prisma.post.count({
            where: { status: 'needs_review' }
          }),
          
          // Approved: Posts ready to schedule
          this.prisma.post.count({
            where: { status: 'approved' }
          }),
          
          // Scheduled: Posts scheduled for publication
          this.prisma.post.count({
            where: { status: 'scheduled' }
          }),
          
          // Published: Successfully published in the last week
          this.prisma.scheduledPost.count({
            where: {
              status: 'published',
              updatedAt: {
                gte: oneWeekAgo
              }
            }
          })
        ]);

        return {
          rawInput: rawInputCount,
          processing: processingTranscripts,
          insightsReview: insightsNeedingReview,
          postsReview: postsNeedingReview,
          approved: approvedPosts,
          scheduled: scheduledPosts,
          published: publishedThisWeek
        };
      },
      this.STATS_CACHE_TTL
    );
  }

  /**
   * Calculate dashboard statistics using aggregations
   */
  private async calculateStatistics(): Promise<DashboardStatistics> {
    // Get post statistics
    const [
      postStatusCounts,
      postPlatformCounts,
      totalPosts
    ] = await Promise.all([
      this.prisma.post.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      this.prisma.post.groupBy({
        by: ['platform'],
        _count: { _all: true }
      }),
      this.prisma.post.count()
    ]);

    const postsByStatus = postStatusCounts.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    const postsByPlatform = postPlatformCounts.reduce((acc, item) => {
      acc[item.platform] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    // Get scheduled post statistics
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      scheduledTotal,
      scheduledPending,
      scheduledPublished,
      scheduledFailed,
      upcomingCount
    ] = await Promise.all([
      this.prisma.scheduledPost.count(),
      this.prisma.scheduledPost.count({ where: { status: 'pending' } }),
      this.prisma.scheduledPost.count({ where: { status: 'published' } }),
      this.prisma.scheduledPost.count({ where: { status: 'failed' } }),
      this.prisma.scheduledPost.count({
        where: {
          scheduledTime: { gte: new Date(), lte: tomorrow },
          status: 'pending'
        }
      })
    ]);

    // Get content statistics
    const [transcriptCount, insightCount] = await Promise.all([
      this.prisma.transcript.count(),
      this.prisma.insight.count()
    ]);

    // Calculate average posts per insight
    const averagePostsPerInsight = insightCount > 0 ? totalPosts / insightCount : 0;

    return {
      posts: {
        total: totalPosts,
        byStatus: postsByStatus,
        byPlatform: postsByPlatform
      },
      scheduled: {
        total: scheduledTotal,
        pending: scheduledPending,
        published: scheduledPublished,
        failed: scheduledFailed,
        upcoming24h: upcomingCount
      },
      content: {
        transcripts: transcriptCount,
        insights: insightCount,
        averagePostsPerInsight: Math.round(averagePostsPerInsight * 100) / 100
      }
    };
  }

  /**
   * Get top performing posts
   */
  private async getTopPerformingPosts(limit: number = 5): Promise<PostPerformanceMetrics[]> {
    const scheduledPosts = await this.prisma.scheduledPost.findMany({
      where: { status: 'published' },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        post: {
          select: {
            title: true,
            platform: true,
            status: true
          }
        }
      }
    });

    return scheduledPosts.map(sp => ({
      postId: sp.postId,
      title: sp.post.title,
      platform: sp.platform,
      status: sp.status,
      scheduledTime: sp.scheduledTime?.toISOString(),
      publishedTime: undefined,  // No publishedAt field in schema
      externalPostId: sp.externalPostId || undefined,
      retryCount: sp.retryCount,
      engagement: {
        // These would come from external platform APIs
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0
      }
    }));
  }

  /**
   * Invalidate dashboard cache
   * Call this when data is mutated
   */
  async invalidateCache(): Promise<void> {
    await this.cacheService.deletePattern('^dashboard:');
    this.logger.log('Dashboard cache invalidated');
  }
}