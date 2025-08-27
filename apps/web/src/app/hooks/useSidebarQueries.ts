/**
 * TanStack Query hooks for sidebar operations
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SidebarCounts, ApiResponse, DashboardData } from '@/types';

// Query keys for sidebar
export const sidebarKeys = {
  all: ['sidebar'] as const,
  counts: () => [...sidebarKeys.all, 'counts'] as const,
};

/**
 * Fetch sidebar badge counts
 */
export function useSidebarCounts() {
  return useQuery({
    queryKey: sidebarKeys.counts(),
    queryFn: async () => {
      // Source counts from the consolidated dashboard endpoint to avoid drift
      const response = await apiClient.get<DashboardData>('/api/dashboard');
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }

      const data = response.data as DashboardData;
      const counts: SidebarCounts = {
        transcripts: data.counts.transcripts.byStatus.raw || 0,
        insights: data.counts.insights.byStatus.needs_review || 0,
        posts: data.counts.posts.byStatus.needs_review || 0,
      };
      return counts;
    },
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
  });
}