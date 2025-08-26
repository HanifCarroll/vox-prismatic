import type { CalendarEvent, ScheduleRequest } from "@/types/scheduler";
import {
  initDatabase,
  PostService,
} from "@content-creation/database";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Scheduler Events API - RESTful Design
 * GET /api/scheduler/events - Fetch calendar events for specified date range
 * POST /api/scheduler/events - Create new scheduled event
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const postService = new PostService();

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const platforms = searchParams.get("platforms");
    const status = searchParams.get("status");
    const postId = searchParams.get("postId");

    // Require start and end unless filtering by postId
    if (!postId && (!start || !end)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: start and end dates (unless filtering by postId)",
        },
        { status: 400 },
      );
    }

    // Parse platform filters
    const platformList = platforms 
      ? platforms.split(",").filter((p) => ["linkedin", "x"].includes(p)) as Array<'linkedin' | 'x'>
      : ['linkedin', 'x'];

    // Use PostService to get calendar events
    const result = await postService.getCalendarEvents(start, end, platformList);

    if (!result.success) {
      throw new Error(result.error.message);
    }

    // Convert to CalendarEvent format expected by frontend
    const events: CalendarEvent[] = result.data.map((event) => ({
      id: event.id,
      postId: event.postId,
      title: event.title,
      content: event.content,
      platform: event.platform as "linkedin" | "x",
      status: event.status as "pending" | "published" | "failed" | "cancelled",
      scheduledTime: event.scheduledTime, // Now matches repository format
      retryCount: event.retryCount,
      lastAttempt: event.lastAttempt,
      errorMessage: event.error,
      externalPostId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch calendar events",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const postService = new PostService();

    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: postId",
        },
        { status: 400 },
      );
    }

    // Use PostService to unschedule the post
    const result = await postService.unschedulePost(postId);
    
    if (!result.success) {
      if (result.error.message.includes('not found') || result.error.message.includes('No scheduled')) {
        return NextResponse.json({
          success: false,
          error: 'No scheduled post found for this post'
        }, { status: 404 });
      }
      throw new Error(result.error.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Post unscheduled successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Error unscheduling post:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unschedule post'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const postService = new PostService();

    const scheduleData: ScheduleRequest = await request.json();

    const { postId, platform, content, datetime, metadata } = scheduleData;

    // Validate required fields - postId is now REQUIRED
    if (!postId || !platform || !content || !datetime) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: postId, platform, content, datetime",
        },
        { status: 400 },
      );
    }

    // Validate platform
    if (!["linkedin", "x"].includes(platform)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid platform. Must be "linkedin" or "x"',
        },
        { status: 400 },
      );
    }

    // Validate that the scheduled time is in the future
    const scheduledTime = new Date(datetime);
    const now = new Date();

    if (scheduledTime <= now) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot schedule events in the past",
        },
        { status: 400 },
      );
    }

    // Always schedule existing post - never create standalone events
    const result = await postService.schedulePost({
      postId,
      platform,
      content,
      scheduledTime: datetime,
      metadata,
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    const { scheduledPost } = result.data;

    // Convert to CalendarEvent format for consistent response
    const newEvent: CalendarEvent = {
      id: scheduledPost.id,
      postId: scheduledPost.postId,
      title: `${platform}: ${content.substring(0, 50)}...`,
      content,
      platform: platform as "linkedin" | "x",
      status: "pending" as const,
      scheduledTime: datetime,
      retryCount: 0,
      lastAttempt: null,
      errorMessage: null,
      externalPostId: null,
      createdAt: scheduledPost.createdAt,
      updatedAt: scheduledPost.updatedAt,
    };


    return NextResponse.json(
      {
        success: true,
        data: newEvent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating scheduled event:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create scheduled event",
      },
      { status: 500 },
    );
  }
}
