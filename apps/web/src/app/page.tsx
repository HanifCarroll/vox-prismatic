import { Pipeline } from './components/Pipeline';
import { DashboardWidgets } from './components/DashboardWidgets';
import { DashboardStats } from './api/dashboard/stats/route';
import { RecentActivityResponse } from './api/dashboard/recent-activity/route';
import {
  initDatabase,
  getUnifiedContent,
  getUnifiedContentStats,
  migrateToUnifiedSchema,
  UnifiedContent,
  ContentStats
} from '@content-creation/database';

/**
 * Dashboard page - main overview of the content creation system
 */

async function fetchDashboardData(): Promise<{ stats: DashboardStats; recentActivity: RecentActivityResponse } | null> {
  try {
    // Initialize database once
    initDatabase();
    
    // Run migration to unified schema (only runs once if needed)
    const migrationResult = migrateToUnifiedSchema();
    
    if (!migrationResult) {
      console.error('❌ Migration failed, falling back to old schema');
      return null;
    }
    
    // Get unified content statistics
    const unifiedStatsResult = getUnifiedContentStats();
    
    if (!unifiedStatsResult.success) {
      console.error('❌ Failed to get unified stats:', unifiedStatsResult.error);
      return null;
    }
    
    const contentStats = unifiedStatsResult.data;
    console.log('🔍 Unified content stats:', JSON.stringify(contentStats, null, 2));
    
    // Get recent content for activity timeline
    const [
      recentInsightsResult,
      recentPostsResult,
      recentScheduledResult
    ] = await Promise.all([
      getUnifiedContent({ contentType: 'insight', status: 'approved', limit: 10 }),
      getUnifiedContent({ contentType: 'post', status: 'needs_review', limit: 5 }),
      getUnifiedContent({ contentType: 'scheduled_post', status: 'scheduled', limit: 20 })
    ]);

    // Calculate pipeline stats efficiently from unified data
    const pipelineStats = {
      rawTranscripts: contentStats.byType.transcript || 0,
      cleanedTranscripts: contentStats.byStatus.cleaned || 0,
      readyInsights: contentStats.byStatus.needs_review || 0,
      generatedPosts: contentStats.byType.post || 0,
      approvedPosts: contentStats.byStatus.approved || 0,
      scheduledPosts: contentStats.byType.scheduled_post || 0,
    };

    // Calculate recent activity from database
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Create recent activity from unified content data
    const activities = [];
    
    // Add approved insights
    if (recentInsightsResult.success) {
      recentInsightsResult.data.forEach(insight => {
        const metadata = insight.metadata || {};
        activities.push({
          id: `insight_${insight.id}`,
          type: 'insight_approved' as const,
          title: insight.title,
          description: 'Insight approved for post generation',
          timestamp: insight.updatedAt,
          metadata: {
            score: metadata.scores?.total || 0,
            postType: metadata.postType || 'Unknown'
          }
        });
      });
    }

    // Add scheduled posts
    if (recentScheduledResult.success) {
      recentScheduledResult.data.slice(0, 5).forEach(scheduledPost => {
        activities.push({
          id: `scheduled_${scheduledPost.id}`,
          type: 'post_scheduled' as const,
          title: scheduledPost.title,
          description: `Post scheduled for ${scheduledPost.platform}`,
          timestamp: scheduledPost.createdAt,
          metadata: {
            platform: scheduledPost.platform
          }
        });
      });
    }

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate upcoming posts
    let todayCount = 0;
    let weekCount = 0;
    let nextPost = undefined;
    
    if (recentScheduledResult.success) {
      const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      recentScheduledResult.data.forEach(post => {
        if (!post.scheduledTime) return;
        
        const postDate = new Date(post.scheduledTime);
        
        if (postDate.toDateString() === today.toDateString()) {
          todayCount++;
        }
        
        if (postDate >= today && postDate <= oneWeekFromNow) {
          weekCount++;
          
          // Find the next upcoming post
          if (!nextPost || postDate < new Date(nextPost.scheduledTime)) {
            nextPost = {
              platform: post.platform || 'unknown',
              scheduledTime: post.scheduledTime,
              title: (post.processedContent || post.title).substring(0, 50) + '...'
            };
          }
        }
      });
    }

    const stats: DashboardStats = {
      pipeline: pipelineStats,
      recentActivity: {
        insightsApprovedToday: activities.filter(a => 
          a.type === 'insight_approved' && 
          new Date(a.timestamp).toDateString() === today.toDateString()
        ).length,
        postsScheduledToday: activities.filter(a => 
          a.type === 'post_scheduled' && 
          new Date(a.timestamp).toDateString() === today.toDateString()
        ).length,
        reviewSessionApprovalRate: contentStats.byType.insight > 0 
          ? Math.round(((contentStats.byStatus.approved || 0) / contentStats.byType.insight) * 100) 
          : 0,
      },
      upcomingPosts: {
        todayCount,
        weekCount,
        nextPost
      }
    };

    const recentActivity: RecentActivityResponse = {
      activities: activities.slice(0, 10), // Show latest 10 activities
      summary: {
        totalToday: activities.filter(a => 
          new Date(a.timestamp).toDateString() === today.toDateString()
        ).length,
        insightsApproved: activities.filter(a => a.type === 'insight_approved').length,
        postsScheduled: activities.filter(a => a.type === 'post_scheduled').length,
      }
    };

    return { stats, recentActivity };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return null;
  }
}

export default async function Dashboard() {
  // Fetch dashboard data efficiently
  const dashboardData = await fetchDashboardData();
  
  const stats = dashboardData?.stats || null;
  const recentActivity = dashboardData?.recentActivity || null;

  // Fallback data if API calls fail
  const fallbackStats: DashboardStats = {
    pipeline: {
      rawTranscripts: 0,
      cleanedTranscripts: 0,
      readyInsights: 0,
      generatedPosts: 0,
      approvedPosts: 0,
      scheduledPosts: 0
    },
    recentActivity: {
      insightsApprovedToday: 0,
      postsScheduledToday: 0,
      reviewSessionApprovalRate: 0
    },
    upcomingPosts: {
      todayCount: 0,
      weekCount: 0
    }
  };

  const currentStats = stats || fallbackStats;

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Content Creation Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Transform coaching transcripts into social media content
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href="/scheduler"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              📅 Open Scheduler
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-8">
        {/* Pipeline Overview */}
        <Pipeline 
          stats={currentStats.pipeline}
          className="mb-8"
        />

        {/* Dashboard Widgets */}
        <DashboardWidgets 
          stats={currentStats}
          recentActivity={recentActivity}
          className="mb-8"
        />

        {/* Status Message */}
        {!stats && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="font-medium text-yellow-800">
                Unable to load dashboard data
              </span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              The system is running with mock data. Check your configuration and try refreshing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
