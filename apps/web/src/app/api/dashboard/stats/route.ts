import { NextRequest, NextResponse } from 'next/server';
import { tryGetConfig } from '@content-creation/config';
import {
  initDatabase,
  getTranscripts,
  getInsights,
  getPosts,
  getScheduledPosts as getDbScheduledPosts,
  getDatabaseStats
} from '@content-creation/database';
import { getScheduledPosts } from '@content-creation/postiz';
import { getAnalyticsWorkflow } from '@content-creation/workflows';

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
    
    // Initialize database
    initDatabase();
    
    // Get comprehensive database stats
    const dbStats = getDatabaseStats();
    
    // Fetch specific data for detailed pipeline stats
    const [
      rawTranscriptsResult,
      readyInsightsResult,
      generatedPostsResult,
      approvedPostsResult,
      scheduledPostsResult
    ] = await Promise.all([
      getTranscripts({ status: 'pending', limit: 1000 }),
      getInsights({ status: 'draft', minScore: 15, limit: 1000 }),
      getPosts({ status: 'needs_review', limit: 1000 }),
      getPosts({ status: 'approved', limit: 1000 }),
      config ? getScheduledPosts(config.postiz) : { success: false, error: new Error('No config') }
    ]);

    // Calculate pipeline stats from database
    const pipelineStats = {
      rawTranscripts: dbStats.transcripts.count,
      cleanedTranscripts: rawTranscriptsResult.success ? rawTranscriptsResult.data.length : 0,
      readyInsights: readyInsightsResult.success ? readyInsightsResult.data.length : 0,
      generatedPosts: generatedPostsResult.success ? generatedPostsResult.data.length : 0,
      approvedPosts: approvedPostsResult.success ? approvedPostsResult.data.length : 0,
      scheduledPosts: dbStats.scheduledPosts.count,
    };

    // Calculate recent activity from database stats
    const totalInsights = dbStats.insights.count;
    const approvedInsights = dbStats.insights.byStatus?.approved || 0;
    const totalPosts = dbStats.posts.count;
    const approvedPosts = dbStats.posts.byStatus?.approved || 0;
    
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