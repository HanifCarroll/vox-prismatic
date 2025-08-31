/**
 * Scheduler Data Hooks - React Query based data fetching
 * Replaces Zustand store data selectors with React Query
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api';
import type { CalendarEvent, PostView } from '@/types';

/**
 * Fetch scheduler events (scheduled posts)
 */
export function useSchedulerEvents() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.scheduler.events(),
    queryFn: async () => {
      const response = await api.scheduler.getScheduledEvents();
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch scheduler events');
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute - scheduler data changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchOnWindowFocus: true,
    retry: 1,
  });

  return {
    data: data ?? [],
    events: data ?? [],
    isLoading,
    error,
    refetch
  };
}

/**
 * Fetch approved posts available for scheduling
 */
export function useSchedulerPosts() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.scheduler.posts(),
    queryFn: async () => {
      const response = await api.posts.getPosts({ status: 'approved' });
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch approved posts');
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - approved posts don't change as often
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: true,
    retry: 1,
  });

  return {
    data: data ?? [],
    posts: data ?? [],
    isLoading,
    error,
    refetch
  };
}

/**
 * Combined scheduler data hook for convenience
 */
export function useSchedulerData() {
  const events = useSchedulerEvents();
  const posts = useSchedulerPosts();

  return {
    events: events.data,
    posts: posts.data,
    isLoading: events.isLoading || posts.isLoading,
    error: events.error || posts.error,
    refetch: () => {
      events.refetch();
      posts.refetch();
    }
  };
}