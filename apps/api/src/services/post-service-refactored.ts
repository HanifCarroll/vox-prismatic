import type { Result } from "../types/common";
import { type PostView } from "../repositories/post-repository";
import { type ScheduledPostView } from "../repositories/scheduled-post-repository";
import { generateId } from "../lib/id-generator";
import type { IServiceDependencies } from "../container/types";
import { 
  PostNotFoundError, 
  PostStatusConflictError,
  PostValidationError,
  assertExists 
} from "../errors/domain-errors";
import { success, failure } from "../errors/error-utils";

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
 * PostService - Refactored with dependency injection
 * Handles CRUD operations and workflow state management for posts
 * 
 * Key improvements:
 * - Dependency injection for testability
 * - Proper error types instead of generic errors
 * - Consistent use of Result pattern
 */
export class PostServiceRefactored {
  constructor(private readonly deps: IServiceDependencies) {}

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
      // Validate required fields
      if (!data.title?.trim()) {
        return failure(new PostValidationError("Title is required"));
      }
      if (!data.content?.trim()) {
        return failure(new PostValidationError("Content is required"));
      }
      if (!data.platform) {
        return failure(new PostValidationError("Platform is required"));
      }

      const postData = {
        id: generateId('post'),
        ...data,
        status: "draft" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return await this.deps.repositories.post.create(postData);
    } catch (error) {
      return failure(
        error instanceof Error 
          ? new PostValidationError(error.message)
          : new PostValidationError("Failed to create post")
      );
    }
  }

  /**
   * Submit post for review (draft -> review)
   */
  async submitForReview(postId: string): Promise<Result<PostView>> {
    try {
      const postResult = await this.deps.repositories.post.findById(postId);
      if (!postResult.success) {
        return failure(new PostNotFoundError(postId));
      }

      const post = postResult.data;
      assertExists(post, 'Post', postId);

      if (post.status !== "draft") {
        return failure(
          new PostStatusConflictError(postId, post.status, "review")
        );
      }

      return await this.deps.repositories.post.update(postId, {
        status: "review",
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      // If error is already typed, return it
      if (error instanceof PostNotFoundError || error instanceof PostStatusConflictError) {
        return failure(error);
      }
      
      return failure(
        error instanceof Error 
          ? new PostValidationError(error.message)
          : new PostValidationError("Failed to submit post for review")
      );
    }
  }

  /**
   * Approve post (review -> approved)
   */
  async approvePost(postId: string): Promise<Result<PostView>> {
    try {
      const postResult = await this.deps.repositories.post.findById(postId);
      if (!postResult.success) {
        return failure(new PostNotFoundError(postId));
      }

      const post = postResult.data;
      assertExists(post, 'Post', postId);

      if (post.status !== "review") {
        return failure(
          new PostStatusConflictError(postId, post.status, "approved")
        );
      }

      return await this.deps.repositories.post.update(postId, {
        status: "approved",
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof PostNotFoundError || error instanceof PostStatusConflictError) {
        return failure(error);
      }
      
      return failure(
        error instanceof Error 
          ? new PostValidationError(error.message)
          : new PostValidationError("Failed to approve post")
      );
    }
  }

  /**
   * Reject post (review -> rejected)
   */
  async rejectPost(postId: string, reason?: string): Promise<Result<PostView>> {
    try {
      const postResult = await this.deps.repositories.post.findById(postId);
      if (!postResult.success) {
        return failure(new PostNotFoundError(postId));
      }

      const post = postResult.data;
      assertExists(post, 'Post', postId);

      if (post.status !== "review") {
        return failure(
          new PostStatusConflictError(postId, post.status, "rejected")
        );
      }

      const metadata = {
        ...(post.metadata as Record<string, any> || {}),
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
      };

      return await this.deps.repositories.post.update(postId, {
        status: "rejected",
        metadata,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof PostNotFoundError || error instanceof PostStatusConflictError) {
        return failure(error);
      }
      
      return failure(
        error instanceof Error 
          ? new PostValidationError(error.message)
          : new PostValidationError("Failed to reject post")
      );
    }
  }

  /**
   * Get posts with filters
   */
  async getPosts(filter?: any): Promise<Result<PostView[]>> {
    try {
      return await this.deps.repositories.post.findAll(filter);
    } catch (error) {
      return failure(
        error instanceof Error 
          ? new PostValidationError(error.message)
          : new PostValidationError("Failed to fetch posts")
      );
    }
  }

  /**
   * Get single post by ID
   */
  async getPost(postId: string): Promise<Result<PostView>> {
    try {
      const result = await this.deps.repositories.post.findById(postId);
      
      if (!result.success) {
        return failure(new PostNotFoundError(postId));
      }

      const post = result.data;
      if (!post) {
        return failure(new PostNotFoundError(postId));
      }

      return success(post);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        return failure(error);
      }
      
      return failure(
        error instanceof Error 
          ? new PostValidationError(error.message)
          : new PostValidationError("Failed to fetch post")
      );
    }
  }

  /**
   * Update post
   */
  async updatePost(postId: string, updates: Partial<PostView>): Promise<Result<PostView>> {
    try {
      // Verify post exists
      const existingResult = await this.deps.repositories.post.findById(postId);
      if (!existingResult.success || !existingResult.data) {
        return failure(new PostNotFoundError(postId));
      }

      // Don't allow status updates through this method
      const { status, ...safeUpdates } = updates;
      
      return await this.deps.repositories.post.update(postId, {
        ...safeUpdates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        return failure(error);
      }
      
      return failure(
        error instanceof Error 
          ? new PostValidationError(error.message)
          : new PostValidationError("Failed to update post")
      );
    }
  }

  /**
   * Delete post
   */
  async deletePost(postId: string): Promise<Result<void>> {
    try {
      // Verify post exists
      const existingResult = await this.deps.repositories.post.findById(postId);
      if (!existingResult.success || !existingResult.data) {
        return failure(new PostNotFoundError(postId));
      }

      // Check if post has scheduled entries
      const scheduleResult = await this.deps.repositories.scheduledPost.findAll({ postId });
      if (scheduleResult.success && scheduleResult.data.length > 0) {
        return failure(
          new PostValidationError("Cannot delete post with scheduled entries. Cancel schedules first.")
        );
      }

      return await this.deps.repositories.post.delete(postId);
    } catch (error) {
      if (error instanceof PostNotFoundError || error instanceof PostValidationError) {
        return failure(error);
      }
      
      return failure(
        error instanceof Error 
          ? new PostValidationError(error.message)
          : new PostValidationError("Failed to delete post")
      );
    }
  }

  /**
   * Get posts with scheduling information
   * This demonstrates clean coordination between repositories
   */
  async getPostsWithSchedule(filter?: any): Promise<Result<PostWithSchedule[]>> {
    try {
      const postsResult = await this.deps.repositories.post.findAll(filter);
      if (!postsResult.success) {
        return failure(new PostValidationError("Failed to fetch posts"));
      }

      // Batch fetch all scheduled posts to avoid N+1 queries
      const postIds = postsResult.data.map(p => p.id);
      const scheduledResult = await this.deps.repositories.scheduledPost.findAll({ 
        postId: { in: postIds },
        status: "pending"
      });

      if (!scheduledResult.success) {
        // Return posts without schedule info rather than failing entirely
        return success(postsResult.data);
      }

      // Map scheduled posts by post ID for efficient lookup
      const scheduleMap = new Map<string, ScheduledPostView>();
      for (const scheduled of scheduledResult.data) {
        // Only keep the most recent schedule per post
        const existing = scheduleMap.get(scheduled.postId);
        if (!existing || new Date(scheduled.createdAt) > new Date(existing.createdAt)) {
          scheduleMap.set(scheduled.postId, scheduled);
        }
      }

      // Enhance posts with schedule information
      const enhancedPosts: PostWithSchedule[] = postsResult.data.map(post => {
        const scheduled = scheduleMap.get(post.id);
        return {
          ...post,
          scheduledPost: scheduled ? {
            id: scheduled.id,
            scheduledTime: scheduled.scheduledTime,
            platform: scheduled.platform,
            status: scheduled.status,
            retryCount: scheduled.retryCount,
            lastAttempt: scheduled.lastAttempt,
            errorMessage: scheduled.errorMessage,
            externalPostId: scheduled.externalPostId,
          } : undefined,
        };
      });

      return success(enhancedPosts);
    } catch (error) {
      return failure(
        error instanceof Error 
          ? new PostValidationError(error.message)
          : new PostValidationError("Failed to fetch posts with schedule")
      );
    }
  }
}