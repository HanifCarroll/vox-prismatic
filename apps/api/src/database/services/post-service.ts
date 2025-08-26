import type { Result } from "../index";
import { PostRepository, type PostView } from "../repositories/post-repository";
import {
	ScheduledPostRepository,
	type ScheduledPostView,
} from "../repositories/scheduled-post-repository";
import type { Post } from "../schema";

/**
 * Enhanced Post View with scheduling information
 */
export interface PostWithSchedule extends PostView {
	scheduledPost?: {
		id: string;
		scheduledTime: string;
		platform: "linkedin" | "x";
		status: "pending" | "published" | "failed" | "cancelled";
		retryCount: number;
		lastAttempt?: string | null;
		errorMessage?: string | null;
		externalPostId?: string | null;
	};
}

/**
 * Post scheduling request
 */
export interface SchedulePostRequest {
	postId: string;
	platform: "linkedin" | "x";
	content: string;
	scheduledTime: string;
	metadata?: Record<string, any>;
}

/**
 * Bulk scheduling request
 */
export interface BulkScheduleRequest {
	posts: Array<{
		postId: string;
		platform: "linkedin" | "x";
		content: string;
		scheduledTime: string;
	}>;
}

/**
 * PostService - Coordinates between PostRepository and ScheduledPostRepository
 * Provides a unified interface for the complete post lifecycle
 */
export class PostService {
	private postRepo: PostRepository;
	private scheduledRepo: ScheduledPostRepository;

	constructor() {
		this.postRepo = new PostRepository();
		this.scheduledRepo = new ScheduledPostRepository();
	}

	// =====================================================================
	// Lifecycle Management
	// =====================================================================

	/**
	 * Create a new post
	 */
	async createPost(data: {
		insightId: string;
		title: string;
		content: string;
		platform: "linkedin" | "x";
	}): Promise<Result<PostView>> {
		return this.postRepo.create({
			...data,
			status: "draft",
		});
	}

	/**
	 * Submit post for review
	 */
	async submitForReview(postId: string): Promise<Result<PostView>> {
		const postResult = await this.postRepo.findById(postId);
		if (!postResult.success) return postResult;
		if (!postResult.data) {
			return { success: false, error: new Error("Post not found") };
		}

		if (postResult.data.status !== "draft") {
			return {
				success: false,
				error: new Error("Only draft posts can be submitted for review"),
			};
		}

		return this.postRepo.update(postId, { status: "needs_review" });
	}

	/**
	 * Approve a post for scheduling
	 */
	async approvePost(postId: string): Promise<Result<PostView>> {
		const postResult = await this.postRepo.findById(postId);
		if (!postResult.success) return postResult;
		if (!postResult.data) {
			return { success: false, error: new Error("Post not found") };
		}

		if (postResult.data.status !== "needs_review") {
			return {
				success: false,
				error: new Error("Only posts under review can be approved"),
			};
		}

		return this.postRepo.update(postId, { status: "approved" });
	}

	/**
	 * Reject a post
	 */
	async rejectPost(postId: string, reason?: string): Promise<Result<PostView>> {
		const postResult = await this.postRepo.findById(postId);
		if (!postResult.success) return postResult;
		if (!postResult.data) {
			return { success: false, error: new Error("Post not found") };
		}

		if (postResult.data.status !== "needs_review") {
			return {
				success: false,
				error: new Error("Only posts under review can be rejected"),
			};
		}

		// Update status to draft so it can be edited and resubmitted
		return this.postRepo.update(postId, {
			status: "draft",
			// Could store rejection reason in metadata if needed
		});
	}

	/**
	 * Schedule an approved post for publication
	 */
	async schedulePost(request: SchedulePostRequest): Promise<
		Result<{
			post: PostView;
			scheduledPost: ScheduledPostView;
		}>
	> {
		try {
			// Verify post exists and is approved
			const postResult = await this.postRepo.findById(request.postId);
			if (!postResult.success) {
				return { success: false, error: postResult.error };
			}
			if (!postResult.data) {
				return { success: false, error: new Error("Post not found") };
			}

			const post = postResult.data;
			if (post.status !== "approved") {
				return {
					success: false,
					error: new Error("Post must be approved before scheduling"),
				};
			}

			// Create scheduled post
			const scheduledResult = await this.scheduledRepo.create({
				postId: request.postId,
				platform: request.platform,
				content: request.content,
				scheduledTime: request.scheduledTime,
				status: "pending",
			});

			if (!scheduledResult.success) {
				return { success: false, error: scheduledResult.error };
			}

			// Update post status to scheduled
			const updateResult = await this.postRepo.updateStatus(
				request.postId,
				"scheduled",
			);
			if (!updateResult.success) {
				// Rollback: delete the scheduled post
				await this.scheduledRepo.delete(scheduledResult.data.id);
				return { success: false, error: updateResult.error };
			}

			// Fetch updated post
			const updatedPostResult = await this.postRepo.findById(request.postId);
			if (!updatedPostResult.success || !updatedPostResult.data) {
				return {
					success: false,
					error: new Error("Failed to fetch updated post"),
				};
			}

			return {
				success: true,
				data: {
					post: updatedPostResult.data,
					scheduledPost: scheduledResult.data,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error : new Error("Failed to schedule post"),
			};
		}
	}

	/**
	 * Cancel a scheduled post
	 */
	async cancelScheduledPost(scheduledPostId: string): Promise<Result<void>> {
		try {
			// Get the scheduled post
			const scheduledResult =
				await this.scheduledRepo.findById(scheduledPostId);
			if (!scheduledResult.success) return scheduledResult;
			if (!scheduledResult.data) {
				return { success: false, error: new Error("Scheduled post not found") };
			}

			const scheduledPost = scheduledResult.data;
			if (scheduledPost.status !== "pending") {
				return {
					success: false,
					error: new Error("Only pending scheduled posts can be cancelled"),
				};
			}

			// Update scheduled post status
			const cancelResult = await this.scheduledRepo.updateStatus(
				scheduledPostId,
				"cancelled",
			);
			if (!cancelResult.success) return cancelResult;

			// If linked to a post, revert its status to approved
			if (scheduledPost.postId) {
				await this.postRepo.updateStatus(scheduledPost.postId, "approved");
			}

			return { success: true, data: undefined };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to cancel scheduled post"),
			};
		}
	}

	/**
	 * Unschedule a post by removing its scheduled post
	 */
	async unschedulePost(postId: string): Promise<Result<{ scheduledPostId: string }>> {
		try {
			// Find the scheduled post for this post
			const scheduledResult = await this.scheduledRepo.findAll({ postId });
			if (!scheduledResult.success) return scheduledResult;

			const scheduledPosts = scheduledResult.data;
			if (scheduledPosts.length === 0) {
				return { 
					success: false, 
					error: new Error(`No scheduled post found for post ID: ${postId}`) 
				};
			}

			const scheduledPost = scheduledPosts[0]; // Only one due to 1:1 relationship

			// Delete the scheduled post
			const deleteResult = await this.scheduledRepo.delete(scheduledPost.id);
			if (!deleteResult.success) return deleteResult;

			// Update the post status back to approved
			const updateResult = await this.postRepo.updateStatus(postId, 'approved');
			if (!updateResult.success) {
				console.warn(`Failed to update post status after unscheduling: ${updateResult.error.message}`);
				// Don't fail the whole operation - the scheduled post is already deleted
			}

			return { 
				success: true, 
				data: { scheduledPostId: scheduledPost.id } 
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to unschedule post"),
			};
		}
	}

	/**
	 * Mark a scheduled post as published
	 */
	async markAsPublished(
		scheduledPostId: string,
		externalPostId?: string,
	): Promise<Result<void>> {
		try {
			// Get the scheduled post
			const scheduledResult =
				await this.scheduledRepo.findById(scheduledPostId);
			if (!scheduledResult.success) return scheduledResult;
			if (!scheduledResult.data) {
				return { success: false, error: new Error("Scheduled post not found") };
			}

			const scheduledPost = scheduledResult.data;

			// Update scheduled post
			const updateData: any = {
				status: "published",
				externalPostId: externalPostId || scheduledPost.externalPostId,
			};

			const updateResult = await this.scheduledRepo.update(
				scheduledPostId,
				updateData,
			);
			if (!updateResult.success)
				return { success: false, error: updateResult.error };

			// Update linked post status if exists
			if (scheduledPost.postId) {
				await this.postRepo.updateStatus(scheduledPost.postId, "published");
			}

			return { success: true, data: undefined };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to mark as published"),
			};
		}
	}

	/**
	 * Record a publication failure
	 */
	async recordPublicationFailure(
		scheduledPostId: string,
		error: string,
		shouldRetry: boolean = true,
	): Promise<Result<void>> {
		try {
			const scheduledResult =
				await this.scheduledRepo.findById(scheduledPostId);
			if (!scheduledResult.success) return scheduledResult;
			if (!scheduledResult.data) {
				return { success: false, error: new Error("Scheduled post not found") };
			}

			const scheduledPost = scheduledResult.data;
			const newRetryCount = scheduledPost.retryCount + 1;
			const maxRetries = 3;

			const updateData: any = {
				retryCount: newRetryCount,
				lastAttempt: new Date().toISOString(),
				errorMessage: error,
			};

			// Mark as failed if max retries exceeded or retry not requested
			if (!shouldRetry || newRetryCount >= maxRetries) {
				updateData.status = "failed";

				// Update linked post status
				if (scheduledPost.postId) {
					await this.postRepo.updateStatus(scheduledPost.postId, "failed");
				}
			}

			const updateResult = await this.scheduledRepo.update(
				scheduledPostId,
				updateData,
			);
			return updateResult.success
				? { success: true, data: undefined }
				: { success: false, error: updateResult.error };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to record publication failure"),
			};
		}
	}

	// =====================================================================
	// Scheduler-Specific Methods
	// =====================================================================

	/**
	 * Get initial data for scheduler page (events and approved posts)
	 */
	async getSchedulerData(
		view: 'day' | 'week' | 'month',
		currentDate: Date,
		platforms?: Array<'linkedin' | 'x'>
	): Promise<Result<{ events: any[]; approvedPosts: any[] }>> {
		try {
			// Calculate date range based on view
			const dateRange = this.calculateDateRange(view, currentDate);
			
			// Get calendar events
			const eventsResult = await this.getCalendarEvents(
				dateRange.start.toISOString(),
				dateRange.end.toISOString(),
				platforms
			);
			if (!eventsResult.success) return eventsResult;

			// Get approved posts
			const approvedPostsResult = await this.postRepo.getApprovedPostsForScheduler();
			if (!approvedPostsResult.success) return approvedPostsResult;

			return {
				success: true,
				data: {
					events: eventsResult.data,
					approvedPosts: approvedPostsResult.data
				}
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error('Failed to get scheduler data')
			};
		}
	}

	/**
	 * Get calendar events for date range with platform filtering
	 */
	async getCalendarEvents(
		start: string,
		end: string,
		platforms?: Array<'linkedin' | 'x'>
	): Promise<Result<any[]>> {
		try {
			const filters: any = {
				scheduledAfter: start,
				scheduledBefore: end
			};

			// Add platform filtering if specified
			if (platforms && platforms.length > 0) {
				// Note: This assumes the repository supports platform filtering
				// If not, we'll filter in memory
			}

			const result = await this.scheduledRepo.findAsCalendarEvents(filters);
			if (!result.success) return result;

			let events = result.data;

			// Filter by platform if needed (in-memory filtering)
			if (platforms && platforms.length > 0) {
				events = events.filter(event => platforms.includes(event.platform as any));
			}

			return { success: true, data: events };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error('Failed to get calendar events')
			};
		}
	}

	/**
	 * Calculate date range for a given view and current date
	 */
	private calculateDateRange(view: 'day' | 'week' | 'month', currentDate: Date) {
		const start = new Date(currentDate);
		const end = new Date(currentDate);

		switch (view) {
			case 'day':
				start.setHours(0, 0, 0, 0);
				end.setHours(23, 59, 59, 999);
				break;
			case 'week':
				// Start of ISO week (Monday)
				const dayOfWeek = start.getDay();
				const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
				start.setDate(diff);
				start.setHours(0, 0, 0, 0);
				
				// End of week (Sunday)
				end.setDate(start.getDate() + 6);
				end.setHours(23, 59, 59, 999);
				break;
			case 'month':
				start.setDate(1);
				start.setHours(0, 0, 0, 0);
				end.setMonth(end.getMonth() + 1, 0);
				end.setHours(23, 59, 59, 999);
				break;
		}

		return { start, end };
	}

	// =====================================================================
	// Query Methods
	// =====================================================================

	/**
	 * Get post with its scheduling information
	 */
	async getPostWithSchedule(postId: string): Promise<Result<PostWithSchedule>> {
		try {
			const postResult = await this.postRepo.findById(postId);
			if (!postResult.success) return postResult;
			if (!postResult.data) {
				return { success: false, error: new Error("Post not found") };
			}

			const post = postResult.data;
			const result: PostWithSchedule = { ...post };

			// If post is scheduled, get scheduling details
			if (post.status === "scheduled" || post.status === "published") {
				const scheduledResult = await this.scheduledRepo.findAll({
					search: postId, // This will need adjustment based on actual filter implementation
				});

				if (scheduledResult.success && scheduledResult.data.length > 0) {
					const scheduled = scheduledResult.data[0];
					result.scheduledPost = {
						id: scheduled.id,
						scheduledTime: scheduled.scheduledTime,
						platform: scheduled.platform,
						status: scheduled.status,
						retryCount: scheduled.retryCount,
						lastAttempt: scheduled.lastAttempt,
						errorMessage: scheduled.errorMessage,
						externalPostId: scheduled.externalPostId,
					};
				}
			}

			return { success: true, data: result };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to get post with schedule"),
			};
		}
	}

	/**
	 * Get approved posts for scheduler
	 */
	async getApprovedPosts(): Promise<Result<PostView[]>> {
		return this.postRepo.getApprovedPostsForScheduler();
	}

	/**
	 * Get posts with filtering and pagination
	 */
	async getPosts(filters?: {
		status?: string;
		platform?: string;
		search?: string;
		limit?: number;
		offset?: number;
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
	}): Promise<Result<PostView[]>> {
		const postFilters: any = {};
		
		if (filters?.status && filters.status !== 'all') {
			postFilters.status = filters.status;
		}
		if (filters?.platform && filters.platform !== 'all') {
			postFilters.platform = filters.platform;
		}
		if (filters?.search) {
			postFilters.search = filters.search;
		}
		if (filters?.limit) {
			postFilters.limit = filters.limit;
		}
		if (filters?.offset) {
			postFilters.offset = filters.offset;
		}
		if (filters?.sortBy) {
			postFilters.sortBy = filters.sortBy;
		}
		if (filters?.sortOrder) {
			postFilters.sortOrder = filters.sortOrder;
		}

		return this.postRepo.findWithRelatedData(postFilters);
	}

	/**
	 * Get all posts with their scheduling information
	 */
	async getPostsWithSchedule(filter?: {
		status?: Post["status"];
		platform?: "linkedin" | "x";
		insightId?: string;
	}): Promise<Result<PostWithSchedule[]>> {
		try {
			const postsResult = await this.postRepo.findWithRelatedData(filter);
			if (!postsResult.success) return postsResult;

			const posts = postsResult.data;
			const scheduledPostIds = posts
				.filter((p) => p.status === "scheduled" || p.status === "published")
				.map((p) => p.id);

			if (scheduledPostIds.length === 0) {
				return { success: true, data: posts };
			}

			// Get all scheduled posts for these post IDs
			const scheduledResult = await this.scheduledRepo.findAll();
			if (!scheduledResult.success) {
				return { success: true, data: posts }; // Return posts without schedule info
			}

			// Create a map of postId to scheduled post
			const scheduledMap = new Map<string, ScheduledPostView>();
			for (const scheduled of scheduledResult.data) {
				if (scheduled.postId && scheduledPostIds.includes(scheduled.postId)) {
					scheduledMap.set(scheduled.postId, scheduled);
				}
			}

			// Combine posts with their schedule information
			const postsWithSchedule: PostWithSchedule[] = posts.map((post) => {
				const result: PostWithSchedule = { ...post };
				const scheduled = scheduledMap.get(post.id);

				if (scheduled) {
					result.scheduledPost = {
						id: scheduled.id,
						scheduledTime: scheduled.scheduledTime,
						platform: scheduled.platform,
						status: scheduled.status,
						retryCount: scheduled.retryCount,
						lastAttempt: scheduled.lastAttempt,
						errorMessage: scheduled.errorMessage,
						externalPostId: scheduled.externalPostId,
					};
				}

				return result;
			});

			return { success: true, data: postsWithSchedule };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to get posts with schedule"),
			};
		}
	}

	/**
	 * Get posts by workflow stage
	 */
	async getPostsByStage(
		stage: "draft" | "review" | "approved" | "scheduled" | "published",
	): Promise<Result<PostView[]>> {
		const statusMap = {
			draft: "draft" as const,
			review: "needs_review" as const,
			approved: "approved" as const,
			scheduled: "scheduled" as const,
			published: "published" as const,
		};

		return this.postRepo.getByStatus(statusMap[stage]);
	}

	/**
	 * Get upcoming scheduled posts
	 */
	async getUpcomingPosts(hours: number = 24): Promise<
		Result<
			Array<{
				post?: PostView;
				scheduledPost: ScheduledPostView;
			}>
		>
	> {
		try {
			const now = new Date();
			const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

			const scheduledResult = await this.scheduledRepo.findAll({
				status: "pending",
				scheduledAfter: now.toISOString(),
				scheduledBefore: future.toISOString(),
			});

			if (!scheduledResult.success) return scheduledResult;

			// Get associated posts if they exist
			const results = await Promise.all(
				scheduledResult.data.map(async (scheduled) => {
					if (scheduled.postId) {
						const postResult = await this.postRepo.findById(scheduled.postId);
						return {
							post:
								postResult.success && postResult.data
									? postResult.data
									: undefined,
							scheduledPost: scheduled,
						};
					}
					return { scheduledPost: scheduled, post: undefined };
				}),
			);

			return { success: true, data: results };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to get upcoming posts"),
			};
		}
	}

	/**
	 * Bulk schedule multiple posts
	 */
	async bulkSchedulePosts(request: BulkScheduleRequest): Promise<
		Result<{
			successful: Array<{ postId: string; scheduledPostId: string }>;
			failed: Array<{ postId: string; error: string }>;
		}>
	> {
		const successful: Array<{ postId: string; scheduledPostId: string }> = [];
		const failed: Array<{ postId: string; error: string }> = [];

		for (const item of request.posts) {
			const result = await this.schedulePost(item);
			if (result.success) {
				successful.push({
					postId: item.postId,
					scheduledPostId: result.data.scheduledPost.id,
				});
			} else {
				failed.push({
					postId: item.postId,
					error: result.error.message,
				});
			}
		}

		return {
			success: true,
			data: { successful, failed },
		};
	}

	/**
	 * Update post status
	 */
	async updatePostStatus(
		postId: string,
		status: Post["status"],
	): Promise<Result<PostView>> {
		const updateResult = await this.postRepo.updateStatus(postId, status);
		if (!updateResult.success) return updateResult;
		const postResult = await this.postRepo.findById(postId);
		if (!postResult.success) return postResult;
		if (!postResult.data) {
			return { success: false, error: new Error("Post not found") };
		}
		return { success: true, data: postResult.data };
	}

	/**
	 * Get comprehensive statistics
	 */
	async getStatistics(): Promise<
		Result<{
			posts: {
				total: number;
				byStatus: Record<string, number>;
				byPlatform: Record<string, number>;
			};
			scheduled: {
				total: number;
				pending: number;
				published: number;
				failed: number;
				upcoming24h: number;
			};
		}>
	> {
		try {
			const postStatsResult = await this.postRepo.getStats();
			const scheduledStatsResult = await this.scheduledRepo.getStats();

			if (!postStatsResult.success || !scheduledStatsResult.success) {
				return {
					success: false,
					error: new Error("Failed to get statistics"),
				};
			}

			// Calculate platform distribution from posts
			const postsResult = await this.postRepo.findWithRelatedData();
			const byPlatform: Record<string, number> = {};

			if (postsResult.success) {
				for (const post of postsResult.data) {
					byPlatform[post.platform] = (byPlatform[post.platform] || 0) + 1;
				}
			}

			return {
				success: true,
				data: {
					posts: {
						total: postStatsResult.data.total,
						byStatus: postStatsResult.data.byStatus,
						byPlatform,
					},
					scheduled: {
						total: scheduledStatsResult.data.total,
						pending: scheduledStatsResult.data.byStatus.pending || 0,
						published: scheduledStatsResult.data.byStatus.published || 0,
						failed: scheduledStatsResult.data.byStatus.failed || 0,
						upcoming24h: scheduledStatsResult.data.upcoming24h,
					},
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to get statistics"),
			};
		}
	}

	// =====================================================================
	// Social Media Publishing Methods
	// =====================================================================

	/**
	 * Publish a scheduled post to LinkedIn
	 */
	async publishToLinkedIn(
		scheduledPostId: string,
		accessToken: string,
	): Promise<Result<{ externalPostId: string }>> {
		const { PublisherService } = await import('../../services/publisher');
		const publisher = new PublisherService();

		try {
			const credentials = {
				linkedin: { accessToken }
			};

			const result = await publisher.publishScheduledPost(scheduledPostId, credentials);
			
			if (result.success && result.externalPostId) {
				return {
					success: true,
					data: { externalPostId: result.externalPostId }
				};
			}

			return {
				success: false,
				error: new Error(result.error || 'Failed to publish to LinkedIn')
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error('Failed to publish to LinkedIn')
			};
		}
	}

	/**
	 * Publish a scheduled post to X (Twitter)
	 */
	async publishToX(
		scheduledPostId: string,
		accessToken: string,
	): Promise<Result<{ externalPostId: string }>> {
		const { PublisherService } = await import('../../services/publisher');
		const publisher = new PublisherService();

		try {
			const credentials = {
				x: { accessToken }
			};

			const result = await publisher.publishScheduledPost(scheduledPostId, credentials);
			
			if (result.success && result.externalPostId) {
				return {
					success: true,
					data: { externalPostId: result.externalPostId }
				};
			}

			return {
				success: false,
				error: new Error(result.error || 'Failed to publish to X')
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error('Failed to publish to X')
			};
		}
	}

	/**
	 * Publish immediately to a platform (without scheduling)
	 */
	async publishImmediately(
		postId: string,
		platform: 'linkedin' | 'x',
		accessToken: string,
	): Promise<Result<{ externalPostId: string }>> {
		try {
			// Get the post
			const postResult = await this.postRepo.findById(postId);
			if (!postResult.success || !postResult.data) {
				return {
					success: false,
					error: new Error(`Post not found: ${postId}`)
				};
			}

			const post = postResult.data;
			const content = post.content;

			// Import publisher dynamically
			const { PublisherService } = await import('../../services/publisher');
			const publisher = new PublisherService();

			let publishResult: Result<{ externalPostId: string }>;

			if (platform === 'linkedin') {
				publishResult = await publisher.publishToLinkedIn(content, { accessToken });
			} else if (platform === 'x') {
				publishResult = await publisher.publishToX(content, { accessToken });
			} else {
				return {
					success: false,
					error: new Error(`Unsupported platform: ${platform}`)
				};
			}

			if (publishResult.success) {
				// Update post status to published
				await this.postRepo.updateStatus(postId, 'published');
			}

			return publishResult;
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error('Failed to publish immediately')
			};
		}
	}

	/**
	 * Process all scheduled posts that are due for publishing
	 */
	async processScheduledPosts(credentials: {
		linkedin?: { accessToken: string };
		x?: { accessToken: string };
	}): Promise<Result<{
		processed: number;
		successful: number;
		failed: number;
		errors: string[];
	}>> {
		try {
			const { PublisherService } = await import('../../services/publisher');
			const publisher = new PublisherService();
			
			const result = await publisher.processScheduledPosts(credentials);
			
			return {
				success: true,
				data: result
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error('Failed to process scheduled posts')
			};
		}
	}
}
