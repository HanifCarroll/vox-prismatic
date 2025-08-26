import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  const response = await fetch(`/api/scheduler/events?${params}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch calendar events');
  }

  const data: CalendarEventsResponse = await response.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch calendar events');
  }

  return data.data;
}

// Schedule a post
async function schedulePost(request: ScheduleRequest): Promise<CalendarEvent> {
  const response = await fetch('/api/scheduler/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to schedule post');
  }

  const data = await response.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to schedule post');
  }

  return data.data;
}

// Unschedule a post
async function unschedulePost(postId: string): Promise<{ scheduledPostId: string }> {
  const response = await fetch(`/api/scheduler/events?postId=${postId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to unschedule post');
  }

  const data = await response.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to unschedule post');
  }

  return data.data;
}

// Delete a scheduled event
async function deleteScheduledEvent(eventId: string): Promise<void> {
  const response = await fetch(`/api/scheduler/events/${eventId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete event');
  }
}

// Update a scheduled event
async function updateScheduledEvent(eventId: string, updateData: { scheduledTime?: string }): Promise<CalendarEvent> {
  const response = await fetch(`/api/scheduler/events/${eventId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update event');
  }

  const data = await response.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to update event');
  }

  return data.data;
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