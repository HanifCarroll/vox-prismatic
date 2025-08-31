/**
 * Posts API Client
 * Client-side API calls for posts operations
 */

import { getApiBaseUrl } from '../api-config';
import type { PostView } from '@/types/database';
import type { ApiResponse, Result } from '@/types';
import { PostStatus, Platform } from '@content-creation/types';
import {
  sanitizeInput,
  parseFormData
} from '../action-helpers';

const API_BASE_URL = getApiBaseUrl();

/**
 * Helper function for making API requests
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Posts API methods
 */
export const postsAPI = {
  /**
   * Get all posts
   */
  async getPosts(): Promise<Result<PostView[]>> {
    try {
      // No parameters needed anymore
      const response = await fetchAPI<PostView[]>(
        `/api/posts`
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch posts'
        };
      }

      // Convert date strings to Date objects
      const posts = response.data?.map((post) => ({
        ...post,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt),
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
      })) || [];

      return {
        success: true,
        data: posts
      };
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  /**
   * Get single post by ID
   */
  async getPost(id: string): Promise<Result<PostView>> {
    if (!id) {
      return {
        success: false,
        error: 'Post ID is required'
      };
    }

    try {
      const response = await fetchAPI<PostView>(`/api/posts/${id}`);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch post'
        };
      }

      if (!response.data) {
        return {
          success: false,
          error: 'Post not found'
        };
      }

      // Convert date strings to Date objects
      const post = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
        scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
      };

      return {
        success: true,
        data: post
      };
    } catch (error) {
      console.error('Failed to fetch post:', error);
      throw new Error('Unable to load post. Please try again.');
    }
  },

  /**
   * Create new post
   */
  async createPost(data: {
    insightId: string;
    title: string;
    content: string;
    platform: string;
    scheduledFor?: string;
  }): Promise<Result<PostView>> {
    // Validate required fields
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
    const sanitizedData = {
      ...data,
      title: sanitizeInput(data.title),
      content: sanitizeInput(data.content)
    };

    try {
      const response = await fetchAPI<PostView>('/api/posts', {
        method: 'POST',
        body: JSON.stringify(sanitizedData)
      });
      
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

      // Convert date strings to Date objects
      const post = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
        scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
      };

      return {
        success: true,
        data: post
      };
    } catch (error) {
      console.error('Failed to create post:', error);
      throw new Error('Unable to create post. Please try again.');
    }
  },

  /**
   * Create post from FormData
   */
  async createPostFromForm(formData: FormData): Promise<Result<PostView>> {
    const data = parseFormData<{
      insightId: string;
      title: string;
      content: string;
      platform: string;
      scheduledFor?: string;
    }>(formData, ['insightId', 'title', 'content', 'platform', 'scheduledFor']);

    return this.createPost(data);
  },

  /**
   * Update existing post
   */
  async updatePost(
    id: string,
    data: {
      title?: string;
      content?: string;
      platform?: string;
      status?: string;
      scheduledFor?: string;
    }
  ): Promise<Result<PostView>> {
    if (!id) {
      return {
        success: false,
        error: 'Post ID is required'
      };
    }

    // Sanitize inputs
    const sanitizedData = { ...data };
    if (sanitizedData.title) sanitizedData.title = sanitizeInput(sanitizedData.title);
    if (sanitizedData.content) sanitizedData.content = sanitizeInput(sanitizedData.content);

    try {
      const response = await fetchAPI<PostView>(`/api/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(sanitizedData)
      });
      
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

      // Convert date strings to Date objects
      const post = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
        scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
      };

      return {
        success: true,
        data: post
      };
    } catch (error) {
      console.error('Failed to update post:', error);
      throw new Error('Unable to update post. Please try again.');
    }
  },

  /**
   * Update post from FormData
   */
  async updatePostFromForm(
    id: string,
    formData: FormData
  ): Promise<Result<PostView>> {
    const data = parseFormData<{
      title?: string;
      content?: string;
      platform?: string;
      status?: string;
      scheduledFor?: string;
    }>(formData, ['title', 'content', 'platform', 'status', 'scheduledFor']);

    return this.updatePost(id, data);
  },

  /**
   * Delete post
   */
  async deletePost(id: string): Promise<Result<{ id: string }>> {
    if (!id) {
      return {
        success: false,
        error: 'Post ID is required'
      };
    }

    try {
      const response = await fetchAPI(`/api/posts/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to delete post'
        };
      }

      return {
        success: true,
        data: { id }
      };
    } catch (error) {
      console.error('Failed to delete post:', error);
      throw new Error('Unable to delete post. Please try again.');
    }
  },

  /**
   * Bulk update posts
   */
  async bulkUpdatePosts(
    action: string,
    postIds: string[]
  ): Promise<Result<{ action: string; affectedCount: number }>> {
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
      const response = await fetchAPI('/api/posts/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action,
          postIds
        })
      });
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to perform bulk operation'
        };
      }

      return {
        success: true,
        data: {
          action,
          affectedCount: postIds.length
        }
      };
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      throw new Error('Unable to perform bulk operation. Please try again.');
    }
  },

  /**
   * Approve post
   */
  async approvePost(id: string): Promise<Result<PostView>> {
    if (!id) {
      return {
        success: false,
        error: 'Post ID is required'
      };
    }

    try {
      const response = await fetchAPI<PostView>(`/api/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: PostStatus.APPROVED
        })
      });
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to approve post'
        };
      }

      if (!response.data) {
        return {
          success: false,
          error: 'No data returned from server'
        };
      }

      const post = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
        scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
      };

      return {
        success: true,
        data: post
      };
    } catch (error) {
      console.error('Failed to approve post:', error);
      throw new Error('Unable to approve post. Please try again.');
    }
  },

  /**
   * Reject post
   */
  async rejectPost(id: string): Promise<Result<PostView>> {
    if (!id) {
      return {
        success: false,
        error: 'Post ID is required'
      };
    }

    try {
      const response = await fetchAPI<PostView>(`/api/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: PostStatus.REJECTED
        })
      });
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to reject post'
        };
      }

      if (!response.data) {
        return {
          success: false,
          error: 'No data returned from server'
        };
      }

      const post = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
        scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
      };

      return {
        success: true,
        data: post
      };
    } catch (error) {
      console.error('Failed to reject post:', error);
      throw new Error('Unable to reject post. Please try again.');
    }
  },

  /**
   * Schedule post for publishing
   */
  async schedulePost(
    id: string,
    scheduledFor: Date | string
  ): Promise<Result<PostView>> {
    if (!id) {
      return {
        success: false,
        error: 'Post ID is required'
      };
    }
    if (!scheduledFor) {
      return {
        success: false,
        error: 'Scheduled date is required'
      };
    }

    try {
      const response = await fetchAPI<PostView>(`/api/posts/${id}/schedule`, {
        method: 'POST',
        body: JSON.stringify({
          scheduledFor: scheduledFor instanceof Date ? scheduledFor.toISOString() : scheduledFor
        })
      });
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to schedule post'
        };
      }

      if (!response.data) {
        return {
          success: false,
          error: 'No data returned from server'
        };
      }

      const post = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
        scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
      };

      return {
        success: true,
        data: post
      };
    } catch (error) {
      console.error('Failed to schedule post:', error);
      throw new Error('Unable to schedule post. Please try again.');
    }
  },

  /**
   * Publish post immediately
   */
  async publishPost(id: string): Promise<Result<{ jobId: string; message: string }>> {
    if (!id) {
      return {
        success: false,
        error: 'Post ID is required'
      };
    }

    try {
      const response = await fetchAPI<{ jobId: string }>(`/api/posts/${id}/publish`, {
        method: 'POST'
      });
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to start post publishing'
        }
      }

      return {
        success: true,
        data: {
          jobId: response.data?.jobId || '',
          message: 'Post publishing started'
        }
      };
    } catch (error) {
      console.error('Failed to publish post:', error);
      throw new Error('Unable to start post publishing. Please try again.');
    }
  }
};