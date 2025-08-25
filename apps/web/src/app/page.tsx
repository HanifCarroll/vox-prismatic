import { Pipeline } from './components/Pipeline';
import { DashboardWidgets } from './components/DashboardWidgets';
import { DashboardStats } from './api/dashboard/stats/route';
import { RecentActivityResponse } from './api/dashboard/recent-activity/route';
import { AlertTriangle } from 'lucide-react';
import {
  initDatabase,
  runMigrations,
  getDatabase,
  getDatabaseStats,
  transcripts,
  insights,
  posts,
  scheduledPosts,
  type Transcript,
  type Insight,
  type Post,
  type ScheduledPost
} from '@content-creation/database';
import { eq, desc } from 'drizzle-orm';

/**
 * Dashboard page - main overview of the content creation system
 */

async function fetchDashboardData(): Promise<{ stats: DashboardStats; recentActivity: RecentActivityResponse } | null> {
  try {
    // Initialize database connection only
    initDatabase();
    
    const db = getDatabase();
    
    // Get database statistics using the new Drizzle approach
    const dbStats = getDatabaseStats();
    
    // Query counts for each table using Drizzle
    const [
      allTranscripts,
      cleanedTranscripts, 
      allInsights,
      approvedInsights,
      allPosts,
      approvedPosts,
      allScheduledPosts
    ] = await Promise.all([
      db.select().from(transcripts),
      db.select().from(transcripts).where(eq(transcripts.status, 'cleaned')),
      db.select().from(insights),  
      db.select().from(insights).where(eq(insights.status, 'approved')),
      db.select().from(posts),
      db.select().from(posts).where(eq(posts.status, 'approved')),
      db.select().from(scheduledPosts)
    ]);

    // Calculate pipeline stats from Drizzle queries
    const pipelineStats = {
      rawTranscripts: allTranscripts.length,
      cleanedTranscripts: cleanedTranscripts.length,
      readyInsights: allInsights.length,
      generatedPosts: allPosts.length,
      approvedPosts: approvedPosts.length,
      scheduledPosts: allScheduledPosts.length,
    };

    // Get recent activities using Drizzle queries
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const [
      recentApprovedInsights,
      recentScheduledPosts
    ] = await Promise.all([
      db.select().from(insights)
        .where(eq(insights.status, 'approved'))
        .orderBy(desc(insights.updatedAt))
        .limit(10),
      db.select().from(scheduledPosts)
        .where(eq(scheduledPosts.status, 'pending'))
        .orderBy(desc(scheduledPosts.createdAt))
        .limit(20)
    ]);
    
    // Create recent activity from Drizzle data
    const activities: any[] = [];
    
    // Add approved insights
    recentApprovedInsights.forEach(insight => {
      activities.push({
        id: `insight_${insight.id}`,
        type: 'insight_approved' as const,
        title: insight.title,
        description: 'Insight approved for post generation',
        timestamp: insight.updatedAt,
        metadata: {
          score: insight.totalScore || 0,
          postType: insight.postType || 'Unknown'
        }
      });
    });

    // Add scheduled posts
    recentScheduledPosts.slice(0, 5).forEach(scheduledPost => {
      activities.push({
        id: `scheduled_${scheduledPost.id}`,
        type: 'post_scheduled' as const,
        title: scheduledPost.content?.substring(0, 50) + '...' || 'Scheduled Post',
        description: `Post scheduled for ${scheduledPost.platform}`,
        timestamp: scheduledPost.createdAt,
        metadata: {
          platform: scheduledPost.platform
        }
      });
    });

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate upcoming posts
    let todayCount = 0;
    let weekCount = 0;
    let nextPost: any = undefined;
    
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    recentScheduledPosts.forEach(post => {
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
            title: (post.content || 'Scheduled Post').substring(0, 50) + '...'
          };
        }
      }
    });

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
        reviewSessionApprovalRate: allPosts.length > 0 
          ? Math.round((approvedInsights.length / allPosts.length) * 100) 
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
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
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
