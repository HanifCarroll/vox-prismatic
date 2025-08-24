import { NextRequest, NextResponse } from 'next/server';
import { tryGetConfig } from '@content-creation/config';
import { getScheduledPosts } from '@content-creation/postiz';

/**
 * Get scheduled events for the calendar
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const config = tryGetConfig();
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not available'
      }, { status: 500 });
    }

    // Get scheduled posts from Postiz
    const result = await getScheduledPosts(config.postiz);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error.message
      }, { status: 500 });
    }

    // Transform posts for calendar display
    const events = result.data.map((post: any) => {
      const platform = post.integration?.providerIdentifier || post.platform || 'unknown';
      const startDate = new Date(post.publishDate || post.scheduledDate);
      
      return {
        id: post.id,
        title: `${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}`,
        start: startDate.toISOString(),
        end: startDate.toISOString(),
        platform: platform,
        content: post.content,
        integrationName: post.integration?.name,
        state: post.state
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