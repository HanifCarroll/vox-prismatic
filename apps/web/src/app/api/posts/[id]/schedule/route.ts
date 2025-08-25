import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase, 
  getDatabase, 
  posts as postsTable,
  scheduledPosts as scheduledPostsTable 
} from '@content-creation/database';
import { eq } from 'drizzle-orm';

/**
 * RESTful Post Scheduling Endpoint
 * POST /api/posts/{id}/schedule - Schedule a specific post
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const db = getDatabase();

    const { id: postId } = params;
    const { platform, content, datetime, metadata } = await request.json();

    if (!platform || !content || !datetime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: platform, content, datetime'
      }, { status: 400 });
    }

    // Verify the post exists and is approved
    const existingPost = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1);

    if (existingPost.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Post not found'
      }, { status: 404 });
    }

    const post = existingPost[0];
    if (post.status !== 'approved') {
      return NextResponse.json({
        success: false,
        error: 'Post must be approved before scheduling'
      }, { status: 400 });
    }

    // Create scheduled post using RESTful approach
    const now = new Date().toISOString();
    const newScheduledPost = {
      id: `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      postId: postId,
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
        error: 'Failed to schedule post'
      }, { status: 500 });
    }

    // Update the original post status to scheduled
    await db
      .update(postsTable)
      .set({ 
        status: 'scheduled',
        updatedAt: now 
      })
      .where(eq(postsTable.id, postId));

    const scheduledPost = insertedPosts[0];
    console.log(`📅 Post scheduled via RESTful API: ${scheduledPost.id} for ${platform} at ${datetime}`);

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