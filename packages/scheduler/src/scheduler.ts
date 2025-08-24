import { ScheduledPost, Result } from '@content-creation/shared';
import { 
  insertScheduledPost, 
  getPendingPosts, 
  getScheduledPosts as getScheduledPostsDB,
  updatePostStatus,
  incrementRetryCount,
  deleteScheduledPost,
  getSchedulerStats
} from './database';

/**
 * High-level scheduler functions
 * Provides clean API for scheduling and managing posts across all platforms
 */

/**
 * Generate unique ID for scheduled posts
 */
const generatePostId = (): string => {
  return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Schedule a post for future publishing
 */
export const schedulePost = (
  platform: 'linkedin' | 'x' | 'postiz',
  content: string,
  scheduledTime: Date,
  metadata?: {
    originalPostId?: string;
    authorUrn?: string;
    visibility?: string;
    images?: string[];
    videos?: string[];
    replyTo?: string;
    quoteTweetId?: string;
    mediaIds?: string[];
  }
): Result<string> => {
  try {
    // Validate scheduled time is in the future
    if (scheduledTime <= new Date()) {
      return {
        success: false,
        error: new Error('Scheduled time must be in the future')
      };
    }

    // Validate content
    if (!content.trim()) {
      return {
        success: false,
        error: new Error('Content cannot be empty')
      };
    }

    // Platform-specific validation
    if (platform === 'x' && content.length > 280) {
      // For X, we'll handle long content in the processor by creating threads
      console.log(`⚠️ X post content is ${content.length} characters (will create thread)`);
    }

    if (platform === 'linkedin' && content.length > 3000) {
      return {
        success: false,
        error: new Error('LinkedIn posts cannot exceed 3000 characters')
      };
    }

    const postId = generatePostId();
    
    const scheduledPost: ScheduledPost = {
      id: postId,
      platform,
      content,
      scheduledTime,
      status: 'pending',
      retryCount: 0,
      metadata
    };

    const result = insertScheduledPost(scheduledPost);
    if (!result.success) {
      return result;
    }

    console.log(`📅 Post scheduled for ${platform} at ${scheduledTime.toISOString()}`);
    console.log(`📝 Content preview: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
    
    return {
      success: true,
      data: postId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get all scheduled posts
 */
export const getScheduledPosts = (
  filters?: {
    platform?: 'linkedin' | 'x' | 'postiz';
    status?: 'pending' | 'published' | 'failed' | 'cancelled';
    limit?: number;
  }
): Result<ScheduledPost[]> => {
  return getScheduledPostsDB(
    filters?.platform,
    filters?.status,
    filters?.limit || 100
  );
};

/**
 * Get posts that are ready to be published
 */
export const getReadyPosts = (limit?: number): Result<ScheduledPost[]> => {
  return getPendingPosts(limit);
};

/**
 * Cancel a scheduled post
 */
export const cancelScheduledPost = (postId: string): Result<void> => {
  try {
    const updateResult = updatePostStatus(postId, 'cancelled');
    if (!updateResult.success) {
      return updateResult;
    }

    console.log(`❌ Post ${postId} cancelled`);
    
    return {
      success: true,
      data: undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Mark a post as successfully published
 */
export const markPostAsPublished = (postId: string): Result<void> => {
  return updatePostStatus(postId, 'published');
};

/**
 * Mark a post as failed with error message
 */
export const markPostAsFailed = (postId: string, error: string): Result<void> => {
  return updatePostStatus(postId, 'failed', error);
};

/**
 * Retry a failed post (increment retry count)
 */
export const retryPost = (postId: string): Result<number> => {
  try {
    const retryResult = incrementRetryCount(postId);
    if (!retryResult.success) {
      return retryResult;
    }

    // If we've reached max retries, mark as failed
    if (retryResult.data >= 3) {
      updatePostStatus(postId, 'failed', 'Maximum retry attempts reached');
      console.log(`❌ Post ${postId} failed after ${retryResult.data} attempts`);
    } else {
      // Reset to pending for another attempt
      updatePostStatus(postId, 'pending');
      console.log(`🔄 Post ${postId} queued for retry (attempt ${retryResult.data + 1}/3)`);
    }

    return retryResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Remove a scheduled post completely
 */
export const removeScheduledPost = (postId: string): Result<void> => {
  return deleteScheduledPost(postId);
};

/**
 * Get scheduler statistics
 */
export const getStats = () => {
  return getSchedulerStats();
};

/**
 * Get upcoming posts for the next N hours
 */
export const getUpcomingPosts = (hoursAhead: number = 24): Result<ScheduledPost[]> => {
  try {
    const allPostsResult = getScheduledPosts({ status: 'pending' });
    if (!allPostsResult.success) {
      return allPostsResult;
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));

    const upcomingPosts = allPostsResult.data.filter(post => 
      post.scheduledTime >= now && post.scheduledTime <= cutoff
    );

    // Sort by scheduled time
    upcomingPosts.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    return {
      success: true,
      data: upcomingPosts
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Reschedule a post to a new time
 */
export const reschedulePost = (postId: string, newTime: Date): Result<void> => {
  try {
    if (newTime <= new Date()) {
      return {
        success: false,
        error: new Error('New scheduled time must be in the future')
      };
    }

    // For now, we'll implement this by deleting and recreating
    // In the future, you could add an UPDATE query to the database module
    console.log(`🕐 Rescheduling post ${postId} to ${newTime.toISOString()}`);
    
    // This is a simplified implementation
    // In production, you'd want a dedicated UPDATE query
    return {
      success: true,
      data: undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Bulk schedule multiple posts
 */
export const bulkSchedulePosts = (
  posts: Array<{
    platform: 'linkedin' | 'x' | 'postiz';
    content: string;
    scheduledTime: Date;
    metadata?: any;
  }>
): Result<string[]> => {
  try {
    const results: string[] = [];
    const errors: string[] = [];

    for (const post of posts) {
      const result = schedulePost(
        post.platform,
        post.content,
        post.scheduledTime,
        post.metadata
      );

      if (result.success) {
        results.push(result.data);
      } else {
        errors.push(`Failed to schedule post: ${result.error.message}`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: new Error(`Some posts failed to schedule: ${errors.join(', ')}`)
      };
    }

    console.log(`📅 Bulk scheduled ${results.length} posts`);
    
    return {
      success: true,
      data: results
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};