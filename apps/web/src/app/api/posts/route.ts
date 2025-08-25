import {
	initDatabase,
	PostRepository,
	ScheduledPostRepository,
	type PostFilter,
	type ScheduledPostFilter
} from "@content-creation/database";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/posts - Fetch posts with filtering and sorting
 * Now uses repository pattern for clean data access
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		// Initialize database connection
		initDatabase();
		const postRepo = new PostRepository();
		const scheduledRepo = new ScheduledPostRepository();

		// Parse query parameters
		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const platform = searchParams.get("platform");
		const search = searchParams.get("search");
		const sortBy = searchParams.get("sortBy") || "createdAt";
		const sortOrder = searchParams.get("sortOrder") || "desc";
		const limit = parseInt(searchParams.get("limit") || "50");
		const offset = parseInt(searchParams.get("offset") || "0");

		// Handle special case for scheduled posts - return calendar events
		if (status === "scheduled") {
			const scheduledFilters: ScheduledPostFilter = { 
				limit,
				sortBy: 'scheduledTime',
				sortOrder: 'desc'
			};

			// Get calendar events using repository
			const result = await scheduledRepo.findAsCalendarEvents(scheduledFilters);
			
			if (!result.success) {
				throw result.error;
			}

			return NextResponse.json({
				success: true,
				data: result.data,
			});
		}

		// Build filters for regular posts
		const filters: PostFilter = {
			limit,
			offset,
			sortBy,
			sortOrder: sortOrder as 'asc' | 'desc'
		};

		if (status && status !== "all") {
			filters.status = status as PostFilter['status'];
		}

		if (platform && platform !== "all") {
			filters.platform = platform as PostFilter['platform'];
		}

		if (search) {
			filters.search = search;
		}

		// Fetch posts using repository with all JOIN logic handled
		const result = await postRepo.findWithRelatedData(filters);
		
		if (!result.success) {
			throw result.error;
		}

		return NextResponse.json({
			success: true,
			data: result.data,
			meta: {
				total: result.data.length,
				count: result.data.length,
				limit,
				offset,
				hasMore: result.data.length === limit,
			},
		});
	} catch (error) {
		console.error("Failed to fetch posts:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to fetch posts",
			},
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/posts?id=<postId> - Update a post
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
	try {
		const { searchParams } = new URL(request.url);
		const postId = searchParams.get("id");

		if (!postId) {
			return NextResponse.json(
				{
					success: false,
					error: "Post ID is required",
				},
				{ status: 400 },
			);
		}

		const updateData = await request.json();

		// Initialize database connection
		initDatabase();
		const postRepo = new PostRepository();

		// Update the post using repository
		const result = await postRepo.update(postId, updateData);

		if (!result.success) {
			if (result.error.message.includes('not found')) {
				return NextResponse.json(
					{
						success: false,
						error: "Post not found",
					},
					{ status: 404 },
				);
			}
			throw result.error;
		}

		return NextResponse.json({
			success: true,
			data: result.data,
		});
	} catch (error) {
		console.error("Failed to update post:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to update post",
			},
			{ status: 500 },
		);
	}
}
