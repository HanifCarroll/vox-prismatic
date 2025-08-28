/**
 * TanStack Query hooks for insight operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/lib/toast';
import type { InsightView, BulkInsightsResponse, GenerateInsightsResponse, ApiResponseWithMetadata } from '@/types';
import { dashboardKeys } from '@/app/hooks/useDashboardQueries';
import { sidebarKeys } from '@/app/hooks/useSidebarQueries';

export interface InsightFilters {
  status?: string;
  postType?: string;
  category?: string;
  minScore?: number;
  maxScore?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  enabled: boolean;  // Required - must explicitly specify if query should run
}

// Query keys
export const insightKeys = {
  all: ['insights'] as const,
  lists: () => [...insightKeys.all, 'list'] as const,
  list: (filters: InsightFilters) => [...insightKeys.lists(), { filters }] as const,
  details: () => [...insightKeys.all, 'detail'] as const,
  detail: (id: string) => [...insightKeys.details(), id] as const,
};

/**
 * Fetch insights with filters
 */
export function useInsights(filters: InsightFilters) {
  return useQuery({
    queryKey: insightKeys.list(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      // Add filters to search params (excluding enabled)
      Object.entries(filters).forEach(([key, value]) => {
        if (key !== 'enabled' && value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      
      const queryString = searchParams.toString();
      const endpoint = `/api/insights${queryString ? `?${queryString}` : ''}`;
      
      // Backend directly returns: { success: true, data: InsightView[], meta: {...} }
      // apiClient just passes through the JSON response
      type InsightsApiResponse = ApiResponseWithMetadata<InsightView> & {
        error?: string;
      };
      
      const response = await apiClient.get<InsightView[]>(endpoint) as InsightsApiResponse;
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch insights');
      }
      
      // Convert date strings to Date objects in the data array
      const insights = response.data.map((insight) => ({
        ...insight,
        createdAt: new Date(insight.createdAt),
        updatedAt: new Date(insight.updatedAt),
      }));
      
      // Return both data and metadata
      return {
        data: insights,
        meta: response.meta
      };
    },
    staleTime: Infinity, // Data never becomes stale automatically
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    enabled: filters.enabled,
  });
}

/**
 * Fetch single insight by ID
 */
export function useInsight(id: string) {
  return useQuery({
    queryKey: insightKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<InsightView>(`/api/insights/${id}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch insight');
      }
      return response.data ? {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      } : null;
    },
    enabled: !!id,
  });
}

/**
 * Update existing insight
 */
export function useUpdateInsight() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      summary?: string;
      category?: string;
      status?: string;
    }) => {
      const { id, ...updateData } = data;
      const response = await apiClient.patch<InsightView>(`/api/insights/${id}`, updateData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update insight');
      }
      return response.data;
    },
    onSuccess: (data) => {
      if (!data) return;
      
      const updatedData = {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
      
      // Update the specific insight in cache
      queryClient.setQueryData(insightKeys.detail(data.id), updatedData);
      
      // Update all insights lists that might contain this insight
      queryClient.setQueriesData<InsightView[]>(
        { queryKey: insightKeys.lists() },
        (old) => old?.map(insight => insight.id === data.id ? updatedData : insight)
      );
      
      // Invalidate dashboard to reflect changes
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts as insight status might have changed
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Show success toast
      toast.saved('Insight');
    },
    onError: (error) => {
      toast.apiError('save insight', error.message);
    },
  });
}

/**
 * Bulk operations on insights
 */
export function useBulkUpdateInsights() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: {
      action: string;
      insightIds: string[];
    }): Promise<BulkInsightsResponse> => {
      const response = await apiClient.post('/api/insights/bulk', data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to perform bulk operation');
      }
      return response.data as BulkInsightsResponse;
    },
    onSuccess: (data, variables) => {
      // Invalidate insights lists to refetch with updated data
      queryClient.invalidateQueries({ queryKey: insightKeys.lists() });
      
      // Invalidate dashboard to reflect bulk changes
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts for bulk status changes
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Show success toast
      if (variables.action === 'generate') {
        toast.generated("post", data?.postsGenerated || variables.insightIds.length);
      } else {
        toast.success(`Bulk ${variables.action} completed`, {
          description: `Successfully ${variables.action}ed ${variables.insightIds.length} insight${variables.insightIds.length === 1 ? '' : 's'}`
        });
      }
    },
    onError: (error, variables) => {
      toast.apiError(`bulk ${variables.action} insights`, error.message);
    },
  });
}

/**
 * Generate insights from transcript
 */
export function useGenerateInsights() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (transcriptId: string): Promise<GenerateInsightsResponse> => {
      const response = await apiClient.post(`/api/transcripts/${transcriptId}/insights`, {});
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate insights');
      }
      return response.data as GenerateInsightsResponse;
    },
    onSuccess: (data) => {
      // Invalidate insights lists to show new insights
      queryClient.invalidateQueries({ queryKey: insightKeys.lists() });
      
      // Invalidate dashboard to reflect new insights
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts as new insights likely need review
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Show success toast
      const count = data?.insightIds?.length || data?.count || 1;
      toast.generated('insight', count);
    },
    onError: (error) => {
      toast.apiError('generate insights', error.message);
    },
  });
}