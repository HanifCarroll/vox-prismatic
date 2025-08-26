import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase,
  ScheduledPostRepository,
  PostService
} from '@content-creation/database';

/**
 * Individual Event API - RESTful Design
 * GET /api/scheduler/events/{id} - Get event details
 * PUT /api/scheduler/events/{id} - Update event (including reschedule)
 * DELETE /api/scheduler/events/{id} - Delete a scheduled event
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const scheduledPostRepo = new ScheduledPostRepository();
    const postService = new PostService();

    const { id } = await params;

    // First, get the scheduled post to check if it has an associated post
    const scheduledPostResult = await scheduledPostRepo.findById(id);
    
    if (!scheduledPostResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Scheduled post not found'
      }, { status: 404 });
    }

    const scheduledPost = scheduledPostResult.data;
    if (!scheduledPost) {
      return NextResponse.json({
        success: false,
        error: 'Scheduled post not found'
      }, { status: 404 });
    }

    // Delete the scheduled post
    const deleteResult = await scheduledPostRepo.delete(id);
    
    if (!deleteResult.success) {
      throw new Error(deleteResult.error.message);
    }

    // If there's an associated post, update its status back to approved
    if (scheduledPost.postId) {
      const updatePostResult = await postService.updatePostStatus(
        scheduledPost.postId,
        'approved'
      );
      
      if (!updatePostResult.success) {
        console.warn(`Failed to update post status after deleting scheduled post: ${updatePostResult.error.message}`);
        // Don't fail the whole operation - the scheduled post is already deleted
      }
    }


    return NextResponse.json({
      success: true,
      message: 'Scheduled post deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete event'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const scheduledPostRepo = new ScheduledPostRepository();

    const { id } = await params;

    const result = await scheduledPostRepo.findById(id);
    
    if (!result.success) {
      throw new Error(result.error.message);
    }

    if (!result.data) {
      return NextResponse.json({
        success: false,
        error: 'Scheduled post not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch event'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const scheduledPostRepo = new ScheduledPostRepository();

    const { id } = await params;
    const updateData = await request.json();

    // If scheduledTime is being updated, validate it's in the future
    if (updateData.scheduledTime) {
      const newDate = new Date(updateData.scheduledTime);
      const now = new Date();
      
      if (newDate <= now) {
        return NextResponse.json({
          success: false,
          error: 'Cannot reschedule to a past date/time'
        }, { status: 400 });
      }
    }

    // Update the scheduled post
    const result = await scheduledPostRepo.update(id, updateData);

    if (!result.success) {
      if (result.error.message.includes('not found')) {
        return NextResponse.json({
          success: false,
          error: 'Scheduled post not found'
        }, { status: 404 });
      }
      throw new Error(result.error.message);
    }

    // Convert to CalendarEvent format for frontend
    const updatedEvent = {
      id: result.data.id,
      postId: result.data.postId,
      title: `${result.data.platform}: ${result.data.content.substring(0, 50)}...`,
      content: result.data.content,
      platform: result.data.platform as 'linkedin' | 'x',
      status: result.data.status as 'pending' | 'published' | 'failed' | 'cancelled',
      scheduledTime: result.data.scheduledTime,
      retryCount: result.data.retryCount,
      lastAttempt: result.data.lastAttempt,
      errorMessage: result.data.errorMessage,
      externalPostId: result.data.externalPostId,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt
    };


    return NextResponse.json({
      success: true,
      data: updatedEvent
    });

  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update event'
    }, { status: 500 });
  }
}