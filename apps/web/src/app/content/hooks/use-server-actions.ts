"use client";

import { useState, useEffect, useCallback } from "react";
import { getTranscripts } from "@/app/actions/transcripts";
import { getInsights } from "@/app/actions/insights";
import { getPosts, schedulePost, updatePost } from "@/app/actions/posts";
import { getDashboard } from "@/app/actions/dashboard.actions";
import { deleteScheduledEvent } from "@/app/actions/scheduler.actions";
import type { PostView, DashboardData } from "@/types";

/**
 * Hook to fetch full dashboard data
 * Returns the complete dashboard data structure including counts, activity, stats, and workflow pipeline
 */
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getDashboard();
      
      if (response.success && response.data) {
        // Return the full dashboard data structure
        setData(response.data);
        setError(null);
      } else {
        setData(null);
        setError(new Error('Failed to fetch dashboard data'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

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