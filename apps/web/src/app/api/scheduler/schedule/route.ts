import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, createScheduledPost } from '@content-creation/database';

/**
 * Schedule a post to our local scheduler
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();

    const { postId, platform, content, datetime, metadata } = await request.json();

    if (!platform || !content || !datetime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: platform, content, datetime'
      }, { status: 400 });
    }

    // Create scheduled post in our SQLite database
    const scheduleResult = createScheduledPost({
      postId, // Optional: links to posts table if generated from insights
      platform,
      content,
      scheduledTime: datetime,
      metadata: metadata || {}
    });

    if (!scheduleResult.success) {
      return NextResponse.json({
        success: false,
        error: scheduleResult.error.message
      }, { status: 500 });
    }

    console.log(`📅 Post scheduled locally: ${scheduleResult.data.id} for ${platform} at ${datetime}`);

    return NextResponse.json({
      success: true,
      message: 'Post scheduled successfully',
      data: {
        scheduledPostId: scheduleResult.data.id,
        scheduledTime: datetime,
        platform,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error scheduling post:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to schedule post'
    }, { status: 500 });
  }
}