import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase, 
  getDatabase, 
  scheduledPosts as scheduledPostsTable 
} from '@content-creation/database';

/**
 * Schedule a post to our local scheduler
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const db = getDatabase();

    const { postId, platform, content, datetime, metadata } = await request.json();

    if (!platform || !content || !datetime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: platform, content, datetime'
      }, { status: 400 });
    }

    // Create scheduled post using modern Drizzle approach
    const now = new Date().toISOString();
    const newScheduledPost = {
      id: `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      postId: postId || null,
      platform: platform as 'linkedin' | 'x' | 'postiz' | 'instagram' | 'facebook',
      content,
      scheduledTime: datetime,
      status: 'pending' as const,
      retryCount: 0,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: now,
      updatedAt: now
    };

    const insertedPosts = await db
      .insert(scheduledPostsTable)
      .values(newScheduledPost)
      .returning();

    if (insertedPosts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create scheduled post'
      }, { status: 500 });
    }

    const scheduledPost = insertedPosts[0];
    console.log(`📅 Post scheduled locally: ${scheduledPost.id} for ${platform} at ${datetime}`);

    return NextResponse.json({
      success: true,
      message: 'Post scheduled successfully',
      data: {
        scheduledPostId: scheduledPost.id,
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