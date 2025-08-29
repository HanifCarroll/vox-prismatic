'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { PostView } from '@/types/database';
import {
  verifyAuth,
  withErrorHandling,
  createResponse,
  CACHE_TAGS,
  sanitizeInput,
  ValidationError,
  parseFormData
} from '../lib/action-utils';

/**
 * Post Write Operations
 * Server actions for creating, updating, and deleting posts
 */

/**
 * Create new post
 */
export const createPost = withErrorHandling(async (formData: FormData) => {
  await verifyAuth();

  const data = parseFormData<{
    insightId: string;
    title: string;
    content: string;
    platform: string;
    scheduledFor?: string;
  }>(formData, ['insightId', 'title', 'content', 'platform', 'scheduledFor']);

  // Validate required fields
  if (!data.insightId?.trim()) {
    throw new ValidationError('Insight ID is required', { insightId: 'Insight ID is required' });
  }
  if (!data.title?.trim()) {
    throw new ValidationError('Title is required', { title: 'Title is required' });
  }
  if (!data.content?.trim()) {
    throw new ValidationError('Content is required', { content: 'Content is required' });
  }
  if (!data.platform?.trim()) {
    throw new ValidationError('Platform is required', { platform: 'Platform is required' });
  }

  // Sanitize inputs
  data.title = sanitizeInput(data.title);
  data.content = sanitizeInput(data.content);

  const response = await apiClient.post<PostView>('/api/posts', data);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to create post');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.posts.all);
  revalidateTag(CACHE_TAGS.posts.list);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.sidebar);
  revalidatePath('/content');

  if (!response.data) {
    throw new Error('No data returned from server');
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

/**
 * Update existing post
 */
export const updatePost = withErrorHandling(async (
  id: string,
  formData: FormData
) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Post ID is required');
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

  const response = await apiClient.patch<PostView>(`/api/posts/${id}`, data);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to update post');
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

  if (!response.data) {
    throw new Error('No data returned from server');
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

/**
 * Delete post
 */
export const deletePost = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Post ID is required');
  }

  const response = await apiClient.delete(`/api/posts/${id}`);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete post');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.posts.all);
  revalidateTag(CACHE_TAGS.posts.detail(id));
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.sidebar);
  revalidatePath('/content');

  return createResponse({ id });
});

/**
 * Bulk update posts
 */
export const bulkUpdatePosts = withErrorHandling(async (
  action: string,
  postIds: string[]
) => {
  await verifyAuth();

  if (!action) {
    throw new ValidationError('Action is required');
  }
  if (!postIds || postIds.length === 0) {
    throw new ValidationError('At least one post must be selected');
  }

  const response = await apiClient.post('/api/posts/bulk', {
    action,
    postIds
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to perform bulk operation');
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
});