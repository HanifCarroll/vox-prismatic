import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase, 
  getDatabase,
  insights as insightsTable,
  posts as postsTable,
  scheduledPosts as scheduledPostsTable
} from '@content-creation/database';
import { desc, eq } from 'drizzle-orm';

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
    // Initialize database
    initDatabase();
    const db = getDatabase();

    // Get recent data from separate domain tables using modern Drizzle approach
    const [recentInsights, recentPosts, scheduledPosts] = await Promise.all([
      // Get recently approved insights
      db.select()
        .from(insightsTable)
        .where(eq(insightsTable.status, 'approved'))
        .orderBy(desc(insightsTable.updatedAt))
        .limit(20),
      
      // Get recently generated posts  
      db.select()
        .from(postsTable)
        .where(eq(postsTable.status, 'needs_review'))
        .orderBy(desc(postsTable.createdAt))
        .limit(10),
      
      // Get recently scheduled posts
      db.select()
        .from(scheduledPostsTable)
        .orderBy(desc(scheduledPostsTable.createdAt))
        .limit(20)
    ]);

    const activities: ActivityItem[] = [];
    const today = new Date();

    // Process recent insights
    recentInsights.forEach(insight => {
      activities.push({
        id: `insight_${insight.id}`,
        type: 'insight_approved',
        title: insight.title,
        description: 'Insight approved for post generation',
        timestamp: insight.updatedAt,
        metadata: {
          score: insight.totalScore || 0,
          postType: insight.postType || 'Unknown'
        }
      });
    });

    // Process recent posts  
    recentPosts.slice(0, 5).forEach(post => {
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

    // Process scheduled posts
    scheduledPosts.slice(0, 5).forEach(scheduledPost => {
      // Create a title from content preview since scheduled posts don't have titles
      const title = scheduledPost.content.length > 50 
        ? scheduledPost.content.substring(0, 50) + '...'
        : scheduledPost.content;
        
      activities.push({
        id: `scheduled_${scheduledPost.id}`,
        type: 'post_scheduled',
        title: title,
        description: `Post scheduled for ${scheduledPost.platform}`,
        timestamp: scheduledPost.createdAt,
        metadata: {
          platform: scheduledPost.platform
        }
      });
    });

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