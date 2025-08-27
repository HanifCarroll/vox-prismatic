/**
 * TanStack Query hooks for sidebar operations
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SidebarCounts } from '@/types';

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
      const response = await apiClient.get<SidebarCounts>('/api/sidebar/counts');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sidebar counts');
      }
      return response.data;
    },
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
  });
}