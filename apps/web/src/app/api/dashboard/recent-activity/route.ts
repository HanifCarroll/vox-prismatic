import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getUnifiedContent, migrateToUnifiedSchema } from '@content-creation/database';

/**
 * Recent activity API route
 * Provides timeline of recent actions in the content pipeline
 */

export interface ActivityItem {
  id: string;
  type: 'insight_approved' | 'insight_rejected' | 'post_generated' | 'post_scheduled' | 'transcript_processed';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    platform?: string;
    score?: number;
    postType?: string;
  };
}

export interface RecentActivityResponse {
  activities: ActivityItem[];
  summary: {
    totalToday: number;
    insightsApproved: number;
    postsScheduled: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database and run migration if needed
    initDatabase();
    const migrationResult = migrateToUnifiedSchema();
    
    if (!migrationResult) {
      console.error('❌ Migration failed for recent activity');
      return NextResponse.json({
        activities: [],
        summary: {
          totalToday: 0,
          insightsApproved: 0,
          postsScheduled: 0
        }
      });
    }

    // Get recent content from unified table
    const [recentInsightsResult, recentPostsResult, scheduledPostsResult] = await Promise.all([
      getUnifiedContent({ contentType: 'insight', status: 'approved', limit: 20 }),
      getUnifiedContent({ contentType: 'post', status: 'needs_review', limit: 10 }),
      getUnifiedContent({ contentType: 'scheduled_post', status: 'scheduled', limit: 20 })
    ]);

    const activities: ActivityItem[] = [];
    const today = new Date();

    // Process recent insights
    if (recentInsightsResult.success) {
      recentInsightsResult.data.forEach(insight => {
        let metadata = {};
        try {
          metadata = insight.metadata ? JSON.parse(insight.metadata) : {};
        } catch (e) {
          metadata = {};
        }
        
        activities.push({
          id: `insight_${insight.id}`,
          type: 'insight_approved',
          title: insight.title,
          description: 'Insight approved for post generation',
          timestamp: insight.updatedAt,
          metadata: {
            score: (metadata as any).scores?.total || 0,
            postType: (metadata as any).postType || 'Unknown'
          }
        });
      });
    }

    // Process recent posts  
    if (recentPostsResult.success) {
      recentPostsResult.data.slice(0, 5).forEach(post => {
        activities.push({
          id: `post_generated_${post.id}`,
          type: 'post_generated',
          title: post.title,
          description: `New post generated from insight`,
          timestamp: post.createdAt,
          metadata: {
            platform: post.platform || 'unknown'
          }
        });
      });
    }

    // Process scheduled posts
    if (scheduledPostsResult.success) {
      scheduledPostsResult.data.slice(0, 5).forEach(scheduledPost => {
        activities.push({
          id: `scheduled_${scheduledPost.id}`,
          type: 'post_scheduled',
          title: scheduledPost.title,
          description: `Post scheduled for ${scheduledPost.platform || 'unknown'}`,
          timestamp: scheduledPost.createdAt,
          metadata: {
            platform: scheduledPost.platform || 'unknown'
          }
        });
      });
    }

    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate summary stats
    const todaysActivities = activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate.toDateString() === today.toDateString();
    });

    const summary = {
      totalToday: todaysActivities.length,
      insightsApproved: todaysActivities.filter(a => a.type === 'insight_approved').length,
      postsScheduled: todaysActivities.filter(a => a.type === 'post_scheduled').length,
    };

    const response: RecentActivityResponse = {
      activities: activities.slice(0, 20), // Return latest 20 activities
      summary
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Recent activity API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch recent activity'
      },
      { status: 500 }
    );
  }
}