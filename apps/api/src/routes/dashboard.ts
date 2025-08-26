import { Hono } from 'hono';
import { getDatabaseStats } from '../lib/db-connection';
import { PostAnalyticsService } from '../services';
import { 
  TranscriptRepository,
  InsightRepository, 
  PostRepository,
  ScheduledPostRepository
} from '../repositories';

const dashboard = new Hono();

// Initialize services and repositories
const analyticsService = new PostAnalyticsService();
const transcriptRepo = new TranscriptRepository();
const insightRepo = new InsightRepository();
const postRepo = new PostRepository();
const scheduledPostRepo = new ScheduledPostRepository();

// Dashboard interfaces matching frontend expectations
interface DashboardCounts {
  transcripts: {
    total: number;
    byStatus: Record<string, number>;
  };
  insights: {
    total: number;
    byStatus: Record<string, number>;
  };
  posts: {
    total: number;
    byStatus: Record<string, number>;
  };
  scheduled: {
    total: number;
    byPlatform: Record<string, number>;
    upcoming24h: number;
  };
}

interface DashboardActivity {
  id: string;
  type: 'insight_created' | 'post_created' | 'post_scheduled' | 'post_published';
  title: string;
  timestamp: string;
  status: string;
}

interface DashboardData {
  counts: DashboardCounts;
  activity: DashboardActivity[];
}

interface DashboardStats {
  transcripts: { count: number };
  insights: { count: number };
  posts: { count: number };
  scheduledPosts: { count: number };
}

// GET /dashboard - Get comprehensive dashboard data
dashboard.get('/', async (c) => {
  try {
    // Get all data in parallel for better performance
    const [
      transcriptsResult,
      insightsResult, 
      postsResult,
      scheduledResult
    ] = await Promise.all([
      transcriptRepo.findAll({}),
      insightRepo.findWithTranscripts({}),
      postRepo.findWithRelatedData({}),
      scheduledPostRepo.findAll({})
    ]);

    // Initialize counters
    const transcriptsByStatus: Record<string, number> = {};
    const insightsByStatus: Record<string, number> = {};
    const postsByStatus: Record<string, number> = {};
    const scheduledByPlatform: Record<string, number> = {};
    
    // Count transcripts by status
    let transcriptsTotal = 0;
    if (transcriptsResult.success) {
      transcriptsTotal = transcriptsResult.data.length;
      transcriptsResult.data.forEach(t => {
        transcriptsByStatus[t.status] = (transcriptsByStatus[t.status] || 0) + 1;
      });
    }

    // Count insights by status
    let insightsTotal = 0;
    if (insightsResult.success) {
      insightsTotal = insightsResult.data.length;
      insightsResult.data.forEach(i => {
        insightsByStatus[i.status] = (insightsByStatus[i.status] || 0) + 1;
      });
    }

    // Count posts by status
    let postsTotal = 0;
    if (postsResult.success) {
      postsTotal = postsResult.data.length;
      postsResult.data.forEach(p => {
        postsByStatus[p.status] = (postsByStatus[p.status] || 0) + 1;
      });
    }

    // Count scheduled posts by platform and upcoming 24h
    let scheduledTotal = 0;
    let upcoming24h = 0;
    if (scheduledResult.success) {
      scheduledTotal = scheduledResult.data.length;
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      scheduledResult.data.forEach(s => {
        scheduledByPlatform[s.platform] = (scheduledByPlatform[s.platform] || 0) + 1;
        
        const scheduledTime = new Date(s.scheduledTime);
        if (scheduledTime >= now && scheduledTime <= next24h && s.status === 'pending') {
          upcoming24h++;
        }
      });
    }

    // Build counts object
    const counts: DashboardCounts = {
      transcripts: {
        total: transcriptsTotal,
        byStatus: transcriptsByStatus
      },
      insights: {
        total: insightsTotal,
        byStatus: insightsByStatus
      },
      posts: {
        total: postsTotal,
        byStatus: postsByStatus
      },
      scheduled: {
        total: scheduledTotal,
        byPlatform: scheduledByPlatform,
        upcoming24h: upcoming24h
      }
    };

    // Build activity feed (recent items across all types)
    const activity: DashboardActivity[] = [];
    
    // Add recent insights
    if (insightsResult.success) {
      insightsResult.data
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .forEach(insight => {
          activity.push({
            id: insight.id,
            type: 'insight_created',
            title: insight.title,
            timestamp: insight.createdAt,
            status: insight.status
          });
        });
    }

    // Add recent posts
    if (postsResult.success) {
      postsResult.data
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .forEach(post => {
          activity.push({
            id: post.id,
            type: 'post_created',
            title: post.title,
            timestamp: post.createdAt,
            status: post.status
          });
        });
    }

    // Add recent scheduled posts
    if (scheduledResult.success) {
      scheduledResult.data
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .forEach(scheduled => {
          activity.push({
            id: scheduled.id,
            type: scheduled.status === 'published' ? 'post_published' : 'post_scheduled',
            title: scheduled.content.substring(0, 50) + (scheduled.content.length > 50 ? '...' : ''),
            timestamp: scheduled.createdAt,
            status: scheduled.status
          });
        });
    }

    // Sort activity by timestamp (most recent first) and limit to 10 items
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentActivity = activity.slice(0, 10);

    const dashboardData: DashboardData = {
      counts,
      activity: recentActivity
    };

    return c.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Failed to get dashboard data:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dashboard data'
      },
      500
    );
  }
});

// GET /dashboard/stats - Get dashboard statistics (same data, just stats)
dashboard.get('/stats', async (c) => {
  try {
    // Get database statistics
    const stats = getDatabaseStats();
    
    // Format response to match DashboardStats interface
    const dashboardStats: DashboardStats = {
      transcripts: { count: stats.transcripts.count },
      insights: { count: stats.insights.count },
      posts: { count: stats.posts.count },
      scheduledPosts: { count: stats.scheduledPosts.count },
    };

    return c.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dashboard stats'
      },
      500
    );
  }
});

export default dashboard;