'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { CalendarEvent, Result } from '@/types';
import {
  createResponse,
  CACHE_TAGS
} from './lib/action-utils';

/**
 * Scheduler Server Actions
 * Server actions for scheduler-specific operations like managing scheduled events
 */

// =====================================================================
// SCHEDULED EVENT OPERATIONS
// =====================================================================

/**
 * Get scheduler events with filters
 */
export async function getSchedulerEvents(params?: {
  start?: string;
  end?: string;
  platforms?: string;
  status?: string;
}): Promise<Result<CalendarEvent[]>> {
  // Auth not implemented yet

  const queryParams = new URLSearchParams();
  if (params?.start) queryParams.set('start', params.start);
  if (params?.end) queryParams.set('end', params.end);
  if (params?.platforms) queryParams.set('platforms', params.platforms);
  if (params?.status && params.status !== 'all') queryParams.set('status', params.status);

  try {
    const response = await apiClient.get<CalendarEvent[]>(`/api/scheduled-posts?${queryParams}`);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to fetch scheduler events'
      };
    }

    const events = (response.data || []).map(event => ({
      ...event,
      scheduledTime: new Date(event.scheduledTime),
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt),
    }));

    return createResponse(events);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to fetch scheduler events:', error);
    throw new Error('Unable to load scheduler events. Please try again.');
  }
}

/**
 * Update scheduled event
 */
export async function updateScheduledEvent(
  eventId: string,
  data: {
    scheduledTime?: string;
    content?: string;
    platform?: string;
  }
): Promise<Result<CalendarEvent>> {
  // Auth not implemented yet

  if (!eventId) {
    return {
      success: false,
      error: 'Event ID is required'
    };
  }

  try {
    const response = await apiClient.patch<CalendarEvent>(`/api/scheduled-posts/${eventId}`, data);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to update scheduled event'
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: 'No data returned from server'
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.posts.byStatus('scheduled'));
    revalidatePath('/scheduler');

    const event = {
      ...response.data,
      scheduledTime: new Date(response.data.scheduledTime),
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };

    return createResponse(event);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to update scheduled event:', error);
    throw new Error('Unable to update scheduled event. Please try again.');
  }
}

/**
 * Delete scheduled event
 */
export async function deleteScheduledEvent(eventId: string): Promise<Result<{ id: string; message: string }>> {
  // Auth not implemented yet

  if (!eventId) {
    return {
      success: false,
      error: 'Event ID is required'
    };
  }

  try {
    const response = await apiClient.delete(`/api/scheduled-posts/${eventId}`);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to delete scheduled event'
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.posts.byStatus('scheduled'));
    revalidatePath('/scheduler');

    return createResponse({ 
      id: eventId, 
      message: 'Scheduled event deleted successfully' 
    });
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to delete scheduled event:', error);
    throw new Error('Unable to delete scheduled event. Please try again.');
  }
}

/**
 * Schedule approved post (alternative to schedulePost for scheduler context)
 */
export async function scheduleApprovedPost(data: {
  postId: string;
  platform: string;
  content: string;
  datetime: string;
}): Promise<Result<{ data: any; message: string }>> {
  // Auth not implemented yet

  if (!data.postId || !data.platform || !data.content || !data.datetime) {
    return {
      success: false,
      error: 'All fields are required: postId, platform, content, datetime'
    };
  }

  try {
    const response = await apiClient.post('/api/posts/schedule', {
      postId: data.postId,
      platform: data.platform,
      content: data.content,
      scheduledTime: data.datetime,
    });
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to schedule post'
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.posts.detail(data.postId));
    revalidateTag(CACHE_TAGS.posts.byStatus('scheduled'));
    revalidatePath('/content');
    revalidatePath('/scheduler');

    return createResponse({
      data: response.data,
      message: 'Post scheduled successfully'
    });
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to schedule post:', error);
    throw new Error('Unable to schedule post. Please try again.');
  }
}