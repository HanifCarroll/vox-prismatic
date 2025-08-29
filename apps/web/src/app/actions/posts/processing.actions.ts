'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { PostView } from '@/types/database';
import {
  verifyAuth,
  withErrorHandling,
  createResponse,
  CACHE_TAGS,
  ValidationError
} from '../lib/action-utils';

/**
 * Post Processing Operations
 * Server actions for post processing operations like scheduling and approval
 */

// =====================================================================
// SCHEDULING OPERATIONS
// =====================================================================

/**
 * Schedule post
 */
export const schedulePost = withErrorHandling(async (
  id: string,
  scheduledFor: string,
  platform?: string
) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Post ID is required');
  }
  if (!scheduledFor) {
    throw new ValidationError('Scheduled time is required');
  }

  const response = await apiClient.post(`/api/posts/${id}/schedule`, {
    scheduledFor,
    platform
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to schedule post');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.posts.detail(id));
  revalidateTag(CACHE_TAGS.posts.byStatus('scheduled'));
  revalidatePath('/content');
  revalidatePath('/scheduler');

  return createResponse({ 
    id, 
    scheduledFor,
    message: 'Post scheduled successfully'
  });
});

/**
 * Unschedule post
 */
export const unschedulePost = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Post ID is required');
  }

  const response = await apiClient.post(`/api/posts/${id}/unschedule`, {});
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to unschedule post');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.posts.detail(id));
  revalidateTag(CACHE_TAGS.posts.byStatus('approved'));
  revalidateTag(CACHE_TAGS.posts.byStatus('scheduled'));
  revalidatePath('/content');
  revalidatePath('/scheduler');

  return createResponse({ 
    id, 
    message: 'Post unscheduled successfully' 
  });
});

// =====================================================================
// APPROVAL OPERATIONS
// =====================================================================

/**
 * Approve post
 */
export const approvePost = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Post ID is required');
  }

  const response = await apiClient.patch<PostView>(`/api/posts/${id}`, {
    status: 'approved'
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to approve post');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.posts.detail(id));
  revalidateTag(CACHE_TAGS.posts.byStatus('approved'));
  revalidateTag(CACHE_TAGS.posts.byStatus('draft'));
  revalidatePath('/content');

  if (!response.data) {
    throw new Error('No data returned from server');
  }

  const post = {
    ...response.data,
    createdAt: new Date(response.data.createdAt),
    updatedAt: new Date(response.data.updatedAt),
    scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
  };

  return createResponse(post);
});

/**
 * Reject post
 */
export const rejectPost = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Post ID is required');
  }

  const response = await apiClient.patch<PostView>(`/api/posts/${id}`, {
    status: 'rejected'
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to reject post');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.posts.detail(id));
  revalidateTag(CACHE_TAGS.posts.byStatus('rejected'));
  revalidateTag(CACHE_TAGS.posts.byStatus('draft'));
  revalidatePath('/content');

  if (!response.data) {
    throw new Error('No data returned from server');
  }

  const post = {
    ...response.data,
    createdAt: new Date(response.data.createdAt),
    updatedAt: new Date(response.data.updatedAt),
    scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
  };

  return createResponse(post);
});