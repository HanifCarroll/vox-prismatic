import type { PostView } from "@/types";
import {
	getDatabase,
	initDatabase,
	insights as insightsTable,
	posts as postsTable,
	scheduledPosts as scheduledPostsTable,
	transcripts as transcriptsTable,
} from "@content-creation/database";
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// Helper function to convert database post to PostView
function convertToPostView(post: any): PostView {
	return {
		id: post.id,
		insightId: post.insightId,
		title: post.title,
		platform: post.platform,
		content: post.content,
		status: post.status,
		characterCount: post.characterCount || undefined,
		createdAt: new Date(post.createdAt),
		updatedAt: new Date(post.updatedAt),
		insightTitle: post.insightTitle || undefined,
		transcriptTitle: post.transcriptTitle || undefined,
	};
}

/**
 * GET /api/posts - Fetch posts with filtering and sorting
 *
 * Query parameters:
 * - status: Filter by post status
 * - platform: Filter by platform
 * - search: Search in title, body, or related content
 * - sortBy: Sort field (createdAt, title, platform, status)
 * - sortOrder: Sort direction (asc, desc)
 * - limit: Number of posts to return
 * - offset: Number of posts to skip
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		// Initialize database connection
		initDatabase();
		const db = getDatabase();

		// Parse query parameters
		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const platform = searchParams.get("platform");
		const search = searchParams.get("search");
		const sortBy = searchParams.get("sortBy") || "createdAt";
		const sortOrder = searchParams.get("sortOrder") || "desc";
		const limit = parseInt(searchParams.get("limit") || "50");
		const offset = parseInt(searchParams.get("offset") || "0");

		// Handle special case for scheduled posts - fetch from scheduledPosts table
		if (status === "scheduled") {
			const scheduledPosts = await db
				.select()
				.from(scheduledPostsTable)
				.orderBy(desc(scheduledPostsTable.scheduledTime))
				.limit(limit);

			// Transform scheduled posts for calendar display
			const events = scheduledPosts.map((post) => {
				const platform = post.platform;
				const startDate = new Date(post.scheduledTime);

				return {
					id: post.id,
					title: `${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${post.content.substring(0, 50)}${post.content.length > 50 ? "..." : ""}`,
					start: startDate.toISOString(),
					end: startDate.toISOString(),
					platform: platform,
					content: post.content,
					status: post.status,
					retryCount: post.retryCount || 0,
					lastAttempt: post.lastAttempt,
					error: post.errorMessage,
				};
			});

			return NextResponse.json({
				success: true,
				data: events,
			});
		}

		// Fetch all posts with joins - simple approach
		const dbPosts = await db
			.select({
				id: postsTable.id,
				insightId: postsTable.insightId,
				title: postsTable.title,
				platform: postsTable.platform,
				content: postsTable.content,
				status: postsTable.status,
				characterCount: postsTable.characterCount,
				createdAt: postsTable.createdAt,
				updatedAt: postsTable.updatedAt,
				insightTitle: insightsTable.title,
				transcriptTitle: transcriptsTable.title,
			})
			.from(postsTable)
			.leftJoin(insightsTable, eq(postsTable.insightId, insightsTable.id))
			.leftJoin(
				transcriptsTable,
				eq(insightsTable.cleanedTranscriptId, transcriptsTable.id),
			)
			.orderBy(desc(postsTable.createdAt));

		// Convert to PostView format
		let posts = dbPosts.map(convertToPostView);

		// Apply filters in memory - simple and reliable
		if (status && status !== "all") {
			posts = posts.filter((post) => post.status === status);
		}

		if (platform && platform !== "all") {
			posts = posts.filter((post) => post.platform === platform);
		}

		if (search) {
			const searchQuery = search.toLowerCase();
			posts = posts.filter(
				(post) =>
					post.title.toLowerCase().includes(searchQuery) ||
					post.content.toLowerCase().includes(searchQuery) ||
					post.insightTitle?.toLowerCase().includes(searchQuery) ||
					post.transcriptTitle?.toLowerCase().includes(searchQuery),
			);
		}

		// Apply sorting
		posts.sort((a, b) => {
			let aVal: any, bVal: any;

			switch (sortBy) {
				case "title":
					aVal = a.title.toLowerCase();
					bVal = b.title.toLowerCase();
					break;
				case "platform":
					aVal = a.platform;
					bVal = b.platform;
					break;
				case "status":
					aVal = a.status;
					bVal = b.status;
					break;
				case "updatedAt":
					aVal = a.updatedAt;
					bVal = b.updatedAt;
					break;
				default:
					aVal = a.createdAt;
					bVal = b.createdAt;
			}

			if (sortOrder === "asc") {
				return aVal > bVal ? 1 : -1;
			} else {
				return aVal < bVal ? 1 : -1;
			}
		});

		// Apply pagination
		const startIndex = offset;
		const endIndex = limit > 0 ? startIndex + limit : posts.length;
		const paginatedPosts = posts.slice(startIndex, endIndex);

		return NextResponse.json({
			success: true,
			data: paginatedPosts,
			meta: {
				total: posts.length,
				count: paginatedPosts.length,
				limit,
				offset,
				hasMore: posts.length === limit, // Simple check, could be more sophisticated
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
		const db = getDatabase();

		// Update the post
		const updatedPost = await db
			.update(postsTable)
			.set({
				...updateData,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(postsTable.id, postId))
			.returning();

		if (updatedPost.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: "Post not found",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json({
			success: true,
			data: updatedPost[0],
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
