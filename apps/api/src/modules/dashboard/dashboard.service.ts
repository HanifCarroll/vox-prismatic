import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { ScheduledPostStatus, TranscriptStatus } from '@content-creation/types';
import {
  DashboardDataEntity,
  DashboardCountsEntity,
  DashboardActivityEntity,
  DashboardStatsEntity,
  DashboardItemCount,
  DashboardScheduledCount,
  ItemCount
} from './entities';
import { 
  DashboardActionableEntity,
  ActionableItemEntity,
  ActionType,
  ActionPriority
} from './entities/dashboard-actionable.entity';
import {
  PublishingScheduleEntity,
  NextPostEntity,
  HourlySlotEntity,
  DailyScheduleEntity
} from './entities/dashboard-schedule.entity';

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

    // Calculate time-based counts
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate start and end of week (Sunday to Saturday)
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Calculate start and end of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Run all count queries in parallel
    const [upcomingCount, todayCount, weekCount, monthCount] = await Promise.all([
      // Next 24 hours
      this.prisma.scheduledPost.count({
        where: {
          scheduledTime: {
            gte: now,
            lte: tomorrow
          },
          status: ScheduledPostStatus.PENDING
        }
      }),
      // Today
      this.prisma.scheduledPost.count({
        where: {
          scheduledTime: {
            gte: startOfToday,
            lte: endOfToday
          },
          status: ScheduledPostStatus.PENDING
        }
      }),
      // This week
      this.prisma.scheduledPost.count({
        where: {
          scheduledTime: {
            gte: startOfWeek,
            lte: endOfWeek
          },
          status: ScheduledPostStatus.PENDING
        }
      }),
      // This month
      this.prisma.scheduledPost.count({
        where: {
          scheduledTime: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          status: ScheduledPostStatus.PENDING
        }
      })
    ]);

    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    return {
      total,
      byPlatform,
      upcoming24h: upcomingCount,
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount
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
          const type = scheduled.status === ScheduledPostStatus.PUBLISHED ? 'post_published' : 'post_failed';
          const description = scheduled.status === ScheduledPostStatus.PUBLISHED 
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
              isFailure: scheduled.status === ScheduledPostStatus.FAILED
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
          if (transcript.status === TranscriptStatus.RAW) {
            description = `New ${transcript.sourceType || 'text'} transcript needs cleaning`;
          } else if (transcript.status === TranscriptStatus.CLEANED) {
            description = `${transcript.sourceType || 'Text'} transcript cleaned - ready for insights`;
          } else if (transcript.status === TranscriptStatus.PROCESSING) {
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
   * Get actionable items that need user attention
   */
  async getActionableItems(): Promise<DashboardActionableEntity> {
    return this.cacheService.getOrSet(
      'dashboard:actionable',
      async () => {
        this.logger.log('Getting actionable items');

        // Fetch all items that need action in parallel
        const [
          failedPosts,
          insightsToReview,
          postsToReview,
          rawTranscripts,
          approvedPosts
        ] = await Promise.all([
          // Failed scheduled posts (URGENT)
          this.prisma.scheduledPost.findMany({
            where: { status: 'failed' },
            include: {
              post: {
                select: { title: true, platform: true }
              }
            },
            orderBy: { updatedAt: 'desc' }
          }),
          // Insights needing review (HIGH)
          this.prisma.insight.findMany({
            where: { status: 'needs_review' },
            select: {
              id: true,
              title: true,
              category: true,
              createdAt: true
            },
            orderBy: { createdAt: 'asc' }, // Oldest first
            take: 20
          }),
          // Posts needing review (HIGH)
          this.prisma.post.findMany({
            where: { status: 'needs_review' },
            select: {
              id: true,
              title: true,
              platform: true,
              createdAt: true
            },
            orderBy: { createdAt: 'asc' }, // Oldest first
            take: 20
          }),
          // Raw transcripts ready to process (MEDIUM)
          this.prisma.transcript.findMany({
            where: { status: 'raw' },
            select: {
              id: true,
              title: true,
              sourceType: true,
              createdAt: true
            },
            orderBy: { createdAt: 'asc' },
            take: 10
          }),
          // Approved posts ready to schedule (MEDIUM)
          this.prisma.post.findMany({
            where: { 
              status: 'approved',
              scheduledPosts: {
                none: {} // Not yet scheduled
              }
            },
            select: {
              id: true,
              title: true,
              platform: true,
              updatedAt: true
            },
            orderBy: { updatedAt: 'desc' },
            take: 10
          })
        ]);

        // Build urgent items (failures)
        const urgent: ActionableItemEntity[] = [];
        
        // Group failed posts by platform
        const failedByPlatform = failedPosts.reduce((acc, scheduled) => {
          const platform = scheduled.post?.platform || 'unknown';
          if (!acc[platform]) {
            acc[platform] = [];
          }
          acc[platform].push(scheduled);
          return acc;
        }, {} as Record<string, typeof failedPosts>);

        // Create actionable items for failed posts
        Object.entries(failedByPlatform).forEach(([platform, items]) => {
          if (items.length > 0) {
            urgent.push({
              id: `failed-${platform}`,
              actionType: ActionType.FIX_FAILED,
              priority: ActionPriority.URGENT,
              title: `${items.length} ${platform} post${items.length > 1 ? 's' : ''} failed to publish`,
              context: items[0].errorMessage || 'Check platform authentication',
              platform,
              actionUrl: `/content?view=posts&status=failed&platform=${platform}`,
              actionLabel: 'Fix Now',
              timestamp: items[0].updatedAt.toISOString(),
              count: items.length
            });
          }
        });

        // Build needs review items
        const needsReview: ActionableItemEntity[] = [];

        // Add insights needing review
        if (insightsToReview.length > 0) {
          needsReview.push({
            id: 'insights-review',
            actionType: ActionType.REVIEW_INSIGHT,
            priority: ActionPriority.HIGH,
            title: `${insightsToReview.length} insight${insightsToReview.length > 1 ? 's' : ''} awaiting review`,
            context: `Oldest: ${insightsToReview[0].title}`,
            actionUrl: '/content?view=insights&status=needs_review',
            actionLabel: 'Review',
            timestamp: insightsToReview[0].createdAt.toISOString(),
            count: insightsToReview.length
          });
        }

        // Add posts needing review
        if (postsToReview.length > 0) {
          needsReview.push({
            id: 'posts-review',
            actionType: ActionType.REVIEW_POST,
            priority: ActionPriority.HIGH,
            title: `${postsToReview.length} post${postsToReview.length > 1 ? 's' : ''} need review`,
            context: `Oldest: ${postsToReview[0].title}`,
            actionUrl: '/content?view=posts&status=needs_review',
            actionLabel: 'Review',
            timestamp: postsToReview[0].createdAt.toISOString(),
            count: postsToReview.length
          });
        }

        // Build ready to process items
        const readyToProcess: ActionableItemEntity[] = [];

        // Add raw transcripts
        if (rawTranscripts.length > 0) {
          readyToProcess.push({
            id: 'transcripts-process',
            actionType: ActionType.PROCESS_TRANSCRIPT,
            priority: ActionPriority.MEDIUM,
            title: `${rawTranscripts.length} transcript${rawTranscripts.length > 1 ? 's' : ''} ready to process`,
            context: `Oldest: ${rawTranscripts[0].title || 'Untitled'}`,
            actionUrl: '/content?view=transcripts&status=raw',
            actionLabel: 'Process',
            timestamp: rawTranscripts[0].createdAt.toISOString(),
            count: rawTranscripts.length
          });
        }

        // Add approved posts ready to schedule
        if (approvedPosts.length > 0) {
          readyToProcess.push({
            id: 'posts-schedule',
            actionType: ActionType.SCHEDULE_POST,
            priority: ActionPriority.MEDIUM,
            title: `${approvedPosts.length} approved post${approvedPosts.length > 1 ? 's' : ''} ready to schedule`,
            context: 'No posts scheduled for today',
            actionUrl: '/scheduler',
            actionLabel: 'Schedule',
            timestamp: approvedPosts[0].updatedAt.toISOString(),
            count: approvedPosts.length
          });
        }

        const totalCount = urgent.length + needsReview.length + readyToProcess.length;

        return {
          urgent,
          needsReview,
          readyToProcess,
          totalCount
        } as DashboardActionableEntity;
      },
      60000 // Cache for 1 minute since this is time-sensitive
    );
  }

  /**
   * Get detailed publishing schedule
   */
  async getPublishingSchedule(): Promise<PublishingScheduleEntity> {
    return this.cacheService.getOrSet(
      'dashboard:publishing-schedule',
      async () => {
        this.logger.log('Getting publishing schedule');

        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        // Calculate week range
        const startOfWeek = new Date(now);
        const dayOfWeek = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Calculate month range
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        // Fetch all scheduled posts for different time ranges
        const [
          nextPost,
          todayPosts,
          weekPosts,
          monthCount
        ] = await Promise.all([
          // Get next scheduled post
          this.prisma.scheduledPost.findFirst({
            where: {
              scheduledTime: { gte: now },
              status: ScheduledPostStatus.PENDING
            },
            orderBy: { scheduledTime: 'asc' },
            include: {
              post: {
                select: { title: true, platform: true }
              }
            }
          }),
          // Get today's posts
          this.prisma.scheduledPost.findMany({
            where: {
              scheduledTime: {
                gte: startOfToday,
                lte: endOfToday
              },
              status: ScheduledPostStatus.PENDING
            },
            orderBy: { scheduledTime: 'asc' },
            include: {
              post: {
                select: { title: true, platform: true }
              }
            }
          }),
          // Get this week's posts
          this.prisma.scheduledPost.findMany({
            where: {
              scheduledTime: {
                gte: startOfWeek,
                lte: endOfWeek
              },
              status: ScheduledPostStatus.PENDING
            },
            orderBy: { scheduledTime: 'asc' },
            include: {
              post: {
                select: { title: true, platform: true }
              }
            }
          }),
          // Count posts this month
          this.prisma.scheduledPost.count({
            where: {
              scheduledTime: {
                gte: startOfMonth,
                lte: endOfMonth
              },
              status: ScheduledPostStatus.PENDING
            }
          })
        ]);

        // Build next post entity
        let nextPostEntity: NextPostEntity | undefined;
        if (nextPost && nextPost.post) {
          const minutesUntil = Math.floor((new Date(nextPost.scheduledTime).getTime() - now.getTime()) / 60000);
          let timeUntil: string;
          
          if (minutesUntil < 60) {
            timeUntil = `in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
          } else if (minutesUntil < 1440) {
            const hours = Math.floor(minutesUntil / 60);
            timeUntil = `in ${hours} hour${hours !== 1 ? 's' : ''}`;
          } else {
            const days = Math.floor(minutesUntil / 1440);
            timeUntil = `in ${days} day${days !== 1 ? 's' : ''}`;
          }

          nextPostEntity = {
            id: nextPost.id,
            title: nextPost.post.title,
            platform: nextPost.post.platform,
            scheduledTime: nextPost.scheduledTime.toISOString(),
            minutesUntil,
            timeUntil
          };
        }

        // Build hourly slots for today
        const todayHourly: HourlySlotEntity[] = [];
        for (let hour = 0; hour < 24; hour++) {
          const hourPosts = todayPosts.filter(sp => {
            const postHour = new Date(sp.scheduledTime).getHours();
            return postHour === hour;
          });

          const label = hour === 0 ? '12:00 AM' : 
                        hour < 12 ? `${hour}:00 AM` :
                        hour === 12 ? '12:00 PM' :
                        `${hour - 12}:00 PM`;

          todayHourly.push({
            hour,
            label,
            posts: hourPosts.map(sp => ({
              id: sp.id,
              platform: sp.post?.platform || 'unknown',
              title: sp.post?.title || 'Untitled'
            })),
            count: hourPosts.length
          });
        }

        // Build daily schedule for the week
        const weekDaily: DailyScheduleEntity[] = [];
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const dayStart = new Date(startOfWeek);
          dayStart.setDate(dayStart.getDate() + dayOffset);
          dayStart.setHours(0, 0, 0, 0);
          
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);

          const dayPosts = weekPosts.filter(sp => {
            const postDate = new Date(sp.scheduledTime);
            return postDate >= dayStart && postDate <= dayEnd;
          });

          // Calculate platform distribution for the day
          const byPlatform = dayPosts.reduce((acc, sp) => {
            const platform = sp.post?.platform || 'unknown';
            acc[platform] = (acc[platform] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          weekDaily.push({
            date: dayStart.toISOString().split('T')[0],
            dayName: daysOfWeek[dayStart.getDay()],
            postCount: dayPosts.length,
            byPlatform,
            isToday: dayStart.toDateString() === now.toDateString(),
            hasGap: dayPosts.length === 0
          });
        }

        // Calculate week platform distribution
        const weekPlatformDistribution = weekPosts.reduce((acc, sp) => {
          const platform = sp.post?.platform || 'unknown';
          acc[platform] = (acc[platform] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Identify scheduling gaps
        const schedulingGaps = weekDaily
          .filter(day => day.hasGap && new Date(day.date) >= now)
          .map(day => day.date);

        // Suggested posting times (static for now, could be based on analytics)
        const suggestedTimes = ['9:00 AM', '12:00 PM', '5:00 PM'];

        return {
          nextPost: nextPostEntity,
          todayHourly,
          weekDaily,
          todayCount: todayPosts.length,
          weekCount: weekPosts.length,
          monthCount,
          weekPlatformDistribution,
          schedulingGaps,
          suggestedTimes
        } as PublishingScheduleEntity;
      },
      60000 // Cache for 1 minute
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
          status: ScheduledPostStatus.PENDING
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