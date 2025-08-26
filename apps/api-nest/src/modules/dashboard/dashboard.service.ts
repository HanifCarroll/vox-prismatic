import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(): Promise<DashboardDataEntity> {
    this.logger.log('Getting comprehensive dashboard data');

    try {
      // Get all data in parallel for better performance
      const [
        transcripts,
        insights,
        posts,
        scheduledPosts
      ] = await Promise.all([
        this.prisma.transcript.findMany({
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.insight.findMany({
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.post.findMany({
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.scheduledPost.findMany({
          orderBy: { createdAt: 'desc' }
        })
      ]);

      // Initialize counters
      const transcriptsByStatus: Record<string, number> = {};
      const insightsByStatus: Record<string, number> = {};
      const postsByStatus: Record<string, number> = {};
      const scheduledByPlatform: Record<string, number> = {};

      // Count transcripts by status
      transcripts.forEach(t => {
        transcriptsByStatus[t.status] = (transcriptsByStatus[t.status] || 0) + 1;
      });

      // Count insights by status
      insights.forEach(i => {
        insightsByStatus[i.status] = (insightsByStatus[i.status] || 0) + 1;
      });

      // Count posts by status
      posts.forEach(p => {
        postsByStatus[p.status] = (postsByStatus[p.status] || 0) + 1;
      });

      // Count scheduled posts by platform and upcoming 24h
      let upcoming24h = 0;
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      scheduledPosts.forEach(s => {
        scheduledByPlatform[s.platform] = (scheduledByPlatform[s.platform] || 0) + 1;
        
        const scheduledTime = new Date(s.scheduledTime);
        if (scheduledTime >= now && scheduledTime <= next24h && s.status === 'pending') {
          upcoming24h++;
        }
      });

      // Build counts object
      const counts: DashboardCountsEntity = {
        transcripts: {
          total: transcripts.length,
          byStatus: transcriptsByStatus
        },
        insights: {
          total: insights.length,
          byStatus: insightsByStatus
        },
        posts: {
          total: posts.length,
          byStatus: postsByStatus
        },
        scheduled: {
          total: scheduledPosts.length,
          byPlatform: scheduledByPlatform,
          upcoming24h: upcoming24h
        }
      };

      // Build activity feed (recent items across all types)
      const activity: DashboardActivityEntity[] = [];
      
      // Add recent insights
      insights
        .slice(0, 5)
        .forEach(insight => {
          activity.push({
            id: insight.id,
            type: 'insight_created',
            title: insight.title,
            timestamp: insight.createdAt.toISOString(),
            status: insight.status
          });
        });

      // Add recent posts
      posts
        .slice(0, 5)
        .forEach(post => {
          activity.push({
            id: post.id,
            type: 'post_created',
            title: post.title,
            timestamp: post.createdAt.toISOString(),
            status: post.status
          });
        });

      // Add recent scheduled posts
      scheduledPosts
        .slice(0, 5)
        .forEach(scheduled => {
          activity.push({
            id: scheduled.id,
            type: scheduled.status === 'published' ? 'post_published' : 'post_scheduled',
            title: scheduled.content.substring(0, 50) + (scheduled.content.length > 50 ? '...' : ''),
            timestamp: scheduled.createdAt.toISOString(),
            status: scheduled.status
          });
        });

      // Sort activity by timestamp (most recent first) and limit to 10 items
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const recentActivity = activity.slice(0, 10);

      const dashboardData: DashboardDataEntity = {
        counts,
        activity: recentActivity
      };

      this.logger.log(`Dashboard data compiled - ${transcripts.length} transcripts, ${insights.length} insights, ${posts.length} posts, ${scheduledPosts.length} scheduled`);
      return dashboardData;
    } catch (error) {
      this.logger.error('Failed to get dashboard data', error);
      throw error;
    }
  }

  async getDashboardStats(): Promise<DashboardStatsEntity> {
    this.logger.log('Getting dashboard statistics');

    try {
      // Get counts for all entities
      const [
        transcriptCount,
        insightCount,
        postCount,
        scheduledPostCount
      ] = await Promise.all([
        this.prisma.transcript.count(),
        this.prisma.insight.count(),
        this.prisma.post.count(),
        this.prisma.scheduledPost.count()
      ]);

      const stats: DashboardStatsEntity = {
        transcripts: { count: transcriptCount },
        insights: { count: insightCount },
        posts: { count: postCount },
        scheduledPosts: { count: scheduledPostCount }
      };

      this.logger.log(`Dashboard stats - transcripts: ${transcriptCount}, insights: ${insightCount}, posts: ${postCount}, scheduled: ${scheduledPostCount}`);
      return stats;
    } catch (error) {
      this.logger.error('Failed to get dashboard stats', error);
      throw error;
    }
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStatistics(): Promise<DashboardStatistics> {
    this.logger.log('Getting comprehensive dashboard statistics');

    // Get all required data
    const [posts, scheduledPosts, transcripts, insights] = await Promise.all([
      this.prisma.post.findMany(),
      this.prisma.scheduledPost.findMany(),
      this.prisma.transcript.count(),
      this.prisma.insight.count()
    ]);

    // Calculate posts statistics
    const postsByStatus: Record<string, number> = {};
    const postsByPlatform: Record<string, number> = {};
    
    posts.forEach(post => {
      postsByStatus[post.status] = (postsByStatus[post.status] || 0) + 1;
      postsByPlatform[post.platform] = (postsByPlatform[post.platform] || 0) + 1;
    });

    // Calculate scheduled posts statistics
    let pending = 0;
    let published = 0;
    let failed = 0;
    let upcoming24h = 0;
    
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    scheduledPosts.forEach(sp => {
      if (sp.status === 'pending') pending++;
      if (sp.status === 'published') published++;
      if (sp.status === 'failed') failed++;
      
      const scheduledTime = new Date(sp.scheduledTime);
      if (sp.status === 'pending' && scheduledTime >= now && scheduledTime <= next24h) {
        upcoming24h++;
      }
    });

    // Calculate average posts per insight
    const averagePostsPerInsight = insights > 0 ? Math.round((posts.length / insights) * 10) / 10 : 0;

    return {
      posts: {
        total: posts.length,
        byStatus: postsByStatus,
        byPlatform: postsByPlatform
      },
      scheduled: {
        total: scheduledPosts.length,
        pending,
        published,
        failed,
        upcoming24h
      },
      content: {
        transcripts,
        insights,
        averagePostsPerInsight
      }
    };
  }

  /**
   * Get activity feed for dashboard
   */
  async getActivityFeed(limit: number = 20): Promise<ActivityFeedItem[]> {
    this.logger.log(`Getting activity feed with limit ${limit}`);
    
    const activities: ActivityFeedItem[] = [];

    // Get recent items
    const [posts, scheduledPosts, insights, transcripts] = await Promise.all([
      this.prisma.post.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.scheduledPost.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.insight.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.transcript.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Add posts to activities
    posts.forEach(post => {
      activities.push({
        id: `post_${post.id}`,
        type: 'post_created',
        title: `Post created: ${post.title}`,
        description: `New ${post.platform} post created`,
        timestamp: post.createdAt.toISOString(),
        metadata: { postId: post.id, platform: post.platform }
      });
    });

    // Add scheduled posts to activities
    scheduledPosts.forEach(scheduled => {
      let activityType: ActivityFeedItem['type'] = 'post_scheduled';
      let title = `Post scheduled for ${scheduled.platform}`;
      
      if (scheduled.status === 'published') {
        activityType = 'post_published';
        title = `Post published to ${scheduled.platform}`;
      } else if (scheduled.status === 'failed') {
        activityType = 'post_failed';
        title = `Post failed to publish to ${scheduled.platform}`;
      }

      activities.push({
        id: `scheduled_${scheduled.id}`,
        type: activityType,
        title,
        description: `Scheduled for ${new Date(scheduled.scheduledTime).toLocaleString()}`,
        timestamp: scheduled.updatedAt.toISOString(),
        metadata: { 
          scheduledPostId: scheduled.id,
          postId: scheduled.postId,
          platform: scheduled.platform
        }
      });
    });

    // Add insights to activities
    insights.forEach(insight => {
      activities.push({
        id: `insight_${insight.id}`,
        type: 'insight_created',
        title: `Insight created: ${insight.title}`,
        description: `Category: ${insight.category}`,
        timestamp: insight.createdAt.toISOString(),
        metadata: { insightId: insight.id, category: insight.category }
      });
    });

    // Add transcripts to activities
    transcripts.forEach(transcript => {
      activities.push({
        id: `transcript_${transcript.id}`,
        type: 'transcript_created',
        title: `Transcript created: ${transcript.title}`,
        description: `Source: ${transcript.sourceType}`,
        timestamp: transcript.createdAt.toISOString(),
        metadata: { transcriptId: transcript.id, sourceType: transcript.sourceType }
      });
    });

    // Sort all activities by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, limit);
  }

  /**
   * Get platform distribution statistics
   */
  async getPlatformDistribution(): Promise<Record<string, {
    total: number;
    published: number;
    pending: number;
    failed: number;
  }>> {
    this.logger.log('Getting platform distribution');

    const [posts, scheduledPosts] = await Promise.all([
      this.prisma.post.findMany(),
      this.prisma.scheduledPost.findMany()
    ]);

    const platformStats: Record<string, {
      total: number;
      published: number;
      pending: number;
      failed: number;
    }> = {};

    // Count posts by platform
    posts.forEach(post => {
      if (!platformStats[post.platform]) {
        platformStats[post.platform] = {
          total: 0,
          published: 0,
          pending: 0,
          failed: 0
        };
      }
      platformStats[post.platform].total++;
    });

    // Count scheduled posts by platform and status
    scheduledPosts.forEach(scheduled => {
      if (!platformStats[scheduled.platform]) {
        platformStats[scheduled.platform] = {
          total: 0,
          published: 0,
          pending: 0,
          failed: 0
        };
      }
      
      if (scheduled.status === 'published') {
        platformStats[scheduled.platform].published++;
      } else if (scheduled.status === 'pending') {
        platformStats[scheduled.platform].pending++;
      } else if (scheduled.status === 'failed') {
        platformStats[scheduled.platform].failed++;
      }
    });

    return platformStats;
  }

  /**
   * Get post performance metrics
   */
  async getPostPerformance(options?: {
    platform?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    limit?: number;
  }): Promise<PostPerformanceMetrics[]> {
    this.logger.log('Getting post performance metrics');

    const where: any = {};
    
    if (options?.platform) {
      where.platform = options.platform;
    }

    if (options?.dateRange) {
      where.createdAt = {
        gte: new Date(options.dateRange.start),
        lte: new Date(options.dateRange.end)
      };
    }

    const posts = await this.prisma.post.findMany({
      where,
      take: options?.limit,
      include: {
        scheduledPosts: true
      }
    });

    const performance: PostPerformanceMetrics[] = [];

    posts.forEach(post => {
      const scheduledPost = post.scheduledPosts?.[0];
      
      const metrics: PostPerformanceMetrics = {
        postId: post.id,
        title: post.title,
        platform: post.platform,
        status: post.status,
        retryCount: scheduledPost?.retryCount || 0
      };

      if (scheduledPost) {
        metrics.scheduledTime = scheduledPost.scheduledTime.toISOString();
        metrics.externalPostId = scheduledPost.externalPostId || undefined;
        
        if (scheduledPost.status === 'published') {
          metrics.publishedTime = scheduledPost.lastAttempt?.toISOString();
        }
      }

      // TODO: Add engagement metrics when social media APIs support it
      
      performance.push(metrics);
    });

    return performance;
  }

  /**
   * Get content pipeline health metrics
   */
  async getPipelineHealth(): Promise<{
    transcriptsProcessing: number;
    insightsNeedingReview: number;
    postsAwaitingApproval: number;
    scheduledPostsPending: number;
    failedPosts: number;
  }> {
    this.logger.log('Getting pipeline health metrics');

    const [
      transcriptsProcessing,
      insightsNeedingReview,
      postsAwaitingApproval,
      scheduledPostsPending,
      failedPosts
    ] = await Promise.all([
      this.prisma.transcript.count({ where: { status: 'processing' } }),
      this.prisma.insight.count({ where: { status: 'extracted' } }),
      this.prisma.post.count({ where: { status: 'draft' } }),
      this.prisma.scheduledPost.count({ where: { status: 'pending' } }),
      this.prisma.scheduledPost.count({ where: { status: 'failed' } })
    ]);

    return {
      transcriptsProcessing,
      insightsNeedingReview,
      postsAwaitingApproval,
      scheduledPostsPending,
      failedPosts
    };
  }

  /**
   * Get posts grouped by their current stage/status
   */
  async getPostsByStage(): Promise<Record<string, any[]>> {
    this.logger.log('Getting posts by stage');

    const posts = await this.prisma.post.findMany({
      include: {
        insight: true
      }
    });

    const postsByStage: Record<string, any[]> = {};
    
    posts.forEach(post => {
      const stage = post.status || 'unknown';
      if (!postsByStage[stage]) {
        postsByStage[stage] = [];
      }
      postsByStage[stage].push(post);
    });

    return postsByStage;
  }
}