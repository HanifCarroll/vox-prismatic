import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase,
  PostRepository,
  ScheduledPostRepository
} from '@content-creation/database';

/**
 * RESTful Post Scheduling Endpoint
 * POST /api/posts/{id}/schedule - Schedule a specific post
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const postRepo = new PostRepository();
    const scheduledRepo = new ScheduledPostRepository();

    const { id: postId } = await params;
    const { platform, content, datetime, metadata } = await request.json();

    if (!platform || !content || !datetime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: platform, content, datetime'
      }, { status: 400 });
    }

    // Verify the post exists using repository
    const postResult = await postRepo.findById(postId);
    
    if (!postResult.success) {
      throw postResult.error;
    }

    if (!postResult.data) {
      return NextResponse.json({
        success: false,
        error: 'Post not found'
      }, { status: 404 });
    }

    const post = postResult.data;
    if (post.status !== 'approved') {
      return NextResponse.json({
        success: false,
        error: 'Post must be approved before scheduling'
      }, { status: 400 });
    }

    // Create scheduled post using repository
    const scheduledResult = await scheduledRepo.create({
      postId: postId,
      platform: platform as 'linkedin' | 'x',
      content,
      scheduledTime: datetime,
      status: 'pending',
      retryCount: 0
    });

    if (!scheduledResult.success) {
      throw scheduledResult.error;
    }

    // Update the original post status to scheduled using repository
    const updateResult = await postRepo.updateStatus(postId, 'scheduled');
    
    if (!updateResult.success) {
      throw updateResult.error;
    }

    const scheduledPost = scheduledResult.data;
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