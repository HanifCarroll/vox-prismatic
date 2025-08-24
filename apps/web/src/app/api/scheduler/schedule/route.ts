import { NextRequest, NextResponse } from 'next/server';
import { tryGetConfig } from '@content-creation/config';
import { createNotionClient, posts } from '@content-creation/notion';
import { schedulePostToPlatform } from '@content-creation/postiz';

/**
 * Schedule a post to a platform
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const config = tryGetConfig();
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not available'
      }, { status: 500 });
    }

    const { postId, platform, content, datetime } = await request.json();

    if (!postId || !platform || !content || !datetime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: postId, platform, content, datetime'
      }, { status: 400 });
    }

    // Schedule the post through Postiz
    const scheduleResult = await schedulePostToPlatform(
      config.postiz,
      platform,
      content,
      datetime
    );

    if (!scheduleResult.success) {
      return NextResponse.json({
        success: false,
        error: scheduleResult.error.message
      }, { status: 500 });
    }

    // Update the post status in Notion
    const notionClient = createNotionClient(config.notion);
    const updateResult = await posts.updateStatus(notionClient, postId, 'Scheduled', datetime);

    if (!updateResult.success) {
      console.warn('Post scheduled in Postiz but failed to update Notion status:', updateResult.error);
      // Don't fail the request since the post was successfully scheduled
    }

    // Extract Postiz post ID from response
    const postizId = Array.isArray(scheduleResult.data) && scheduleResult.data.length > 0 
      ? scheduleResult.data[0].postId 
      : 'unknown';

    return NextResponse.json({
      success: true,
      message: 'Post scheduled successfully',
      data: {
        postizId,
        scheduledTime: datetime,
        platform
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