/**
 * API Actions Hook
 * Replaces server actions with API client calls
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { PostView, DashboardData, TranscriptFilter, InsightFilter, PostFilter } from "@/types";

/**
 * Hook to fetch full dashboard data using React Query
 * This ensures data is cached and shared across components
 */
export function useDashboardData() {
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.main(),
    queryFn: async () => {
      const response = await api.dashboard.getDashboard();
      
      if (response.success && response.data) {
        // Transform activity timestamps if needed
        if (response.data.activity) {
          response.data.activity = response.data.activity.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp).toISOString(),
          }));
        }
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - dashboard data doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false,
    retry: 1,
    // No refetchInterval - rely on cache invalidation when user actions occur
  });

  return {
    data: data ?? null,
    loading,
    error,
    refetch
  };
}

/**
 * Hook to fetch posts data
 */
export function usePostsData(filters?: PostFilter) {
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const result = await api.posts.getPosts({
        status: filters?.status as any,
        limit: filters?.limit
      });
      
      if (result.success && result.data) {
        setPosts(result.data);
        setError(null);
      } else {
        setPosts([]);
        setError(new Error(result.error || 'Failed to fetch posts'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch posts'));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.limit]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    data: posts,
    posts,
    loading,
    error,
    refetch: fetchPosts
  };
}

/**
 * Hook to fetch transcripts
 */
export function useTranscriptsData(filters?: TranscriptFilter) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const result = await api.transcripts.getTranscripts({
        search: filters?.search,
        limit: filters?.limit,
        page: filters?.offset ? Math.floor(filters.offset / (filters.limit || 20)) + 1 : 1
      });
      
      if (result.success && result.data) {
        setData(result.data);
        setError(null);
      } else {
        setData([]);
        setError(new Error(result.error || 'Failed to fetch transcripts'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch transcripts'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters?.search, filters?.limit, filters?.offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

/**
 * Hook to fetch insights
 */
export function useInsightsData(filters?: InsightFilter) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.transcriptId) params.append('transcriptId', filters.transcriptId);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const result = await api.insights.getInsights({
        status: filters?.status as any,
        transcriptId: filters?.transcriptId,
        limit: filters?.limit,
        page: filters?.offset ? Math.floor(filters.offset / (filters.limit || 20)) + 1 : 1
      });
      
      if (result.success && result.data) {
        setData(result.data);
        setError(null);
      } else {
        setData([]);
        setError(new Error(result.error || 'Failed to fetch insights'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch insights'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.transcriptId, filters?.limit, filters?.offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

/**
 * Hook to schedule a post
 */
export function useSchedulePost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const schedule = useCallback(async (postId: string, scheduledFor: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.posts.schedulePost(postId, scheduledFor);
      if (!result.success) {
        throw new Error(result.error || 'Failed to schedule post');
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to schedule post');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    schedule,
    loading,
    error
  };
}

/**
 * Hook to unschedule a post
 */
export function useUnschedulePost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const unschedule = useCallback(async (eventId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.scheduler.deleteScheduledEvent(eventId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to unschedule post');
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unschedule post');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    unschedule,
    loading,
    error
  };
}

/**
 * Hook to update a post
 */
export function useUpdatePost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (postId: string, data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.posts.updatePost(postId, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update post');
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update post');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    update,
    loading,
    error
  };
}

/**
 * Helper function to extract error message
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  if (error && typeof error === 'object' && 'error' in error) {
    return String(error.error);
  }
  return fallback;
}