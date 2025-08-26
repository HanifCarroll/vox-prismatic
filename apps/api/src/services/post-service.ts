import type { Result } from "../types/common";
import { type PostView } from "../repositories/post-repository";
import { type ScheduledPostView } from "../repositories/scheduled-post-repository";
import { generateId } from "../lib/id-generator";
import { getDatabaseAdapter } from "../database/adapter";

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
 * PostService - Core post management operations
 * Handles CRUD operations and workflow state management for posts
 * Focused on core post lifecycle without scheduling or analytics
 */
export class PostService {
	// Repository dependencies injected via constructor
	private postRepo;
	private scheduledRepo;

	constructor() {
		const adapter = getDatabaseAdapter();
		this.postRepo = adapter.getPostRepository();
		this.scheduledRepo = adapter.getScheduledPostRepository();
	}

	/**
	 * Create a new post
	 */
	async createPost(data: {
		title: string;
		content: string;
		platform: "linkedin" | "x";
		insightId: string;
		postType?: string;
		hashtags?: string[];
		metadata?: Record<string, any>;
	}): Promise<Result<PostView>> {
		try {
			const postData = {
				id: generateId('post'),
				...data,
				status: "draft" as const,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			return await this.postRepo.create(postData);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to create post"),
			};
		}
	}

	/**
	 * Submit post for review (draft -> review)
	 */
	async submitForReview(postId: string): Promise<Result<PostView>> {
		try {
			const postResult = await this.postRepo.findById(postId);
			if (!postResult.success || !postResult.data) {
				return {
					success: false,
					error: new Error(`Post not found: ${postId}`),
				};
			}

			if (postResult.data.status !== "draft") {
				return {
					success: false,
					error: new Error(`Post must be in draft status to submit for review. Current status: ${postResult.data.status}`),
				};
			}

			return await this.postRepo.update(postId, {
				status: "review",
				updatedAt: new Date().toISOString(),
			});
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to submit post for review"),
			};
		}
	}

	/**
	 * Approve post (review -> approved)
	 */
	async approvePost(postId: string): Promise<Result<PostView>> {
		try {
			const postResult = await this.postRepo.findById(postId);
			if (!postResult.success || !postResult.data) {
				return {
					success: false,
					error: new Error(`Post not found: ${postId}`),
				};
			}

			if (postResult.data.status !== "review") {
				return {
					success: false,
					error: new Error(`Post must be in review status to approve. Current status: ${postResult.data.status}`),
				};
			}

			return await this.postRepo.update(postId, {
				status: "approved",
				updatedAt: new Date().toISOString(),
			});
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to approve post"),
			};
		}
	}

	/**
	 * Reject post (review -> draft with reason)
	 */
	async rejectPost(postId: string, reason?: string): Promise<Result<PostView>> {
		try {
			const postResult = await this.postRepo.findById(postId);
			if (!postResult.success || !postResult.data) {
				return {
					success: false,
					error: new Error(`Post not found: ${postId}`),
				};
			}

			if (postResult.data.status !== "review") {
				return {
					success: false,
					error: new Error(`Post must be in review status to reject. Current status: ${postResult.data.status}`),
				};
			}

			const updateData = {
				status: "draft" as const,
				updatedAt: new Date().toISOString(),
				...(reason && { rejectionReason: reason }),
			};

			return await this.postRepo.update(postId, updateData);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to reject post"),
			};
		}
	}

	/**
	 * Update post status manually
	 */
	async updatePostStatus(
		postId: string,
		status: "draft" | "review" | "approved" | "scheduled" | "published"
	): Promise<Result<PostView>> {
		try {
			const updateResult = await this.postRepo.update(postId, {
				status,
				updatedAt: new Date().toISOString(),
			});

			if (!updateResult.success) return updateResult;

			const postResult = await this.postRepo.findById(postId);
			if (!postResult.success) return postResult;
			if (!postResult.data) {
				return { success: false, error: new Error("Post not found") };
			}

			return { success: true, data: postResult.data };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to update post status"),
			};
		}
	}

	/**
	 * Get a single post by ID
	 */
	async getPost(postId: string): Promise<Result<PostView>> {
		try {
			return await this.postRepo.findById(postId);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get post"),
			};
		}
	}

	/**
	 * Get posts with optional filtering
	 */
	async getPosts(filters?: {
		status?: "draft" | "review" | "approved" | "scheduled" | "published";
		platform?: "linkedin" | "x";
		insightId?: string;
		limit?: number;
		offset?: number;
	}): Promise<Result<PostView[]>> {
		try {
			return await this.postRepo.findWithRelatedData(filters);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get posts"),
			};
		}
	}

	/**
	 * Get approved posts ready for scheduling
	 */
	async getApprovedPosts(): Promise<Result<PostView[]>> {
		try {
			return await this.postRepo.findAll({ status: "approved" });
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get approved posts"),
			};
		}
	}

	/**
	 * Get a post with its scheduling information
	 */
	async getPostWithSchedule(postId: string): Promise<Result<PostWithSchedule>> {
		try {
			const postResult = await this.postRepo.findById(postId);
			if (!postResult.success || !postResult.data) {
				return {
					success: false,
					error: new Error(`Post not found: ${postId}`),
				};
			}

			const post = postResult.data;

			// Get scheduling information if it exists
			const scheduledResult = await this.scheduledRepo.findAll({ postId });
			const scheduledPost = scheduledResult.success && scheduledResult.data.length > 0 
				? scheduledResult.data[0] 
				: null;

			const postWithSchedule: PostWithSchedule = {
				...post,
				scheduledPost: scheduledPost ? {
					id: scheduledPost.id,
					scheduledTime: scheduledPost.scheduledTime,
					platform: scheduledPost.platform as "linkedin" | "x",
					status: scheduledPost.status as "pending" | "published" | "failed" | "cancelled",
					retryCount: scheduledPost.retryCount,
					lastAttempt: scheduledPost.lastAttempt,
					errorMessage: scheduledPost.errorMessage,
					externalPostId: scheduledPost.externalPostId,
				} : undefined,
			};

			return {
				success: true,
				data: postWithSchedule,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get post with schedule"),
			};
		}
	}

	/**
	 * Get posts with their scheduling information
	 */
	async getPostsWithSchedule(filter?: {
		status?: string;
		platform?: string;
		limit?: number;
	}): Promise<Result<PostWithSchedule[]>> {
		try {
			const postsResult = await this.postRepo.findWithRelatedData(filter);
			if (!postsResult.success) {
				return postsResult;
			}

			const postsWithSchedule: PostWithSchedule[] = [];

			for (const post of postsResult.data) {
				// Get scheduling information
				const scheduledResult = await this.scheduledRepo.findAll({ postId: post.id });
				const scheduledPost = scheduledResult.success && scheduledResult.data.length > 0 
					? scheduledResult.data[0] 
					: null;

				const postWithSchedule: PostWithSchedule = {
					...post,
					scheduledPost: scheduledPost ? {
						id: scheduledPost.id,
						scheduledTime: scheduledPost.scheduledTime,
						platform: scheduledPost.platform as "linkedin" | "x",
						status: scheduledPost.status as "pending" | "published" | "failed" | "cancelled",
						retryCount: scheduledPost.retryCount,
						lastAttempt: scheduledPost.lastAttempt,
						errorMessage: scheduledPost.errorMessage,
						externalPostId: scheduledPost.externalPostId,
					} : undefined,
				};

				postsWithSchedule.push(postWithSchedule);
			}

			return {
				success: true,
				data: postsWithSchedule,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get posts with schedule"),
			};
		}
	}

	/**
	 * Update post content
	 */
	async updatePost(
		postId: string,
		updates: {
			title?: string;
			content?: string;
			hashtags?: string[];
			postType?: string;
			metadata?: Record<string, any>;
		}
	): Promise<Result<PostView>> {
		try {
			const updateData = {
				...updates,
				updatedAt: new Date().toISOString(),
			};

			return await this.postRepo.update(postId, updateData);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to update post"),
			};
		}
	}

	/**
	 * Delete a post (only if not published)
	 */
	async deletePost(postId: string): Promise<Result<void>> {
		try {
			// Check if post exists and is not published
			const postResult = await this.postRepo.findById(postId);
			if (!postResult.success || !postResult.data) {
				return {
					success: false,
					error: new Error(`Post not found: ${postId}`),
				};
			}

			if (postResult.data.status === "published") {
				return {
					success: false,
					error: new Error("Cannot delete published posts"),
				};
			}

			// Check if post has associated scheduled posts and cancel them
			const scheduledResult = await this.scheduledRepo.findAll({ postId });
			if (scheduledResult.success && scheduledResult.data.length > 0) {
				// Cancel any pending scheduled posts
				for (const scheduled of scheduledResult.data) {
					if (scheduled.status === "pending") {
						await this.scheduledRepo.update(scheduled.id, {
							status: "cancelled",
							updatedAt: new Date().toISOString(),
						});
					}
				}
			}

			// Delete the post
			return await this.postRepo.delete(postId);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to delete post"),
			};
		}
	}
}