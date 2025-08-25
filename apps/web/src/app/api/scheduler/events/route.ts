import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase, 
  getDatabase, 
  scheduledPosts as scheduledPostsTable 
} from '@content-creation/database';
import { desc } from 'drizzle-orm';

/**
 * Get scheduled events for the calendar
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const db = getDatabase();

    // Get all scheduled posts from SQLite database using modern Drizzle approach
    const posts = await db
      .select()
      .from(scheduledPostsTable)
      .orderBy(desc(scheduledPostsTable.scheduledTime))
      .limit(1000);

    // Transform posts for calendar display
    const events = posts.map((post) => {
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
        retryCount: post.retryCount || 0,
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