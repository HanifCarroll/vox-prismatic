import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase,
  PostService
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
    const postService = new PostService();

    const { id: postId } = await params;
    const { platform, content, datetime, metadata } = await request.json();

    if (!platform || !content || !datetime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: platform, content, datetime'
      }, { status: 400 });
    }

    // Schedule the post using the service
    const result = await postService.schedulePost({
      postId,
      platform: platform as 'linkedin' | 'x',
      content,
      scheduledTime: datetime,
      metadata
    });

    if (!result.success) {
      // Check if it's a specific error type for better status codes
      const errorMessage = result.error.message;
      if (errorMessage.includes('not found')) {
        return NextResponse.json({
          success: false,
          error: errorMessage
        }, { status: 404 });
      }
      if (errorMessage.includes('must be approved')) {
        return NextResponse.json({
          success: false,
          error: errorMessage
        }, { status: 400 });
      }
      throw result.error;
    }

    const { scheduledPost } = result.data;
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