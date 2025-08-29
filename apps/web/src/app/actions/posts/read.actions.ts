'use server';

import { apiClient } from '@/lib/api-client';
import type { PostView } from '@/types/database';
import type { ApiResponseWithMetadata } from '@/types';
import {
  verifyAuth,
  withErrorHandling,
  createResponse,
  createErrorResponse,
  sanitizeInput,
  validatePagination,
  ValidationError
} from '../lib/action-utils';

/**
 * Post Read Operations
 * Server actions for fetching post data
 */

/**
 * Get posts with filtering and pagination
 */
export const getPosts = withErrorHandling(async (params?: {
  status?: string;
  platform?: string;
  insightId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) => {
  // Auth is optional for reading
  try {
    await verifyAuth();
  } catch {
    // Continue without auth
  }

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

  const response = await apiClient.get<PostView[]>(endpoint) as ApiResponseWithMetadata<PostView> & {
    error?: string;
  };

  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch posts');
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
});

/**
 * Get single post by ID
 */
export const getPost = withErrorHandling(async (id: string) => {
  if (!id) {
    throw new ValidationError('Post ID is required');
  }

  // Auth is optional for reading
  try {
    await verifyAuth();
  } catch {
    // Continue without auth
  }

  const response = await apiClient.get<PostView>(`/api/posts/${id}`);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch post');
  }

  if (!response.data) {
    return createErrorResponse('Post not found', 'NOT_FOUND', 404);
  }

  // Convert date strings to Date objects
  const post = {
    ...response.data,
    createdAt: new Date(response.data.createdAt),
    updatedAt: new Date(response.data.updatedAt),
    scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
  };

  return createResponse(post);
});