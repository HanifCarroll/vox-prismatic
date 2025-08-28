/**
 * TanStack Query hooks for dashboard operations
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { DashboardData } from '@/types';

// Query keys for dashboard
export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: () => [...dashboardKeys.all, 'data'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
};

/**
 * Fetch comprehensive dashboard data
 */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.data(),
    queryFn: async () => {
      const response = await apiClient.get<DashboardData>('/api/dashboard');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }
      
      // Transform activity timestamps to Date objects
      if (response.data?.activity) {
        response.data.activity = response.data.activity.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp).toISOString(),
        }));
      }
      
      return response.data;
    },
    staleTime: Infinity, // Data never becomes stale automatically
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

/**
 * Fetch dashboard counts only (lighter endpoint for counts)
 */
export function useDashboardCounts() {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'counts'],
    queryFn: async () => {
      const response = await apiClient.get('/api/dashboard');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard counts');
      }
      
      // Return only the counts portion
      return (response.data as any)?.counts;
    },
    staleTime: Infinity, // Data never becomes stale automatically
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

/**
 * Prefetch dashboard data for server-side rendering
 */
export async function prefetchDashboard() {
  try {
    const response = await apiClient.get<DashboardData>('/api/dashboard');
    if (!response.success) {
      console.error('Failed to prefetch dashboard:', response.error);
      return null;
    }
    return response.data;
  } catch (error) {
    console.error('Error prefetching dashboard:', error);
    return null;
  }
}