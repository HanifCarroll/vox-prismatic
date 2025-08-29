'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { CalendarEvent } from '@/types';
import {
  verifyAuth,
  withErrorHandling,
  createResponse,
  CACHE_TAGS,
  ValidationError
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
export const getSchedulerEvents = withErrorHandling(async (params?: {
  start?: string;
  end?: string;
  platforms?: string;
  status?: string;
}) => {
  await verifyAuth();

  const queryParams = new URLSearchParams();
  if (params?.start) queryParams.set('start', params.start);
  if (params?.end) queryParams.set('end', params.end);
  if (params?.platforms) queryParams.set('platforms', params.platforms);
  if (params?.status && params.status !== 'all') queryParams.set('status', params.status);

  const response = await apiClient.get<CalendarEvent[]>(`/api/scheduled-posts?${queryParams}`);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch scheduler events');
  }

  const events = (response.data || []).map(event => ({
    ...event,
    scheduledTime: new Date(event.scheduledTime),
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
  }));

  return createResponse(events);
});

/**
 * Update scheduled event
 */
export const updateScheduledEvent = withErrorHandling(async (
  eventId: string,
  data: {
    scheduledTime?: string;
    content?: string;
    platform?: string;
  }
) => {
  await verifyAuth();

  if (!eventId) {
    throw new ValidationError('Event ID is required');
  }

  const response = await apiClient.patch<CalendarEvent>(`/api/scheduled-posts/${eventId}`, data);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to update scheduled event');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.posts.byStatus('scheduled'));
  revalidatePath('/scheduler');

  if (!response.data) {
    throw new Error('No data returned from server');
  }

  const event = {
    ...response.data,
    scheduledTime: new Date(response.data.scheduledTime),
    createdAt: new Date(response.data.createdAt),
    updatedAt: new Date(response.data.updatedAt),
  };

  return createResponse(event);
});

/**
 * Delete scheduled event
 */
export const deleteScheduledEvent = withErrorHandling(async (eventId: string) => {
  await verifyAuth();

  if (!eventId) {
    throw new ValidationError('Event ID is required');
  }

  const response = await apiClient.delete(`/api/scheduled-posts/${eventId}`);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete scheduled event');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.posts.byStatus('scheduled'));
  revalidatePath('/scheduler');

  return createResponse({ 
    id: eventId, 
    message: 'Scheduled event deleted successfully' 
  });
});

/**
 * Schedule approved post (alternative to schedulePost for scheduler context)
 */
export const scheduleApprovedPost = withErrorHandling(async (data: {
  postId: string;
  platform: string;
  content: string;
  datetime: string;
}) => {
  await verifyAuth();

  if (!data.postId || !data.platform || !data.content || !data.datetime) {
    throw new ValidationError('All fields are required: postId, platform, content, datetime');
  }

  const response = await apiClient.post('/api/posts/schedule', {
    postId: data.postId,
    platform: data.platform,
    content: data.content,
    scheduledTime: data.datetime,
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to schedule post');
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
});