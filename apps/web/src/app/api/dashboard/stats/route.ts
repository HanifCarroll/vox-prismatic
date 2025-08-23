import { NextRequest, NextResponse } from 'next/server';
import { tryGetConfig } from '@content-creation/config';
import { createNotionClient, transcripts, insights, posts } from '@content-creation/notion';
import { getScheduledPosts } from '@content-creation/postiz';
import { getInsightsForReview, getPostsForScheduling, getAnalyticsWorkflow } from '@content-creation/workflows';

/**
 * Dashboard statistics API route
 * Provides pipeline status counts and recent activity
 */

export interface DashboardStats {
  pipeline: {
    rawTranscripts: number;
    cleanedTranscripts: number;
    readyInsights: number;
    generatedPosts: number;
    approvedPosts: number;
    scheduledPosts: number;
  };
  recentActivity: {
    insightsApprovedToday: number;
    postsScheduledToday: number;
    reviewSessionApprovalRate: number;
  };
  upcomingPosts: {
    todayCount: number;
    weekCount: number;
    nextPost?: {
      platform: string;
      scheduledTime: string;
      title: string;
    };
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const config = tryGetConfig();
    
    // If config is not available, return mock data
    if (!config) {
      const mockStats: DashboardStats = {
        pipeline: {
          rawTranscripts: 0,
          cleanedTranscripts: 0,
          readyInsights: 0,
          generatedPosts: 0,
          approvedPosts: 0,
          scheduledPosts: 0,
        },
        recentActivity: {
          insightsApprovedToday: 0,
          postsScheduledToday: 0,
          reviewSessionApprovalRate: 0,
        },
        upcomingPosts: {
          todayCount: 0,
          weekCount: 0,
        },
      };
      
      return NextResponse.json({
        success: true,
        data: mockStats,
        warning: 'Configuration not available - showing mock data'
      });
    }

    const notionClient = createNotionClient(config.notion);

    // Fetch pipeline counts in parallel
    const [
      rawTranscriptsResult,
      cleanedTranscriptsResult,
      readyInsightsResult,
      generatedPostsResult,
      approvedPostsResult,
      scheduledPostsResult
    ] = await Promise.all([
      transcripts.getRaw(notionClient, config.notion),
      transcripts.getCleaned(notionClient, config.notion),
      insights.getNeedsReview(notionClient, config.notion),
      posts.getNeedsReview(notionClient, config.notion), // Posts that need review
      posts.getReadyToSchedule(notionClient, config.notion), // Posts ready to post
      getScheduledPosts(config.postiz)
    ]);

    // Calculate pipeline stats
    const pipelineStats = {
      rawTranscripts: rawTranscriptsResult.success ? rawTranscriptsResult.data.length : 0,
      cleanedTranscripts: cleanedTranscriptsResult.success ? cleanedTranscriptsResult.data.length : 0,
      readyInsights: readyInsightsResult.success ? readyInsightsResult.data.length : 0,
      generatedPosts: generatedPostsResult.success ? generatedPostsResult.data.length : 0,
      approvedPosts: approvedPostsResult.success ? approvedPostsResult.data.length : 0,
      scheduledPosts: scheduledPostsResult.success ? scheduledPostsResult.data.length : 0,
    };

    // Calculate recent activity using analytics workflow
    const analyticsData = getAnalyticsWorkflow();
    const totalInsights = analyticsData.insights.total;
    const approvedInsights = analyticsData.insights.approved;
    const totalPosts = analyticsData.posts.total;
    const approvedPosts = analyticsData.posts.approved;
    
    const recentActivity = {
      insightsApprovedToday: approvedInsights,
      postsScheduledToday: approvedPosts,
      reviewSessionApprovalRate: totalInsights > 0 ? Math.round((approvedInsights / totalInsights) * 100) : 0,
    };

    // Calculate upcoming posts
    const today = new Date();
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    let todayCount = 0;
    let weekCount = 0;
    let nextPost: DashboardStats['upcomingPosts']['nextPost'];

    if (scheduledPostsResult.success) {
      const scheduledPosts = scheduledPostsResult.data;
      
      for (const post of scheduledPosts) {
        const postDate = new Date(post.publishDate || post.scheduledDate);
        
        // Count today's posts
        if (postDate.toDateString() === today.toDateString()) {
          todayCount++;
        }
        
        // Count this week's posts
        if (postDate >= today && postDate <= oneWeekFromNow) {
          weekCount++;
          
          // Find the next upcoming post
          if (!nextPost || postDate < new Date(nextPost.scheduledTime)) {
            nextPost = {
              platform: post.integration?.providerIdentifier || 'unknown',
              scheduledTime: post.publishDate || post.scheduledDate,
              title: post.content.substring(0, 50) + '...'
            };
          }
        }
      }
    }

    const upcomingPosts = {
      todayCount,
      weekCount,
      nextPost
    };

    const dashboardStats: DashboardStats = {
      pipeline: pipelineStats,
      recentActivity,
      upcomingPosts
    };

    return NextResponse.json({
      success: true,
      data: dashboardStats
    });

  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats'
      },
      { status: 500 }
    );
  }
}