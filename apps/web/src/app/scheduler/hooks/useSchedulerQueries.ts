import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Platform } from '@/types';
import type { CalendarEventsResponse, ScheduleRequest } from '@/types/scheduler';
import type { CalendarEvent, PostView, ApiResponse } from '@/types';
import { postKeys } from '@/app/content/hooks/usePostQueries';
import { dashboardKeys } from '@/app/hooks/useDashboardQueries';
import { sidebarKeys } from '@/app/hooks/useSidebarQueries';
import { startOfWeek, endOfWeek, addDays } from 'date-fns';

// Query Keys
export const schedulerKeys = {
  all: ['scheduler'] as const,
  events: () => [...schedulerKeys.all, 'events'] as const,
  eventsWithFilters: (filters: {
    start?: string;
    end?: string;
    platforms?: string;
    status?: string;
    postId?: string;
  }) => [...schedulerKeys.events(), filters] as const,
  stats: () => [...schedulerKeys.all, 'stats'] as const,
};

// Helper function to format date to YYYY-MM-DD
function formatDateForAPI(dateString: string): string {
  if (!dateString) return dateString;
  
  // If already in YYYY-MM-DD format, return as-is
  if (dateString.length === 10 && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // If it's an ISO datetime string, extract the date part
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  
  // Try to parse as Date and format
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Fall back to original string if parsing fails
  }
  
  return dateString;
}

// Fetch calendar events
async function fetchCalendarEvents(filters: {
  start?: string;
  end?: string;
  platforms?: string;
  status?: string;
  postId?: string;
}): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  
  if (filters.start) params.append('start', formatDateForAPI(filters.start));
  if (filters.end) params.append('end', formatDateForAPI(filters.end));
  if (filters.platforms) params.append('platforms', filters.platforms);
  if (filters.status) params.append('status', filters.status);
  if (filters.postId) params.append('postId', filters.postId);

  const queryString = params.toString();
  const endpoint = `/api/scheduler/events${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiClient.get<CalendarEvent[]>(endpoint);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch calendar events');
  }

  return response.data || [];
}

// Schedule a post
async function schedulePost(request: ScheduleRequest): Promise<CalendarEvent> {
  const response = await apiClient.post<CalendarEvent>('/api/scheduler/events', request);

  if (!response.success) {
    throw new Error(response.error || 'Failed to schedule post');
  }

  if (!response.data) {
    throw new Error('No data returned from schedule post');
  }

  return response.data;
}

// Unschedule a post
async function unschedulePost(postId: string): Promise<{ scheduledPostId: string }> {
  const response = await apiClient.delete<{ scheduledPostId: string }>(`/api/scheduler/events?postId=${postId}`);

  if (!response.success) {
    throw new Error(response.error || 'Failed to unschedule post');
  }

  if (!response.data) {
    throw new Error('No data returned from unschedule post');
  }

  return response.data;
}

// Delete a scheduled event
async function deleteScheduledEvent(eventId: string): Promise<void> {
  const response = await apiClient.delete(`/api/scheduler/events/${eventId}`);

  if (!response.success) {
    throw new Error(response.error || 'Failed to delete event');
  }
}

// Update a scheduled event
async function updateScheduledEvent(eventId: string, updateData: { scheduledTime?: string }): Promise<CalendarEvent> {
  const response = await apiClient.put<CalendarEvent>(`/api/scheduler/events/${eventId}`, updateData);

  if (!response.success) {
    throw new Error(response.error || 'Failed to update event');
  }

  if (!response.data) {
    throw new Error('No data returned from update event');
  }

  return response.data;
}

// Hooks
export function useCalendarEvents(filters: {
  start?: string;
  end?: string;
  platforms?: Platform[];
  status?: string;
  postId?: string;
}, initialData?: CalendarEvent[]) {
  const platformsString = filters.platforms?.join(',');
  
  return useQuery({
    queryKey: schedulerKeys.eventsWithFilters({
      ...filters,
      platforms: platformsString,
    }),
    queryFn: () => fetchCalendarEvents({
      ...filters,
      platforms: platformsString,
    }),
    enabled: !!(filters.start && filters.end) || !!filters.postId, // Only run if we have date range or postId
    initialData,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useSchedulePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulePost,
    onSuccess: () => {
      // Remove all event queries from cache and refetch
      queryClient.removeQueries({ queryKey: schedulerKeys.events() });
      queryClient.invalidateQueries({ queryKey: schedulerKeys.events() });
      
      // Invalidate posts queries to update approved posts sidebar
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      
      // Invalidate dashboard and sidebar counts
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
    },
  });
}

export function useUnschedulePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unschedulePost,
    onSuccess: () => {
      // Simply invalidate to fetch fresh data from server
      queryClient.invalidateQueries({ queryKey: schedulerKeys.events() });
      
      // Invalidate posts queries to update approved posts sidebar (post returns to approved)
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      
      // Invalidate dashboard and sidebar counts
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
    },
  });
}

export function useDeleteScheduledEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteScheduledEvent,
    onSuccess: () => {
      // Simply invalidate to fetch fresh data from server
      queryClient.invalidateQueries({ queryKey: schedulerKeys.events() });
    },
  });
}

export function useUpdateScheduledEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, updateData }: { eventId: string; updateData: { scheduledTime?: string } }) => 
      updateScheduledEvent(eventId, updateData),
    onSuccess: () => {
      // Simply invalidate to fetch fresh data from server
      queryClient.invalidateQueries({ queryKey: schedulerKeys.events() });
    },
  });
}

// Scheduler Statistics Interface
export interface SchedulerStats {
  totalApprovedPosts: number;
  totalScheduledEvents: number;
  thisWeekEvents: number;
  next7DaysEvents: number;
}

// Fetch scheduler statistics
async function fetchSchedulerStats(): Promise<SchedulerStats> {
  try {
    const now = new Date();
    const startOfThisWeek = startOfWeek(now);
    const endOfThisWeek = endOfWeek(now);
    const next7Days = addDays(now, 7);

    // Fetch data in parallel
    const [approvedPostsResponse, allEventsResponse, thisWeekEventsResponse, next7DaysEventsResponse] = await Promise.all([
      apiClient.get<ApiResponse<PostView[]>>('/api/posts?status=approved'),
      apiClient.get<CalendarEvent[]>('/api/scheduler/events'),
      fetchCalendarEvents({
        start: startOfThisWeek.toISOString(),
        end: endOfThisWeek.toISOString(),
      }),
      fetchCalendarEvents({
        start: now.toISOString(),
        end: next7Days.toISOString(),
      }),
    ]);

    const approvedPosts = approvedPostsResponse.success && approvedPostsResponse.data ? 
      (Array.isArray(approvedPostsResponse.data) ? approvedPostsResponse.data : approvedPostsResponse.data.data || []) : [];
    const allEvents = allEventsResponse.success ? allEventsResponse.data || [] : [];

    return {
      totalApprovedPosts: approvedPosts.length,
      totalScheduledEvents: allEvents.length,
      thisWeekEvents: thisWeekEventsResponse.length,
      next7DaysEvents: next7DaysEventsResponse.length,
    };
  } catch (error) {
    console.error('Failed to fetch scheduler stats:', error);
    return {
      totalApprovedPosts: 0,
      totalScheduledEvents: 0,
      thisWeekEvents: 0,
      next7DaysEvents: 0,
    };
  }
}

// Hook to fetch scheduler statistics
export function useSchedulerStats() {
  return useQuery({
    queryKey: schedulerKeys.stats(),
    queryFn: fetchSchedulerStats,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
  });
}