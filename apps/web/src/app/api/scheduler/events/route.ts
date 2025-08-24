import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getScheduledPosts } from '@content-creation/database';

/**
 * Get scheduled events for the calendar
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();

    // Get scheduled posts from SQLite database
    const result = getScheduledPosts({
      limit: 1000 // Get all scheduled posts for calendar view
    });
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error.message
      }, { status: 500 });
    }

    // Transform posts for calendar display
    const events = result.data.map((post) => {
      const platform = post.platform;
      const startDate = new Date(post.scheduledTime);
      
      return {
        id: post.id,
        title: `${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}`,
        start: startDate.toISOString(),
        end: startDate.toISOString(),
        platform: platform,
        content: post.content,
        status: post.status,
        retryCount: post.retryCount,
        lastAttempt: post.lastAttempt,
        error: post.errorMessage
      };
    });

    return NextResponse.json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('Error fetching scheduled events:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch scheduled events'
    }, { status: 500 });
  }
}