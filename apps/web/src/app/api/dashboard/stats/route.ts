import { NextRequest, NextResponse } from 'next/server';
import { tryGetConfig } from '@content-creation/config';
import {
  initDatabase,
  runMigrations,
  getDatabase,
  getDatabaseStats,
  transcripts,
  insights,
  posts,
  scheduledPosts
} from '@content-creation/database';
import { eq } from 'drizzle-orm';
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
    // Initialize database connection only
    initDatabase();
    
    const db = getDatabase();
    
    // Query counts for each table using Drizzle
    const [
      allTranscripts,
      cleanedTranscripts, 
      draftInsights,
      approvedInsights,
      allPosts,
      approvedPosts,
      allScheduledPosts,
      scheduledPostsForUpcoming
    ] = await Promise.all([
      db.select().from(transcripts),
      db.select().from(transcripts).where(eq(transcripts.status, 'cleaned')),
      db.select().from(insights).where(eq(insights.status, 'draft')),  
      db.select().from(insights).where(eq(insights.status, 'approved')),
      db.select().from(posts),
      db.select().from(posts).where(eq(posts.status, 'approved')),
      db.select().from(scheduledPosts),
      db.select().from(scheduledPosts).where(eq(scheduledPosts.status, 'scheduled'))
    ]);

    // Calculate pipeline stats from Drizzle queries
    const pipelineStats = {
      rawTranscripts: allTranscripts.length,
      cleanedTranscripts: cleanedTranscripts.length,
      readyInsights: draftInsights.length,
      generatedPosts: allPosts.length,
      approvedPosts: approvedPosts.length,
      scheduledPosts: allScheduledPosts.length,
    };

    // Calculate recent activity from database counts
    const recentActivity = {
      insightsApprovedToday: approvedInsights.length,
      postsScheduledToday: allScheduledPosts.length,
      reviewSessionApprovalRate: allPosts.length > 0 
        ? Math.round((approvedInsights.length / allPosts.length) * 100) 
        : 0,
    };

    // Calculate upcoming posts from scheduled posts
    let todayCount = 0;
    let weekCount = 0;
    let nextPost: DashboardStats['upcomingPosts']['nextPost'];

    const today = new Date();
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    for (const post of scheduledPostsForUpcoming) {
      if (!post.scheduledTime) continue;
      
      const postDate = new Date(post.scheduledTime);
      
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
            platform: post.platform || 'unknown',
            scheduledTime: post.scheduledTime,
            title: (post.content || 'Scheduled Post').substring(0, 50) + '...'
          };
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