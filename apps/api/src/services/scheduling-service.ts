import type { Result } from "../types/common";
import { PostRepository, type PostView } from "../repositories/post-repository";
import {
	ScheduledPostRepository,
	type ScheduledPostView,
	type CalendarEvent,
} from "../repositories/scheduled-post-repository";

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
 * SchedulingService - Handles all post scheduling operations
 * Coordinates between PostRepository and ScheduledPostRepository for scheduling workflows
 */
export class SchedulingService {
	// Repository dependencies injected via constructor

	constructor(
		private postRepo = new PostRepository(),
		private scheduledRepo = new ScheduledPostRepository()
	) {}

	/**
	 * Schedule a post for publication at a specific time
	 */
	async schedulePost(request: SchedulePostRequest): Promise<
		Result<{
			post: PostView;
			scheduledPost: ScheduledPostView;
		}>
	> {
		try {
			// Validate the post exists and is approved
			const postResult = await this.postRepo.findById(request.postId);
			if (!postResult.success || !postResult.data) {
				return {
					success: false,
					error: new Error(`Post not found: ${request.postId}`),
				};
			}

			const post = postResult.data;

			// Verify post is approved
			if (post.status !== "approved") {
				return {
					success: false,
					error: new Error(
						`Post must be approved before scheduling. Current status: ${post.status}`,
					),
				};
			}

			// Validate scheduled time is in the future
			const scheduledTime = new Date(request.scheduledTime);
			const now = new Date();
			if (scheduledTime <= now) {
				return {
					success: false,
					error: new Error("Scheduled time must be in the future"),
				};
			}

			// Check for scheduling conflicts (optional business rule)
			const conflictResult = await this.checkSchedulingConflict(
				request.platform,
				scheduledTime,
			);
			if (!conflictResult.success) {
				return conflictResult;
			}

			// Create scheduled post entry
			const scheduledData = {
				id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				postId: request.postId,
				platform: request.platform,
				content: request.content,
				scheduledTime: request.scheduledTime,
				status: "pending" as const,
				retryCount: 0,
				metadata: request.metadata || {},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const scheduledResult = await this.scheduledRepo.create(scheduledData);
			if (!scheduledResult.success) {
				return scheduledResult;
			}

			// Update post status to scheduled
			const updateResult = await this.postRepo.update(request.postId, {
				status: "scheduled",
				updatedAt: new Date().toISOString(),
			});

			if (!updateResult.success) {
				// Rollback: delete the scheduled post
				await this.scheduledRepo.delete(scheduledResult.data.id);
				return updateResult;
			}

			return {
				success: true,
				data: {
					post: updateResult.data,
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
			const scheduledResult = await this.scheduledRepo.findById(scheduledPostId);
			if (!scheduledResult.success || !scheduledResult.data) {
				return {
					success: false,
					error: new Error(`Scheduled post not found: ${scheduledPostId}`),
				};
			}

			const scheduledPost = scheduledResult.data;

			// Cannot cancel already published posts
			if (scheduledPost.status === "published") {
				return {
					success: false,
					error: new Error("Cannot cancel a post that has already been published"),
				};
			}

			// Update scheduled post status to cancelled
			const updateResult = await this.scheduledRepo.update(scheduledPostId, {
				status: "cancelled",
				updatedAt: new Date().toISOString(),
			});

			if (!updateResult.success) {
				return updateResult;
			}

			// Update the original post status back to approved
			await this.postRepo.update(scheduledPost.postId, {
				status: "approved",
				updatedAt: new Date().toISOString(),
			});

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
	 * Unschedule a post by post ID
	 */
	async unschedulePost(postId: string): Promise<Result<{ scheduledPostId: string }>> {
		try {
			// Find the scheduled post for this post
			const scheduledResult = await this.scheduledRepo.findAll({
				postId,
				status: "pending",
			});

			if (!scheduledResult.success) {
				return scheduledResult;
			}

			const scheduledPosts = scheduledResult.data.filter(
				(sp) => sp.status === "pending",
			);

			if (scheduledPosts.length === 0) {
				return {
					success: false,
					error: new Error("No pending scheduled post found for this post"),
				};
			}

			// Use the first pending scheduled post (there should only be one)
			const scheduledPost = scheduledPosts[0];

			// Cancel the scheduled post
			const cancelResult = await this.cancelScheduledPost(scheduledPost.id);
			if (!cancelResult.success) {
				return cancelResult;
			}

			return {
				success: true,
				data: { scheduledPostId: scheduledPost.id },
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error : new Error("Failed to unschedule post"),
			};
		}
	}

	/**
	 * Mark a scheduled post as successfully published
	 */
	async markAsPublished(
		scheduledPostId: string,
		externalPostId: string,
	): Promise<Result<ScheduledPostView>> {
		try {
			// Get the scheduled post
			const scheduledResult = await this.scheduledRepo.findById(scheduledPostId);
			if (!scheduledResult.success || !scheduledResult.data) {
				return {
					success: false,
					error: new Error(`Scheduled post not found: ${scheduledPostId}`),
				};
			}

			const scheduledPost = scheduledResult.data;

			// Update scheduled post as published
			const updateResult = await this.scheduledRepo.update(scheduledPostId, {
				status: "published",
				externalPostId,
				lastAttempt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			if (!updateResult.success) {
				return updateResult;
			}

			// Update original post status
			await this.postRepo.update(scheduledPost.postId, {
				status: "published",
				updatedAt: new Date().toISOString(),
			});

			return updateResult;
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to mark post as published"),
			};
		}
	}

	/**
	 * Record a publication failure
	 */
	async recordPublicationFailure(
		scheduledPostId: string,
		errorMessage: string,
		retryCount?: number,
	): Promise<Result<ScheduledPostView>> {
		try {
			const currentRetryCount = retryCount ?? 0;
			const newRetryCount = currentRetryCount + 1;
			const maxRetries = 3;

			const updateData = {
				retryCount: newRetryCount,
				errorMessage,
				lastAttempt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				status: newRetryCount >= maxRetries ? ("failed" as const) : ("pending" as const),
			};

			const updateResult = await this.scheduledRepo.update(scheduledPostId, updateData);
			if (!updateResult.success) {
				return updateResult;
			}

			// If we've exceeded max retries, update the original post status
			if (newRetryCount >= maxRetries) {
				const scheduledPost = updateResult.data;
				await this.postRepo.update(scheduledPost.postId, {
					status: "approved", // Reset to approved so it can be rescheduled manually
					updatedAt: new Date().toISOString(),
				});
			}

			return updateResult;
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

	/**
	 * Get scheduler data for management interface
	 */
	async getSchedulerData(
		filter?: {
			platform?: "linkedin" | "x";
			status?: "pending" | "published" | "failed" | "cancelled";
			dateRange?: {
				start: string;
				end: string;
			};
		},
	): Promise<Result<ScheduledPostView[]>> {
		try {
			const scheduledResult = await this.scheduledRepo.findAll(filter);
			return scheduledResult;
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to get scheduler data"),
			};
		}
	}

	/**
	 * Get calendar events for calendar view
	 */
	async getCalendarEvents(
		filter?: {
			start?: string;
			end?: string;
			platform?: "linkedin" | "x";
		},
	): Promise<Result<CalendarEvent[]>> {
		try {
			const result = await this.scheduledRepo.findAsCalendarEvents(filter);
			return result;
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to get calendar events"),
			};
		}
	}

	/**
	 * Get upcoming posts within specified hours
	 */
	async getUpcomingPosts(hours: number = 24): Promise<
		Result<Array<{
			scheduledPost: ScheduledPostView;
			post: PostView;
		}>>
	> {
		try {
			const now = new Date();
			const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

			const scheduledResult = await this.scheduledRepo.findAll({
				status: "pending",
				scheduledAfter: now.toISOString(),
				scheduledBefore: futureTime.toISOString(),
			});

			if (!scheduledResult.success) {
				return scheduledResult;
			}

			// Fetch post details for each scheduled post
			const upcomingPosts = await Promise.all(
				scheduledResult.data.map(async (scheduled) => {
					const postResult = await this.postRepo.findById(scheduled.postId);
					return {
						scheduledPost: scheduled,
						post: postResult.success ? postResult.data! : null,
					};
				}),
			);

			// Filter out any posts that couldn't be found
			const validPosts = upcomingPosts.filter((item) => item.post !== null) as Array<{
				scheduledPost: ScheduledPostView;
				post: PostView;
			}>;

			return {
				success: true,
				data: validPosts,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error : new Error("Failed to get upcoming posts"),
			};
		}
	}

	/**
	 * Bulk schedule multiple posts
	 */
	async bulkSchedulePosts(request: BulkScheduleRequest): Promise<
		Result<{
			successful: Array<{
				postId: string;
				scheduledPostId: string;
			}>;
			failed: Array<{
				postId: string;
				error: string;
			}>;
		}>
	> {
		const successful: Array<{
			postId: string;
			scheduledPostId: string;
		}> = [];
		const failed: Array<{
			postId: string;
			error: string;
		}> = [];

		// Process each post individually to avoid partial failures
		for (const postData of request.posts) {
			const scheduleRequest: SchedulePostRequest = {
				postId: postData.postId,
				platform: postData.platform,
				content: postData.content,
				scheduledTime: postData.scheduledTime,
			};

			const result = await this.schedulePost(scheduleRequest);

			if (result.success) {
				successful.push({
					postId: postData.postId,
					scheduledPostId: result.data.scheduledPost.id,
				});
			} else {
				failed.push({
					postId: postData.postId,
					error: result.error instanceof Error ? result.error.message : "Unknown error",
				});
			}
		}

		return {
			success: true,
			data: {
				successful,
				failed,
			},
		};
	}

	/**
	 * Check for scheduling conflicts (business rule implementation)
	 */
	private async checkSchedulingConflict(
		platform: string,
		scheduledTime: Date,
	): Promise<Result<void>> {
		try {
			// Define conflict window (e.g., 30 minutes before/after)
			const conflictWindow = 30 * 60 * 1000; // 30 minutes in milliseconds
			const startWindow = new Date(scheduledTime.getTime() - conflictWindow);
			const endWindow = new Date(scheduledTime.getTime() + conflictWindow);

			const conflictingPostsResult = await this.scheduledRepo.findAll({
				platform: platform as "linkedin" | "x",
				status: "pending",
				scheduledAfter: startWindow.toISOString(),
				scheduledBefore: endWindow.toISOString(),
			});

			if (!conflictingPostsResult.success) {
				return conflictingPostsResult;
			}

			if (conflictingPostsResult.data.length > 0) {
				return {
					success: false,
					error: new Error(
						`Scheduling conflict detected: Another post is already scheduled within 30 minutes on ${platform}`,
					),
				};
			}

			return { success: true, data: undefined };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error("Failed to check scheduling conflicts"),
			};
		}
	}
}