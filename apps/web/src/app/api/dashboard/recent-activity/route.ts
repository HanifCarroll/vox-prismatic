import { NextRequest, NextResponse } from 'next/server';
import { tryGetConfig } from '@content-creation/config';
import { createNotionClient, insights, posts } from '@content-creation/notion';

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
    const config = tryGetConfig();
    
    // If config is not available, return mock data
    if (!config) {
      const mockResponse: RecentActivityResponse = {
        activities: [],
        summary: {
          totalToday: 0,
          insightsApproved: 0,
          postsScheduled: 0,
        },
      };
      
      return NextResponse.json({
        success: true,
        data: mockResponse,
        warning: 'Configuration not available - showing mock data'
      });
    }

    const notionClient = createNotionClient(config.notion);

    // Get recent insights and posts (last 7 days)
    const [recentInsightsResult, recentPostsResult] = await Promise.all([
      insights.getAll(notionClient, config.notion), // TODO: Add date filtering
      posts.getAll(notionClient, config.notion)     // TODO: Add date filtering
    ]);

    const activities: ActivityItem[] = [];
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Process recent insights
    if (recentInsightsResult.success) {
      for (const insight of recentInsightsResult.data.slice(0, 10)) { // Latest 10
        if (insight.status === 'Ready for Posts') {
          activities.push({
            id: `insight_${insight.id}`,
            type: 'insight_approved',
            title: insight.title,
            description: `Insight approved for post generation`,
            timestamp: new Date().toISOString(), // TODO: Use actual last modified date
            metadata: {
              score: insight.score,
              postType: insight.postType
            }
          });
        } else if (insight.status === 'Rejected') {
          activities.push({
            id: `insight_reject_${insight.id}`,
            type: 'insight_rejected',
            title: insight.title,
            description: `Insight rejected during review`,
            timestamp: new Date().toISOString(), // TODO: Use actual last modified date
            metadata: {
              score: insight.score,
              postType: insight.postType
            }
          });
        }
      }
    }

    // Process recent posts
    if (recentPostsResult.success) {
      for (const post of recentPostsResult.data.slice(0, 10)) { // Latest 10
        if (post.status === 'Scheduled') {
          activities.push({
            id: `post_scheduled_${post.id}`,
            type: 'post_scheduled',
            title: post.title,
            description: `Post scheduled for ${post.platform}`,
            timestamp: post.scheduledDate || new Date().toISOString(),
            metadata: {
              platform: post.platform
            }
          });
        } else if (post.status === 'Draft') {
          activities.push({
            id: `post_generated_${post.id}`,
            type: 'post_generated',
            title: post.title,
            description: `New post generated from insight`,
            timestamp: new Date().toISOString(), // TODO: Use actual creation date
            metadata: {
              platform: post.platform
            }
          });
        }
      }
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