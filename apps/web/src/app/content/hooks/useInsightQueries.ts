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
  limit?: number;
  offset?: number;
  enabled: boolean;  // Required - must explicitly specify if query should run
  useServerFiltering?: boolean;  // Whether to use server-side filtering
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
 * Fetch insights with filters - supports both client and server-side filtering
 */
export function useInsights(filters: InsightFilters) {
  const { useServerFiltering = false, ...filterParams } = filters;
  
  return useQuery({
    queryKey: insightKeys.list(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      if (useServerFiltering) {
        // Server-side filtering: send all filter params with proper mapping
        Object.entries(filterParams).forEach(([key, value]) => {
          if (key !== 'enabled' && value !== undefined && value !== null && value !== '') {
            // Map client parameter names to API DTO names
            if (key === 'minScore') {
              searchParams.append('minTotalScore', String(value));
            } else if (key === 'maxScore') {
              searchParams.append('maxTotalScore', String(value));
            } else {
              searchParams.append(key, String(value));
            }
          }
        });
      } else {
        // Client-side filtering: only send pagination params
        if (filterParams.limit) searchParams.append('limit', String(filterParams.limit));
        if (filterParams.offset) searchParams.append('offset', String(filterParams.offset));
        // Always send sort params for consistent ordering
        if (filterParams.sortBy) searchParams.append('sortBy', filterParams.sortBy);
        if (filterParams.sortOrder) searchParams.append('sortOrder', filterParams.sortOrder);
      }
      
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
      
      // Apply client-side filtering if not using server filtering
      let filteredInsights = insights;
      if (!useServerFiltering) {
        filteredInsights = applyClientFilters(insights, filterParams);
      }
      
      // Return both data and metadata
      return {
        data: filteredInsights,
        meta: response.meta,
        totalBeforeFiltering: insights.length,
        filteredCount: filteredInsights.length,
      };
    },
    staleTime: useServerFiltering ? 2 * 60 * 1000 : 5 * 60 * 1000, // Shorter cache for server-side
    gcTime: useServerFiltering ? 5 * 60 * 1000 : 10 * 60 * 1000,
    enabled: filters.enabled,
    placeholderData: (previousData) => previousData, // Smooth transitions between pages
  });
}

/**
 * Apply client-side filters to insights array
 */
function applyClientFilters(insights: InsightView[], filters: Partial<InsightFilters>): InsightView[] {
  let filtered = [...insights];
  
  // Status filter
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(insight => insight.status === filters.status);
  }
  
  // Category filter
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(insight => insight.category === filters.category);
  }
  
  // Post type filter
  if (filters.postType && filters.postType !== 'all') {
    filtered = filtered.filter(insight => insight.postType === filters.postType);
  }
  
  // Score range filter - totalScore not in current schema
  // if (filters.minScore !== undefined) {
  //   filtered = filtered.filter(insight => (insight.totalScore || 0) >= filters.minScore!);
  // }
  // if (filters.maxScore !== undefined) {
  //   filtered = filtered.filter(insight => (insight.totalScore || 0) <= filters.maxScore!);
  // }
  
  // Search filter
  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(insight => {
      const searchableText = [
        insight.title,
        insight.summary || '',
        insight.category || '',
        insight.postType || '',
        insight.transcriptTitle || '',
      ].join(' ').toLowerCase();
      return searchableText.includes(query);
    });
  }
  
  return filtered;
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