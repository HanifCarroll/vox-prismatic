/**
 * Scheduler API Client
 * Client-side API calls for scheduler operations
 */

import { getApiBaseUrl } from '../api-config';
import type { CalendarEvent, Result } from '@/types';

const API_BASE_URL = getApiBaseUrl();

/**
 * Helper function for making API requests
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
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
 * Scheduler API methods
 */
export const schedulerAPI = {
  /**
   * Get scheduler events with filters
   */
  async getSchedulerEvents(params?: {
    start?: string;
    end?: string;
    platforms?: string;
    status?: string;
  }): Promise<Result<CalendarEvent[]>> {
    const queryParams = new URLSearchParams();
    if (params?.start) queryParams.set('start', params.start);
    if (params?.end) queryParams.set('end', params.end);
    if (params?.platforms) queryParams.set('platforms', params.platforms);
    if (params?.status && params.status !== 'all') queryParams.set('status', params.status);

    try {
      const response = await fetchAPI<CalendarEvent[]>(`/api/scheduler/events?${queryParams}`);
      
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

      return {
        success: true,
        data: events
      };
    } catch (error) {
      console.error('Failed to fetch scheduler events:', error);
      throw new Error('Unable to load scheduler events. Please try again.');
    }
  },

  /**
   * Update scheduled event
   */
  async updateScheduledEvent(
    eventId: string,
    data: {
      scheduledTime?: string;
      content?: string;
      platform?: string;
    }
  ): Promise<Result<CalendarEvent>> {
    if (!eventId) {
      return {
        success: false,
        error: 'Event ID is required'
      };
    }

    try {
      const response = await fetchAPI<CalendarEvent>(`/api/scheduler/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      
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

      const event = {
        ...response.data,
        scheduledTime: new Date(response.data.scheduledTime),
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };

      return {
        success: true,
        data: event
      };
    } catch (error) {
      console.error('Failed to update scheduled event:', error);
      throw new Error('Unable to update scheduled event. Please try again.');
    }
  },

  /**
   * Delete scheduled event
   */
  async deleteScheduledEvent(eventId: string): Promise<Result<{ id: string; message: string }>> {
    if (!eventId) {
      return {
        success: false,
        error: 'Event ID is required'
      };
    }

    try {
      const response = await fetchAPI(`/api/scheduler/events/${eventId}`, {
        method: 'DELETE'
      });
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to delete scheduled event'
        };
      }

      return {
        success: true,
        data: { 
          id: eventId, 
          message: 'Scheduled event deleted successfully' 
        }
      };
    } catch (error) {
      console.error('Failed to delete scheduled event:', error);
      throw new Error('Unable to delete scheduled event. Please try again.');
    }
  },

  /**
   * Schedule approved post
   */
  async scheduleApprovedPost(data: {
    postId: string;
    platform: string;
    content: string;
    datetime: string;
  }): Promise<Result<{ data: any; message: string }>> {
    if (!data.postId || !data.platform || !data.content || !data.datetime) {
      return {
        success: false,
        error: 'All fields are required: postId, platform, content, datetime'
      };
    }

    try {
      const response = await fetchAPI('/api/scheduler/events', {
        method: 'POST',
        body: JSON.stringify({
          postId: data.postId,
          platform: data.platform,
          scheduledTime: data.datetime,
          // Note: content is not needed for the scheduler endpoint
          // as it references the existing post
        })
      });
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to schedule post'
        };
      }

      return {
        success: true,
        data: {
          data: response.data,
          message: 'Post scheduled successfully'
        }
      };
    } catch (error) {
      console.error('Failed to schedule post:', error);
      throw new Error('Unable to schedule post. Please try again.');
    }
  },

  /**
   * Get scheduler statistics
   */
  async getSchedulerStats(): Promise<Result<any>> {
    try {
      const response = await fetchAPI<any>('/api/scheduler/stats');
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch scheduler stats'
        };
      }

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch scheduler stats:', error);
      throw new Error('Unable to load scheduler stats. Please try again.');
    }
  },

  /**
   * Create a new scheduled event
   */
  async createScheduledEvent(data: {
    postId: string;
    platform: string;
    scheduledTime: string;
    timeSlot?: string;
  }): Promise<Result<any>> {
    try {
      const response = await fetchAPI<any>('/api/scheduler/events', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to create scheduled event'
        };
      }

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to create scheduled event:', error);
      throw new Error('Unable to create scheduled event. Please try again.');
    }
  }
};