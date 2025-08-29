'use server';

import { apiClient } from '@/lib/api-client';
import type { PostView } from '@/types/database';
import type { ApiResponseWithMetadata, Result } from '@/types';
import {
  createResponse,
  sanitizeInput,
  validatePagination
} from '../lib/action-utils';

/**
 * Post Read Operations
 * Server actions for fetching post data
 */

/**
 * Get posts with filtering and pagination
 */
export async function getPosts(params?: {
  status?: string;
  platform?: string;
  insightId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<Result<PostView[]> & { meta?: any }> {
  // Auth not implemented yet

  const { page, limit, offset } = validatePagination({
    page: params?.page,
    limit: params?.limit
  });

  // Build query parameters
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    searchParams.append('status', params.status);
  }
  if (params?.platform && params.platform !== 'all') {
    searchParams.append('platform', params.platform);
  }
  if (params?.insightId) {
    searchParams.append('insightId', params.insightId);
  }
  if (params?.search) {
    searchParams.append('search', sanitizeInput(params.search));
  }
  if (params?.sortBy) {
    searchParams.append('sortBy', params.sortBy);
  }
  if (params?.sortOrder) {
    searchParams.append('sortOrder', params.sortOrder);
  }
  searchParams.append('limit', String(limit));
  searchParams.append('offset', String(offset));

  const queryString = searchParams.toString();
  const endpoint = `/api/posts${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await apiClient.get<PostView[]>(endpoint) as ApiResponseWithMetadata<PostView> & {
      error?: string;
    };

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to fetch posts'
      };
    }

    // Convert date strings to Date objects
    const posts = response.data.map((post) => ({
      ...post,
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt),
      scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
    }));

    return createResponse(posts, {
      pagination: {
        page,
        limit,
        total: response.meta.pagination.total,
        totalPages: response.meta.pagination.totalPages,
        hasMore: response.meta.pagination.hasMore
      }
    });
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to fetch posts:', error);
    throw new Error('Unable to load posts. Please try again.');
  }
}

/**
 * Get single post by ID
 */
export async function getPost(id: string): Promise<Result<PostView>> {
  if (!id) {
    return {
      success: false,
      error: 'Post ID is required'
    };
  }

  // Auth not implemented yet

  try {
    const response = await apiClient.get<PostView>(`/api/posts/${id}`);
    
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

    return createResponse(post);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to fetch post:', error);
    throw new Error('Unable to load post. Please try again.');
  }
}