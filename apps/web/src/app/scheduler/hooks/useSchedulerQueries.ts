import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CalendarEvent, CalendarEventsResponse, ScheduleRequest, Platform } from '@/types/scheduler';

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
};

// Fetch calendar events
async function fetchCalendarEvents(filters: {
  start?: string;
  end?: string;
  platforms?: string;
  status?: string;
  postId?: string;
}): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  
  if (filters.start) params.append('start', filters.start);
  if (filters.end) params.append('end', filters.end);
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
}) {
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
  });
}

export function useSchedulePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulePost,
    onSuccess: (newEvent) => {
      // Add the new event to all relevant queries
      queryClient.setQueriesData(
        { queryKey: schedulerKeys.events() },
        (oldData: CalendarEvent[] | undefined) => {
          if (!oldData) return [newEvent];
          return [...oldData, newEvent];
        }
      );
    },
  });
}

export function useUnschedulePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unschedulePost,
    onSuccess: (data, postId) => {
      // Remove the event from all queries by finding and filtering it out
      queryClient.setQueriesData(
        { queryKey: schedulerKeys.events() },
        (oldData: CalendarEvent[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(event => event.postId !== postId);
        }
      );
    },
  });
}

export function useDeleteScheduledEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteScheduledEvent,
    onSuccess: (_, eventId) => {
      // Remove the event from all queries
      queryClient.setQueriesData(
        { queryKey: schedulerKeys.events() },
        (oldData: CalendarEvent[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(event => event.id !== eventId);
        }
      );
    },
  });
}

export function useUpdateScheduledEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, updateData }: { eventId: string; updateData: { scheduledTime?: string } }) => 
      updateScheduledEvent(eventId, updateData),
    onSuccess: (updatedEvent) => {
      // Update the event in all queries
      queryClient.setQueriesData(
        { queryKey: schedulerKeys.events() },
        (oldData: CalendarEvent[] | undefined) => {
          if (!oldData) return [updatedEvent];
          return oldData.map(event => 
            event.id === updatedEvent.id ? updatedEvent : event
          );
        }
      );
    },
  });
}