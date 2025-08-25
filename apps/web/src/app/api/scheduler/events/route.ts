import type { CalendarEvent, ScheduleRequest } from "@/types/scheduler";
import {
  initDatabase,
  PostService,
  ScheduledPostRepository,
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
    const scheduledPostRepo = new ScheduledPostRepository();

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const platforms = searchParams.get("platforms");
    const status = searchParams.get("status");

    if (!start || !end) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: start and end dates",
        },
        { status: 400 },
      );
    }

    // Build filters
    const filters: any = {
      scheduledAfter: start,
      scheduledBefore: end,
    };

    if (platforms) {
      const platformList = platforms
        .split(",")
        .filter((p) => ["linkedin", "x"].includes(p));
      if (platformList.length > 0) {
        // Note: ScheduledPostRepository doesn't have platform filtering yet
        // This would need to be added to the repository
      }
    }

    if (status && status !== "all") {
      filters.status = status;
    }

    // Fetch calendar events
    const result = await scheduledPostRepo.findAsCalendarEvents(filters);

    if (!result.success) {
      throw new Error(result.error.message);
    }

    // Convert to CalendarEvent format expected by frontend
    const events: CalendarEvent[] = result.data.map((event) => ({
      id: event.id,
      postId: event.postId, // Using scheduled post id as postId
      title: event.title,
      content: event.content,
      platform: event.platform as "linkedin" | "x",
      status: event.status as "pending" | "published" | "failed" | "cancelled",
      scheduledTime: event.start,
      start: new Date(event.start),
      end: new Date(event.end || event.start), // Use same time if no end time
      retryCount: event.retryCount,
      lastAttempt: event.lastAttempt,
      errorMessage: event.error,
      externalPostId: null, // Not available in the current schema
      createdAt: new Date(), // Would need to add this to CalendarEvent interface
      updatedAt: new Date(), // Would need to add this to CalendarEvent interface
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database
    initDatabase();
    const postService = new PostService();
    const scheduledPostRepo = new ScheduledPostRepository();

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
      start: new Date(datetime),
      end: new Date(datetime),
      retryCount: 0,
      lastAttempt: null,
      errorMessage: null,
      externalPostId: null,
      createdAt: scheduledPost.createdAt,
      updatedAt: scheduledPost.updatedAt,
    };

    console.log(
      `📅 New event created: ${scheduledPost.id} for ${platform} at ${datetime}`,
    );

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
