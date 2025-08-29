"use client";

import { useState, useEffect, useCallback } from "react";
import { getTranscripts } from "@/app/actions/transcripts";
import { getInsights } from "@/app/actions/insights";
import { getPosts, schedulePost, updatePost } from "@/app/actions/posts";
import { getDashboard } from "@/app/actions/dashboard.actions";
import { deleteScheduledEvent } from "@/app/actions/scheduler.actions";
import type { PostView } from "@/types";

interface DashboardCounts {
  transcripts: number;
  insights: number;
  posts: number;
  scheduled: number;
}

/**
 * Hook to fetch dashboard counts data
 */
export function useDashboardCountsData() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await getDashboard();
      
      if (stats.success && stats.data) {
        // The dashboard returns data.counts with transcripts, insights, posts, etc.
        const counts = stats.data.counts;
        setCounts({
          transcripts: counts?.transcripts?.total || 0,
          insights: counts?.insights?.total || 0,
          posts: counts?.posts?.total || 0,
          scheduled: counts?.scheduled?.total || 0,
        });
      } else {
        // Fallback to individual counts
        const [transcriptsRes, insightsRes, postsRes] = await Promise.all([
          getTranscripts({ limit: 1 }),
          getInsights({ limit: 1 }),
          getPosts({ limit: 1 })
        ]);

        setCounts({
          transcripts: transcriptsRes.success && transcriptsRes.meta?.pagination ? transcriptsRes.meta.pagination.total : 0,
          insights: insightsRes.success && insightsRes.meta?.pagination ? insightsRes.meta.pagination.total : 0,
          posts: postsRes.success && postsRes.meta?.pagination ? postsRes.meta.pagination.total : 0,
          scheduled: 0,
        });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch counts'));
      setCounts(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return {
    counts,
    loading,
    error,
    refetch: fetchCounts
  };
}

/**
 * Hook to fetch posts data for the scheduler
 */
export function usePostsData() {
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getPosts({ 
        status: 'approved',
        limit: 100 
      });
      
      if (result.success && result.data) {
        setPosts(result.data || []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch posts'));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
 * Helper function to extract error message
 */
export function getErrorMessage(error: any, fallback: string): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return fallback;
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
      const result = await schedulePost(postId, scheduledFor);
      if (!result.success) {
        throw new Error(getErrorMessage(result, 'Failed to schedule post'));
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
      const result = await deleteScheduledEvent(eventId);
      if (!result.success) {
        throw new Error(getErrorMessage(result, 'Failed to unschedule post'));
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
export function useUpdatePostAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (postId: string, data: FormData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await updatePost(postId, data);
      if (!result.success) {
        throw new Error(getErrorMessage(result, 'Failed to update post'));
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