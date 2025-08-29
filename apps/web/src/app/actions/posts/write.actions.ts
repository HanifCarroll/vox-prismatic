'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { PostView } from '@/types/database';
import type { Result } from '@/types';
import {
  createResponse,
  CACHE_TAGS,
  sanitizeInput,
  parseFormData
} from '../lib/action-utils';

/**
 * Post Write Operations
 * Server actions for creating, updating, and deleting posts
 */

/**
 * Create new post
 */
export async function createPost(formData: FormData): Promise<Result<PostView>> {
  // Auth not implemented yet

  const data = parseFormData<{
    insightId: string;
    title: string;
    content: string;
    platform: string;
    scheduledFor?: string;
  }>(formData, ['insightId', 'title', 'content', 'platform', 'scheduledFor']);

  // Validate required fields - return Result for validation errors
  if (!data.insightId?.trim()) {
    return {
      success: false,
      error: 'Insight ID is required'
    };
  }
  if (!data.title?.trim()) {
    return {
      success: false,
      error: 'Title is required'
    };
  }
  if (!data.content?.trim()) {
    return {
      success: false,
      error: 'Content is required'
    };
  }
  if (!data.platform?.trim()) {
    return {
      success: false,
      error: 'Platform is required'
    };
  }

  // Sanitize inputs
  data.title = sanitizeInput(data.title);
  data.content = sanitizeInput(data.content);

  try {
    const response = await apiClient.post<PostView>('/api/posts', data);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to create post'
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: 'No data returned from server'
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.posts.all);
    revalidateTag(CACHE_TAGS.posts.list);
    revalidateTag(CACHE_TAGS.dashboard);
    revalidateTag(CACHE_TAGS.sidebar);
    revalidatePath('/content');

    // Convert date strings to Date objects
    const post = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
    };

    return createResponse(post);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to create post:', error);
    throw new Error('Unable to create post. Please try again.');
  }
}

/**
 * Update existing post
 */
export async function updatePost(
  id: string,
  formData: FormData
): Promise<Result<PostView>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: 'Post ID is required'
    };
  }

  const data = parseFormData<{
    title?: string;
    content?: string;
    platform?: string;
    status?: string;
    scheduledFor?: string;
  }>(formData, ['title', 'content', 'platform', 'status', 'scheduledFor']);

  // Sanitize inputs
  if (data.title) data.title = sanitizeInput(data.title);
  if (data.content) data.content = sanitizeInput(data.content);

  try {
    const response = await apiClient.patch<PostView>(`/api/posts/${id}`, data);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to update post'
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: 'No data returned from server'
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.posts.all);
    revalidateTag(CACHE_TAGS.posts.detail(id));
    if (data.status) {
      revalidateTag(CACHE_TAGS.posts.byStatus(data.status));
    }
    if (data.platform) {
      revalidateTag(CACHE_TAGS.posts.byPlatform(data.platform));
    }
    revalidateTag(CACHE_TAGS.dashboard);
    revalidateTag(CACHE_TAGS.sidebar);
    revalidatePath('/content');

    // Convert date strings to Date objects
    const post = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
    };

    return createResponse(post);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to update post:', error);
    throw new Error('Unable to update post. Please try again.');
  }
}

/**
 * Delete post
 */
export async function deletePost(id: string): Promise<Result<{ id: string }>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: 'Post ID is required'
    };
  }

  try {
    const response = await apiClient.delete(`/api/posts/${id}`);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to delete post'
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.posts.all);
    revalidateTag(CACHE_TAGS.posts.detail(id));
    revalidateTag(CACHE_TAGS.dashboard);
    revalidateTag(CACHE_TAGS.sidebar);
    revalidatePath('/content');

    return createResponse({ id });
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to delete post:', error);
    throw new Error('Unable to delete post. Please try again.');
  }
}

/**
 * Bulk update posts
 */
export async function bulkUpdatePosts(
  action: string,
  postIds: string[]
): Promise<Result<{ action: string; affectedCount: number }>> {
  // Auth not implemented yet

  if (!action) {
    return {
      success: false,
      error: 'Action is required'
    };
  }
  if (!postIds || postIds.length === 0) {
    return {
      success: false,
      error: 'At least one post must be selected'
    };
  }

  try {
    const response = await apiClient.post('/api/posts/bulk', {
      action,
      postIds
    });
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to perform bulk operation'
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.posts.all);
    postIds.forEach(id => {
      revalidateTag(CACHE_TAGS.posts.detail(id));
    });
    revalidateTag(CACHE_TAGS.dashboard);
    revalidateTag(CACHE_TAGS.sidebar);
    revalidatePath('/content');

    return createResponse({
      action,
      affectedCount: postIds.length
    });
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to perform bulk operation:', error);
    throw new Error('Unable to perform bulk operation. Please try again.');
  }
}