import { NextResponse } from 'next/server';
import { 
  initDatabase,
  TranscriptRepository,
  InsightRepository,
  PostService
} from '@content-creation/database';
import type { DashboardData, ApiResponse } from '@/types';

/**
 * Dashboard API - Single endpoint for all dashboard/sidebar data
 * Now uses PostService for coordinated post and scheduling data
 */

async function getDashboardData(): Promise<ApiResponse<DashboardData>> {
  try {
    // Initialize database connection
    initDatabase();
    
    // Create repository and service instances
    const transcriptRepo = new TranscriptRepository();
    const insightRepo = new InsightRepository();
    const postService = new PostService();
    
    // Execute all dashboard queries in parallel for optimal performance
    const [
      transcriptStats,
      insightStats, 
      postServiceStats,
      recentActivity
    ] = await Promise.all([
      transcriptRepo.getStats(),
      insightRepo.getStats(), 
      postService.getStatistics(),
      getRecentActivity(insightRepo, postService)
    ]);

    // Handle any repository errors
    if (!transcriptStats.success || !insightStats.success || 
        !postServiceStats.success) {
      throw new Error('Failed to fetch dashboard statistics');
    }

    return {
      success: true,
      data: {
        counts: {
          transcripts: transcriptStats.data,
          insights: insightStats.data,
          posts: postServiceStats.data.posts,
          scheduled: {
            total: postServiceStats.data.scheduled.total,
            byStatus: {
              pending: postServiceStats.data.scheduled.pending,
              published: postServiceStats.data.scheduled.published,
              failed: postServiceStats.data.scheduled.failed
            },
            byPlatform: postServiceStats.data.posts.byPlatform,
            upcoming24h: postServiceStats.data.scheduled.upcoming24h
          }
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

// Recent activity using repositories and services
async function getRecentActivity(
  insightRepo: InsightRepository, 
  postService: PostService
) {
  try {
    // Get recent insights (last 5)
    const recentInsights = await insightRepo.findWithTranscripts({ 
      limit: 5,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    // Get recent posts with schedule info (last 5)  
    const recentPosts = await postService.getPostsWithSchedule();

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

    // Add posts to activity (limit to 5 most recent)
    if (recentPosts.success) {
      const sortedPosts = recentPosts.data
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);
        
      activity.push(
        ...sortedPosts.map((post) => ({
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