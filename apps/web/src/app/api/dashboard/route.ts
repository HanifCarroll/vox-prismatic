import { NextResponse } from 'next/server';
import { 
  initDatabase,
  TranscriptRepository,
  InsightRepository,
  PostRepository,
  ScheduledPostRepository
} from '@content-creation/database';
import type { DashboardData, ApiResponse } from '@/types';

/**
 * Dashboard API - Single endpoint for all dashboard/sidebar data
 * Now uses repository pattern for clean, maintainable data access
 */

async function getDashboardData(): Promise<ApiResponse<DashboardData>> {
  try {
    // Initialize database connection
    initDatabase();
    
    // Create repository instances
    const transcriptRepo = new TranscriptRepository();
    const insightRepo = new InsightRepository();
    const postRepo = new PostRepository();
    const scheduledRepo = new ScheduledPostRepository();
    
    // Execute all dashboard queries in parallel for optimal performance
    const [
      transcriptStats,
      insightStats, 
      postStats,
      scheduledStats,
      recentActivity
    ] = await Promise.all([
      transcriptRepo.getStats(),
      insightRepo.getStats(), 
      postRepo.getStats(),
      scheduledRepo.getStats(),
      getRecentActivity(insightRepo, postRepo)
    ]);

    // Handle any repository errors
    if (!transcriptStats.success || !insightStats.success || 
        !postStats.success || !scheduledStats.success) {
      throw new Error('Failed to fetch dashboard statistics');
    }

    return {
      success: true,
      data: {
        counts: {
          transcripts: transcriptStats.data,
          insights: insightStats.data,
          posts: postStats.data,
          scheduled: scheduledStats.data
        },
        activity: recentActivity
      }
    };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return {
      success: false,
      error: 'Failed to fetch dashboard data',
      data: {
        counts: {
          transcripts: { total: 0, byStatus: {} },
          insights: { total: 0, byStatus: {} },
          posts: { total: 0, byStatus: {} },
          scheduled: { total: 0, byStatus: {}, byPlatform: {}, upcoming24h: 0 }
        },
        activity: []
      }
    };
  }
}

// Recent activity using repositories
async function getRecentActivity(
  insightRepo: InsightRepository, 
  postRepo: PostRepository
) {
  try {
    // Get recent insights (last 5)
    const recentInsights = await insightRepo.findWithTranscripts({ 
      limit: 5,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    // Get recent posts (last 5)  
    const recentPosts = await postRepo.findWithRelatedData({
      limit: 5,
      sortBy: 'createdAt', 
      sortOrder: 'desc'
    });

    const activity = [];

    // Add insights to activity
    if (recentInsights.success) {
      activity.push(
        ...recentInsights.data.map((insight) => ({
          id: insight.id,
          type: 'insight_created' as const,
          title: `New insight: "${insight.title}"`,
          timestamp: insight.createdAt.toISOString(),
          status: insight.status
        }))
      );
    }

    // Add posts to activity
    if (recentPosts.success) {
      activity.push(
        ...recentPosts.data.map((post) => ({
          id: post.id,
          type: 'post_created' as const,
          title: `New ${post.platform} post: "${post.title}"`,
          timestamp: post.createdAt.toISOString(),
          status: post.status
        }))
      );
    }

    // Sort by timestamp and take the 10 most recent
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return activity.slice(0, 10);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

export async function GET() {
  try {
    const result = await getDashboardData();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        data: {
          counts: {
            transcripts: { total: 0, byStatus: {} },
            insights: { total: 0, byStatus: {} },
            posts: { total: 0, byStatus: {} },
            scheduled: { total: 0, byStatus: {} }
          },
          activity: []
        }
      },
      { status: 500 }
    );
  }
}