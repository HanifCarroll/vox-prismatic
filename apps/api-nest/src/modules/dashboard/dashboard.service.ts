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
}