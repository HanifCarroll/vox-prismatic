import { count, desc, eq } from "drizzle-orm";
import type { Result } from "../index";
import {
	type NewScheduledPost,
	type ScheduledPost,
	scheduledPosts as scheduledPostsTable,
} from "../schema";
import type { ScheduledPostFilter, ScheduledPostStats } from "../types/filters";
import { BaseRepository } from "./base-repository";

/**
 * Calendar Event interface (for calendar display)
 * Aligned with frontend CalendarEvent interface
 */
export interface CalendarEvent {
	id: string;
	postId: string;
	title: string;
	scheduledTime: string;
	platform: string;
	content: string;
	status: string;
	retryCount: number;
	lastAttempt?: string | null;
	error?: string | null;
}

/**
 * ScheduledPostView interface (standard view)
 */
export interface ScheduledPostView {
	id: string;
	postId: string;
	platform: "linkedin" | "x";
	content: string;
	scheduledTime: string;
	status: "pending" | "published" | "failed" | "cancelled";
	retryCount: number;
	lastAttempt?: string | null;
	errorMessage?: string | null;
	externalPostId?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * ScheduledPostRepository - Handle all scheduled post data operations
 * Includes both calendar events and standard scheduled post operations
 */
export class ScheduledPostRepository extends BaseRepository {
	/**
	 * Convert database scheduled post to standard view format
	 */
	private convertToView(scheduledPost: ScheduledPost): ScheduledPostView {
		return {
			id: scheduledPost.id,
			postId: scheduledPost.postId,
			platform: scheduledPost.platform as ScheduledPostView["platform"],
			content: scheduledPost.content,
			scheduledTime: scheduledPost.scheduledTime,
			status: scheduledPost.status as ScheduledPostView["status"],
			retryCount: scheduledPost.retryCount || 0,
			lastAttempt: scheduledPost.lastAttempt,
			errorMessage: scheduledPost.errorMessage,
			externalPostId: scheduledPost.externalPostId,
			createdAt: new Date(scheduledPost.createdAt),
			updatedAt: new Date(scheduledPost.updatedAt),
		};
	}

	/**
	 * Convert database scheduled post to calendar event format
	 */
	private convertToCalendarEvent(scheduledPost: ScheduledPost): CalendarEvent {
		const platform = scheduledPost.platform;

		return {
			id: scheduledPost.id,
			postId: scheduledPost.postId,
			title: `${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${scheduledPost.content.substring(
				0,
				50,
			)}${scheduledPost.content.length > 50 ? "..." : ""}`,
			scheduledTime: scheduledPost.scheduledTime,
			platform: platform,
			content: scheduledPost.content,
			status: scheduledPost.status,
			retryCount: scheduledPost.retryCount || 0,
			lastAttempt: scheduledPost.lastAttempt,
			error: scheduledPost.errorMessage,
		};
	}

	/**
	 * Find all scheduled posts with filtering
	 */
	async findAll(
		filters?: ScheduledPostFilter,
	): Promise<Result<ScheduledPostView[]>> {
		return this.execute(async () => {
			// Simple query approach and filter in memory
			const dbScheduledPosts = await this.db
				.select()
				.from(scheduledPostsTable)
				.orderBy(desc(scheduledPostsTable.scheduledTime));

			// Convert to view format
			let scheduledPostViews = dbScheduledPosts.map(this.convertToView);

			// Apply filters in memory
			if (filters?.status && filters.status !== "all") {
				scheduledPostViews = scheduledPostViews.filter(
					(post) => post.status === filters.status,
				);
			}

			if (filters?.platform && filters.platform !== "all") {
				scheduledPostViews = scheduledPostViews.filter(
					(post) => post.platform === filters.platform,
				);
			}

			// Date range filtering
			if (filters?.scheduledAfter) {
				const afterDate = new Date(filters.scheduledAfter);
				scheduledPostViews = scheduledPostViews.filter(
					(post) => new Date(post.scheduledTime) >= afterDate,
				);
			}

			if (filters?.scheduledBefore) {
				const beforeDate = new Date(filters.scheduledBefore);
				scheduledPostViews = scheduledPostViews.filter(
					(post) => new Date(post.scheduledTime) <= beforeDate,
				);
			}

			if (filters?.postId) {
				scheduledPostViews = scheduledPostViews.filter(
					(post) => post.postId === filters.postId,
				);
			}

			if (filters?.search) {
				const searchQuery = filters.search.toLowerCase();
				scheduledPostViews = scheduledPostViews.filter((post) =>
					post.content.toLowerCase().includes(searchQuery),
				);
			}

			// Apply sorting
			if (filters?.sortBy) {
				scheduledPostViews = this.applySorting(
					scheduledPostViews,
					filters.sortBy,
					filters.sortOrder,
				);
			}

			// Apply pagination
			if (filters?.offset) {
				scheduledPostViews = scheduledPostViews.slice(filters.offset);
			}

			if (filters?.limit) {
				scheduledPostViews = scheduledPostViews.slice(0, filters.limit);
			}

			return scheduledPostViews;
		}, "Failed to fetch scheduled posts");
	}

	/**
	 * Find scheduled posts as calendar events (for calendar display)
	 */
	async findAsCalendarEvents(
		filters?: ScheduledPostFilter,
	): Promise<Result<CalendarEvent[]>> {
		return this.execute(async () => {
			// Simple query approach and filter in memory
			const dbScheduledPosts = await this.db
				.select()
				.from(scheduledPostsTable)
				.orderBy(desc(scheduledPostsTable.scheduledTime));

			// Convert to calendar events
			let calendarEvents = dbScheduledPosts.map(this.convertToCalendarEvent);

			// Apply filters in memory
			if (filters?.status && filters.status !== "all") {
				calendarEvents = calendarEvents.filter(
					(event) => event.status === filters.status,
				);
			}

			if (filters?.platform && filters.platform !== "all") {
				calendarEvents = calendarEvents.filter(
					(event) => event.platform === filters.platform,
				);
			}

			// Date range filtering for calendar view
			if (filters?.scheduledAfter) {
				const afterDate = new Date(filters.scheduledAfter);
				calendarEvents = calendarEvents.filter(
					(event) => new Date(event.scheduledTime) >= afterDate,
				);
			}

			if (filters?.scheduledBefore) {
				const beforeDate = new Date(filters.scheduledBefore);
				calendarEvents = calendarEvents.filter(
					(event) => new Date(event.scheduledTime) <= beforeDate,
				);
			}

			if (filters?.postId) {
				calendarEvents = calendarEvents.filter(
					(event) => event.postId === filters.postId,
				);
			}

			// Apply limit for calendar performance
			const limit = filters?.limit || 100; // Default limit for calendar to prevent performance issues
			if (limit) {
				calendarEvents = calendarEvents.slice(0, limit);
			}

			return calendarEvents;
		}, "Failed to fetch calendar events");
	}

	/**
	 * Find scheduled post by ID
	 */
	async findById(id: string): Promise<Result<ScheduledPostView | null>> {
		return this.execute(async () => {
			const [scheduledPost] = await this.db
				.select()
				.from(scheduledPostsTable)
				.where(eq(scheduledPostsTable.id, id))
				.limit(1);

			return scheduledPost ? this.convertToView(scheduledPost) : null;
		}, `Failed to fetch scheduled post ${id}`);
	}

	/**
	 * Create new scheduled post
	 */
	async create(
		data: Partial<NewScheduledPost> & {
			postId: string;
			platform: "linkedin" | "x";
			content: string;
			scheduledTime: string;
		},
	): Promise<Result<ScheduledPostView>> {
		return this.execute(async () => {
			const now = this.now();
			const id = this.generateId("scheduled");

			const newScheduledPostData: NewScheduledPost = {
				id,
				postId: data.postId,
				platform: data.platform,
				content: data.content,
				scheduledTime: data.scheduledTime,
				status: data.status || "pending",
				retryCount: data.retryCount || 0,
				lastAttempt: data.lastAttempt || null,
				errorMessage: data.errorMessage || null,
				externalPostId: data.externalPostId || null,
				createdAt: now,
				updatedAt: now,
			};

			await this.db.insert(scheduledPostsTable).values(newScheduledPostData);

			console.log(
				`📅 Created scheduled post: ${id} for ${data.platform} at ${data.scheduledTime}`,
			);

			return this.convertToView(newScheduledPostData as ScheduledPost);
		}, "Failed to create scheduled post");
	}

	/**
	 * Update scheduled post
	 */
	async update(
		id: string,
		data: Partial<NewScheduledPost>,
	): Promise<Result<ScheduledPostView>> {
		return this.execute(async () => {
			const updateData: any = {
				...data,
				updatedAt: this.now(),
			};

			await this.db
				.update(scheduledPostsTable)
				.set(updateData)
				.where(eq(scheduledPostsTable.id, id));

			// Fetch updated scheduled post
			const result = await this.findById(id);
			if (!result.success || !result.data) {
				throw new Error(`Scheduled post not found after update: ${id}`);
			}

			console.log(`📅 Updated scheduled post: ${id}`);
			return result.data;
		}, `Failed to update scheduled post ${id}`);
	}

	/**
	 * Update scheduled post status
	 */
	async updateStatus(
		id: string,
		status: ScheduledPost["status"],
	): Promise<Result<void>> {
		return this.execute(async () => {
			const result = await this.db
				.update(scheduledPostsTable)
				.set({
					status,
					updatedAt: this.now(),
				})
				.where(eq(scheduledPostsTable.id, id));

			// Note: bun:sqlite doesn't provide changes count - trusting operation succeeded

			console.log(`📊 Scheduled post ${id} status updated to: ${status}`);
		}, `Failed to update scheduled post status for ${id}`);
	}

	/**
	 * Get upcoming scheduled posts (next 24 hours)
	 */
	async getUpcoming24h(): Promise<Result<ScheduledPostView[]>> {
		const now = new Date();
		const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

		return this.findAll({
			status: "pending",
			scheduledAfter: now.toISOString(),
			scheduledBefore: tomorrow.toISOString(),
		});
	}

	/**
	 * Get scheduled post statistics for dashboard
	 */
	async getStats(): Promise<Result<ScheduledPostStats>> {
		return this.execute(async () => {
			// Get total count of pending scheduled posts
			const [totalResult] = await this.db
				.select({ count: count() })
				.from(scheduledPostsTable)
				.where(eq(scheduledPostsTable.status, "pending"));

			const total = totalResult?.count || 0;

			// Get counts by status using raw SQLite connection
			const statusResults = this.sqlite
				.prepare(
					"SELECT status, COUNT(*) as count FROM scheduled_posts GROUP BY status",
				)
				.all() as { status: string; count: number }[];

			const byStatus: Record<string, number> = {};
			for (const row of statusResults) {
				byStatus[row.status] = Number(row.count);
			}

			// Get counts by platform for pending posts
			const platformResults = this.sqlite
				.prepare(
					"SELECT platform, COUNT(*) as count FROM scheduled_posts WHERE status = ? GROUP BY platform",
				)
				.all("pending") as { platform: string; count: number }[];

			const byPlatform: Record<string, number> = {};
			for (const row of platformResults) {
				byPlatform[row.platform] = Number(row.count);
			}

			// Get upcoming 24h count
			const upcoming24hResult = await this.getUpcoming24h();
			const upcoming24h = upcoming24hResult.success
				? upcoming24hResult.data.length
				: 0;

			return {
				total,
				byStatus,
				byPlatform,
				upcoming24h,
			};
		}, "Failed to get scheduled post statistics");
	}

	/**
	 * Delete scheduled post
	 */
	async delete(id: string): Promise<Result<void>> {
		return this.execute(async () => {
			const result = await this.db
				.delete(scheduledPostsTable)
				.where(eq(scheduledPostsTable.id, id));

			// Note: bun:sqlite doesn't provide changes count - trusting operation succeeded

			console.log(`🗑️ Deleted scheduled post: ${id}`);
		}, `Failed to delete scheduled post ${id}`);
	}
}
