import { NextRequest, NextResponse } from 'next/server';
import { tryGetConfig } from '@content-creation/config';
import {
  initDatabase,
  getUnifiedContent,
  getUnifiedContentStats,
  migrateToUnifiedSchema
} from '@content-creation/database';
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
    // Initialize database and run migration if needed
    initDatabase();
    const migrationResult = migrateToUnifiedSchema();
    
    if (!migrationResult) {
      console.error('❌ Migration failed, falling back to mock data');
      return NextResponse.json({
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
      });
    }
    
    // Get unified content statistics
    const unifiedStatsResult = getUnifiedContentStats();
    
    if (!unifiedStatsResult.success) {
      console.error('❌ Failed to get unified stats:', unifiedStatsResult.error);
      throw unifiedStatsResult.error;
    }
    
    const contentStats = unifiedStatsResult.data;
    
    // Calculate pipeline stats efficiently from unified data
    const pipelineStats = {
      rawTranscripts: contentStats.byType.transcript || 0,
      cleanedTranscripts: contentStats.byStatus.cleaned || 0,
      readyInsights: contentStats.byStatus.needs_review || 0,
      generatedPosts: contentStats.byType.post || 0,
      approvedPosts: contentStats.byStatus.approved || 0,
      scheduledPosts: contentStats.byType.scheduled_post || 0,
    };

    // Calculate recent activity from unified data
    const totalInsights = contentStats.byType.insight || 0;
    const approvedInsights = contentStats.byStatus.approved || 0;
    
    const recentActivity = {
      insightsApprovedToday: approvedInsights,
      postsScheduledToday: contentStats.byType.scheduled_post || 0,
      reviewSessionApprovalRate: totalInsights > 0 ? Math.round((approvedInsights / totalInsights) * 100) : 0,
    };

    // Get scheduled posts for upcoming calculations
    const scheduledPostsResult = getUnifiedContent({ 
      contentType: 'scheduled_post', 
      status: 'scheduled', 
      limit: 100 
    });
    
    let todayCount = 0;
    let weekCount = 0;
    let nextPost: DashboardStats['upcomingPosts']['nextPost'];

    if (scheduledPostsResult.success) {
      const today = new Date();
      const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      for (const post of scheduledPostsResult.data) {
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
              title: (post.processedContent || post.title).substring(0, 50) + '...'
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