'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { PostView } from '@/types/database';
import type { Result } from '@/types';
import {
  createResponse,
  CACHE_TAGS
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
export async function schedulePost(
  id: string,
  scheduledFor: string,
  platform?: string
): Promise<Result<{ id: string; scheduledFor: string; message: string }>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: 'Post ID is required'
    };
  }
  if (!scheduledFor) {
    return {
      success: false,
      error: 'Scheduled time is required'
    };
  }

  try {
    const response = await apiClient.post(`/api/posts/${id}/schedule`, {
      scheduledFor,
      platform
    });
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to schedule post'
      };
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
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to schedule post:', error);
    throw new Error('Unable to schedule post. Please try again.');
  }
}

/**
 * Unschedule post
 */
export async function unschedulePost(id: string): Promise<Result<{ id: string; message: string }>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: 'Post ID is required'
    };
  }

  try {
    const response = await apiClient.post(`/api/posts/${id}/unschedule`, {});
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to unschedule post'
      };
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
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to unschedule post:', error);
    throw new Error('Unable to unschedule post. Please try again.');
  }
}

// =====================================================================
// APPROVAL OPERATIONS
// =====================================================================

/**
 * Approve post
 */
export async function approvePost(id: string): Promise<Result<PostView>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: 'Post ID is required'
    };
  }

  try {
    const response = await apiClient.patch<PostView>(`/api/posts/${id}`, {
      status: 'approved'
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

    // Revalidate caches
    revalidateTag(CACHE_TAGS.posts.detail(id));
    revalidateTag(CACHE_TAGS.posts.byStatus('approved'));
    revalidateTag(CACHE_TAGS.posts.byStatus('draft'));
    revalidatePath('/content');

    const post = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
    };

    return createResponse(post);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to approve post:', error);
    throw new Error('Unable to approve post. Please try again.');
  }
}

/**
 * Reject post
 */
export async function rejectPost(id: string): Promise<Result<PostView>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: 'Post ID is required'
    };
  }

  try {
    const response = await apiClient.patch<PostView>(`/api/posts/${id}`, {
      status: 'rejected'
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

    // Revalidate caches
    revalidateTag(CACHE_TAGS.posts.detail(id));
    revalidateTag(CACHE_TAGS.posts.byStatus('rejected'));
    revalidateTag(CACHE_TAGS.posts.byStatus('draft'));
    revalidatePath('/content');

    const post = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
    };

    return createResponse(post);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to reject post:', error);
    throw new Error('Unable to reject post. Please try again.');
  }
}