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

// Query keys
export const transcriptKeys = {
  all: ['transcripts'] as const,
  lists: () => [...transcriptKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...transcriptKeys.lists(), { filters }] as const,
  details: () => [...transcriptKeys.all, 'detail'] as const,
  detail: (id: string) => [...transcriptKeys.details(), id] as const,
};

/**
 * Fetch all transcripts with metadata
 */
export function useTranscripts() {
  return useQuery({
    queryKey: transcriptKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponseWithMetadata<TranscriptView>>('/api/transcripts');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transcripts');
      }
      
      // Convert date strings to Date objects in the data array
      const rawData = (response.data || []) as any[];
      const transcripts = Array.isArray(rawData) ? rawData.map((transcript: any) => ({
        ...transcript,
        createdAt: new Date(transcript.createdAt),
        updatedAt: new Date(transcript.updatedAt),
      })) : [];
      
      // Return both data and metadata
      return {
        data: transcripts,
        meta: (response as any).meta
      };
    },
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
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