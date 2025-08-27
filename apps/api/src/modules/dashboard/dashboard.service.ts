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
        
        const [counts, activity, stats] = await Promise.all([
          this.getCounts(),
          this.getActivity(),
          this.getStats()
        ]);

        return {
          counts,
          activity,  // Now directly an array
          stats
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

    const byStatus = counts.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

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

    const byStatus = counts.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

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

    const byStatus = counts.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

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

        // Build activity feed
        const activities: ActivityFeedItem[] = [];

        // Add post activities
        recentPosts.forEach(post => {
          activities.push({
            id: post.id,
            type: 'post_created',
            title: post.title,
            description: `New ${post.platform} post created`,
            timestamp: post.createdAt.toISOString(),
            metadata: {
              platform: post.platform,
              status: post.status
            }
          });
        });

        // Add scheduled post activities
        recentScheduled.forEach(scheduled => {
          const type = scheduled.status === 'published' ? 'post_published' : 'post_failed';
          const description = scheduled.status === 'published' 
            ? `Post published on ${scheduled.platform}`
            : `Failed to publish on ${scheduled.platform}`;

          activities.push({
            id: scheduled.id,
            type,
            title: scheduled.post?.title || 'Unknown Post',
            description,
            timestamp: scheduled.updatedAt.toISOString(),
            metadata: {
              platform: scheduled.platform,
              scheduledTime: scheduled.scheduledTime
            }
          });
        });

        // Add insight activities
        recentInsights.forEach(insight => {
          activities.push({
            id: insight.id,
            type: 'insight_created',
            title: insight.title,
            description: `New ${insight.category} insight extracted`,
            timestamp: insight.createdAt.toISOString(),
            metadata: {
              category: insight.category,
              status: insight.status
            }
          });
        });

        // Add transcript activities
        recentTranscripts.forEach(transcript => {
          activities.push({
            id: transcript.id,
            type: 'transcript_created',
            title: transcript.title || 'Untitled Transcript',
            description: `New ${transcript.sourceType} transcript added`,
            timestamp: transcript.createdAt.toISOString(),
            metadata: {
              sourceType: transcript.sourceType,
              status: transcript.status
            }
          });
        });

        // Sort by timestamp and limit
        activities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

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