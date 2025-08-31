/**
 * Scheduler Data Hooks - React Query based data fetching
 * 
 * Provides data fetching hooks that replace the current React Query usage
 * in the scheduler page with properly structured hooks that include
 * optimistic update integration.
 */

import { useQuery } from '@tanstack/react-query';
import { getApiBaseUrl } from "@/lib/api-config";
import type { ApiResponse, CalendarEvent, PostView } from "@/types/database";
import { useMergedOptimisticData } from '@/hooks/useOptimisticUpdate';
import { EntityType } from '@content-creation/types';

const API_BASE_URL = getApiBaseUrl();

/**
 * ★ Insight ─────────────────────────────────────
 * These hooks replace direct API calls in the scheduler page with
 * proper React Query patterns that include optimistic update integration
 * and consistent cache management across the application.
 * ─────────────────────────────────────────────────
 */

/**
 * Fetch scheduler events (calendar events from scheduled posts)
 */
export function useSchedulerEvents(params?: {
  start?: string;
  end?: string;
  platforms?: string;
  status?: string;
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['scheduler', 'events', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.start) queryParams.set('start', params.start);
      if (params?.end) queryParams.set('end', params.end);
      if (params?.platforms) queryParams.set('platforms', params.platforms);
      if (params?.status && params.status !== 'all') queryParams.set('status', params.status);

      const response = await fetch(`${API_BASE_URL}/api/scheduler/events?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch scheduler events: ${response.statusText}`);
      }

      const eventsData: ApiResponse<CalendarEvent[]> = await response.json();
      if (!eventsData.success) {
        throw new Error(eventsData.error || 'Failed to fetch scheduler events');
      }

      // Transform dates to Date objects
      const events = (eventsData.data || []).map(event => ({
        ...event,
        scheduledTime: new Date(event.scheduledTime),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      }));

      return events;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 1,
  });

  // Merge with optimistic updates for scheduled posts
  const eventsWithOptimistic = useMergedOptimisticData(
    data || [],
    EntityType.SCHEDULED_POST
  );

  return {
    data: eventsWithOptimistic,
    events: eventsWithOptimistic,
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
    queryKey: ['scheduler', 'posts'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/posts?status=approved&limit=100`);
      if (!response.ok) {
        throw new Error(`Failed to fetch approved posts: ${response.statusText}`);
      }

      const postsData: ApiResponse<PostView[]> = await response.json();
      if (!postsData.success) {
        throw new Error(postsData.error || 'Failed to fetch approved posts');
      }

      // Transform dates to Date objects if they exist
      const posts = (postsData.data || []).map(post => ({
        ...post,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt),
      }));

      return posts;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - approved posts don't change as often
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 1,
  });

  // Merge with optimistic updates for posts
  const postsWithOptimistic = useMergedOptimisticData(
    data || [],
    EntityType.POST
  );

  return {
    data: postsWithOptimistic,
    posts: postsWithOptimistic,
    isLoading,
    error,
    refetch
  };
}

/**
 * Combined scheduler data hook that mimics the current scheduler page structure
 */
export function useSchedulerData() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['scheduler'],
    queryFn: async () => {
      // Fetch calendar events and approved posts in parallel (matches current scheduler page)
      const [eventsResponse, postsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/scheduler/events`),
        fetch(`${API_BASE_URL}/api/posts?status=approved&limit=100`),
      ]);

      if (!eventsResponse.ok || !postsResponse.ok) {
        throw new Error("Failed to fetch scheduler data");
      }

      const eventsData: ApiResponse<CalendarEvent[]> = await eventsResponse.json();
      const postsData: ApiResponse<PostView[]> = await postsResponse.json();

      // Transform dates to Date objects
      const events = (eventsData.success ? eventsData.data || [] : []).map(event => ({
        ...event,
        scheduledTime: new Date(event.scheduledTime),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      }));

      const approvedPosts = (postsData.success ? postsData.data || [] : []).map(post => ({
        ...post,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt),
      }));

      return {
        events,
        approvedPosts,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 1,
  });

  // Merge with optimistic updates
  const eventsWithOptimistic = useMergedOptimisticData(
    data?.events || [],
    EntityType.SCHEDULED_POST
  );

  const postsWithOptimistic = useMergedOptimisticData(
    data?.approvedPosts || [],
    EntityType.POST
  );

  return {
    events: eventsWithOptimistic,
    approvedPosts: postsWithOptimistic,
    posts: postsWithOptimistic, // Alias for backwards compatibility
    isLoading,
    error,
    refetch: () => {
      // This will be handled by React Query automatically
    }
  };
}