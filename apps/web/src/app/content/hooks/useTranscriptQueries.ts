/**
 * TanStack Query hooks for transcript operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/lib/toast';
import type { TranscriptView } from '@/types/database';
import type { ApiResponseWithMetadata } from '@/types';
import { dashboardKeys } from '@/app/hooks/useDashboardQueries';
import { sidebarKeys } from '@/app/hooks/useSidebarQueries';

export interface TranscriptFilters {
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  enabled: boolean;  // Required - must explicitly specify if query should run
  useServerFiltering?: boolean;  // Whether to use server-side filtering
}

// Query keys
export const transcriptKeys = {
  all: ['transcripts'] as const,
  lists: () => [...transcriptKeys.all, 'list'] as const,
  list: (filters: TranscriptFilters) => [...transcriptKeys.lists(), { filters }] as const,
  details: () => [...transcriptKeys.all, 'detail'] as const,
  detail: (id: string) => [...transcriptKeys.details(), id] as const,
};

/**
 * Fetch transcripts with filters - supports both client and server-side filtering
 */
export function useTranscripts(filters: TranscriptFilters) {
  const { useServerFiltering = false, ...filterParams } = filters;
  
  return useQuery({
    queryKey: transcriptKeys.list(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      // Helper function to process sort parameters
      const processSortParams = (sortBy?: string, sortOrder?: string) => {
        let finalSortBy = sortBy;
        let finalSortOrder = sortOrder;
        
        // Handle combined format (e.g., "createdAt-desc")
        if (sortBy && sortBy.includes('-')) {
          const [field, order] = sortBy.split('-');
          finalSortBy = field;
          finalSortOrder = order as 'asc' | 'desc';
        }
        
        // Add to search params if valid
        if (finalSortBy) {
          searchParams.append('sortBy', finalSortBy);
        }
        if (finalSortOrder) {
          searchParams.append('sortOrder', finalSortOrder);
        }
      };
      
      if (useServerFiltering) {
        // Server-side filtering: send all filter params with proper processing
        Object.entries(filterParams).forEach(([key, value]) => {
          if (key !== 'enabled' && key !== 'sortBy' && key !== 'sortOrder' && value !== undefined && value !== null && value !== '') {
            searchParams.append(key, String(value));
          }
        });
        // Handle sort parameters separately
        processSortParams(filterParams.sortBy, filterParams.sortOrder);
      } else {
        // Client-side filtering: only send pagination params
        if (filterParams.limit) searchParams.append('limit', String(filterParams.limit));
        if (filterParams.offset) searchParams.append('offset', String(filterParams.offset));
        // Always send sort params for consistent ordering
        processSortParams(filterParams.sortBy, filterParams.sortOrder);
      }
      
      const queryString = searchParams.toString();
      const endpoint = `/api/transcripts${queryString ? `?${queryString}` : ''}`;
      
      // Backend directly returns: { success: true, data: TranscriptView[], meta: {...} }
      // apiClient just passes through the JSON response
      type TranscriptsApiResponse = ApiResponseWithMetadata<TranscriptView> & {
        error?: string;
      };
      
      const response = await apiClient.get<TranscriptView[]>(endpoint) as TranscriptsApiResponse;
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transcripts');
      }
      
      // Convert date strings to Date objects in the data array
      const transcripts = response.data.map((transcript) => ({
        ...transcript,
        createdAt: new Date(transcript.createdAt),
        updatedAt: new Date(transcript.updatedAt),
      }));
      
      // Apply client-side filtering if not using server filtering
      let filteredTranscripts = transcripts;
      if (!useServerFiltering) {
        filteredTranscripts = applyClientFilters(transcripts, filterParams);
      }
      
      // Return both data and metadata
      return {
        data: filteredTranscripts,
        meta: response.meta,
        totalBeforeFiltering: transcripts.length,
        filteredCount: filteredTranscripts.length,
      };
    },
    staleTime: useServerFiltering ? 2 * 60 * 1000 : 5 * 60 * 1000, // Shorter cache for server-side
    gcTime: useServerFiltering ? 5 * 60 * 1000 : 10 * 60 * 1000,
    enabled: filters.enabled,
    placeholderData: (previousData) => previousData, // Smooth transitions between pages
  });
}

/**
 * Apply client-side filters to transcripts array
 */
function applyClientFilters(transcripts: TranscriptView[], filters: Partial<TranscriptFilters>): TranscriptView[] {
  let filtered = [...transcripts];
  
  // Status filter
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(transcript => transcript.status === filters.status);
  }
  
  // Search filter
  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(transcript => {
      const searchableText = [
        transcript.title,
        transcript.rawContent,
        transcript.cleanedContent || '',
      ].join(' ').toLowerCase();
      return searchableText.includes(query);
    });
  }
  
  return filtered;
}

/**
 * Fetch single transcript by ID
 */
export function useTranscript(id: string) {
  return useQuery({
    queryKey: transcriptKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<TranscriptView>(`/api/transcripts/${id}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transcript');
      }
      
      // Convert date strings to Date objects
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
 * Create new transcript
 */
export function useCreateTranscript() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      rawContent: string;
      sourceType?: string;
      fileName?: string;
      metadata?: any;
    }) => {
      const response = await apiClient.post<TranscriptView>('/api/transcripts', data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create transcript');
      }
      
      // Convert date strings to Date objects
      return response.data ? {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      } : null;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch transcripts list
      queryClient.invalidateQueries({ queryKey: transcriptKeys.lists() });
      
      // Invalidate dashboard to reflect new transcript
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts as new transcripts are likely raw
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Add the new transcript to cache
      if (data) {
        queryClient.setQueryData(transcriptKeys.detail(data.id), data);
      }
      
      // Show success toast
      toast.success('Transcript created successfully', {
        description: `"${variables.title}" has been added to your library`
      });
    },
    onError: (error) => {
      toast.apiError('create transcript', error.message);
    },
  });
}

/**
 * Update existing transcript
 */
export function useUpdateTranscript() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      rawContent?: string;
      cleanedContent?: string;
      status?: string;
    }) => {
      const { id, ...updateData } = data;
      const response = await apiClient.patch<TranscriptView>(`/api/transcripts/${id}`, updateData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update transcript');
      }
      
      // Convert date strings to Date objects
      return response.data ? {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      } : null;
    },
    onSuccess: (data) => {
      if (!data) return;
      
      // Update the specific transcript in cache
      queryClient.setQueryData(transcriptKeys.detail(data.id), data);
      
      // Update the transcript in the list cache
      queryClient.setQueryData<TranscriptView[]>(
        transcriptKeys.lists(),
        (old) => old?.map(t => t.id === data.id ? data : t)
      );
      
      // Invalidate dashboard to reflect changes
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts as transcript status might have changed
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Show success toast
      toast.saved('Transcript');
    },
    onError: (error) => {
      toast.apiError('save transcript', error.message);
    },
  });
}

/**
 * Delete transcript
 */
export function useDeleteTranscript() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/api/transcripts/${id}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete transcript');
      }
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: transcriptKeys.detail(deletedId) });
      
      // Update list cache
      queryClient.setQueryData<TranscriptView[]>(
        transcriptKeys.lists(),
        (old) => old?.filter(t => t.id !== deletedId)
      );
      
      // Invalidate dashboard to reflect deletion
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Show success toast
      toast.deleted('transcript');
    },
    onError: (error) => {
      toast.apiError('delete transcript', error.message);
    },
  });
}

/**
 * Bulk operations on transcripts
 */
export function useBulkUpdateTranscripts() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: {
      action: string;
      transcriptIds: string[];
    }) => {
      const response = await apiClient.post('/api/transcripts/bulk', data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to perform bulk operation');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate transcripts list to refetch with updated data
      queryClient.invalidateQueries({ queryKey: transcriptKeys.lists() });
      
      // Invalidate dashboard to reflect bulk changes
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts for bulk status changes
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Show success toast
      toast.success(`Bulk ${variables.action} completed`, {
        description: `Successfully ${variables.action}ed ${variables.transcriptIds.length} transcript${variables.transcriptIds.length === 1 ? '' : 's'}`
      });
    },
    onError: (error, variables) => {
      toast.apiError(`bulk ${variables.action} transcripts`, error.message);
    },
  });
}