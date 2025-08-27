/**
 * TanStack Query hooks for post operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/lib/toast';
import type { PostView, ApiResponseWithMetadata } from '@/types';
import { dashboardKeys } from '@/app/hooks/useDashboardQueries';
import { sidebarKeys } from '@/app/hooks/useSidebarQueries';

export interface PostFilters {
  status?: string;
  platform?: string;
  insightId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Query keys
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: PostFilters) => [...postKeys.lists(), { filters }] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
};

/**
 * Fetch posts with filters
 */
export function usePosts(filters: PostFilters = {}) {
  return useQuery({
    queryKey: postKeys.list(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      // Add filters to search params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      
      const queryString = searchParams.toString();
      const endpoint = `/api/posts${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<ApiResponseWithMetadata<PostView>>(endpoint);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch posts');
      }
      
      // Convert date strings to Date objects in the data array
      const posts = (response.data || []).map((post: any) => ({
        ...post,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt),
      }));
      
      // Return both data and metadata
      return {
        data: posts,
        meta: response.meta
      };
    },
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

/**
 * Fetch single post by ID
 */
export function usePost(id: string) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<PostView>(`/api/posts/${id}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch post');
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
 * Update existing post
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      content?: string;
      hook?: string;
      body?: string;
      softCta?: string;
      status?: string;
    }) => {
      const { id, ...updateData } = data;
      const response = await apiClient.patch<PostView>(`/api/posts/${id}`, updateData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update post');
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
      
      // Update the specific post in cache
      queryClient.setQueryData(postKeys.detail(data.id), updatedData);
      
      // Update all posts lists that might contain this post
      queryClient.setQueriesData<PostView[]>(
        { queryKey: postKeys.lists() },
        (old) => old?.map(post => post.id === data.id ? updatedData : post)
      );
      
      // Invalidate dashboard to reflect changes
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts as post status might have changed
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Show success toast
      toast.saved('Post');
    },
    onError: (error) => {
      toast.apiError('save post', error.message);
    },
  });
}

/**
 * Delete post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/api/posts/${id}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete post');
      }
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: postKeys.detail(deletedId) });
      
      // Update list cache
      queryClient.setQueriesData<PostView[]>(
        { queryKey: postKeys.lists() },
        (old) => old?.filter(post => post.id !== deletedId)
      );
      
      // Invalidate dashboard to reflect deletion
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Show success toast
      toast.deleted('post');
    },
    onError: (error) => {
      toast.apiError('delete post', error.message);
    },
  });
}

/**
 * Schedule post
 */
export function useSchedulePost() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      scheduledFor: string;
      platform?: string;
    }) => {
      const response = await apiClient.post(`/api/posts/${data.id}/schedule`, {
        scheduledFor: data.scheduledFor,
        platform: data.platform,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to schedule post');
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate posts lists to refetch with updated data
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      
      // Invalidate dashboard to reflect scheduled post
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts as post status changed from needs_review
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Show success toast
      const dateTime = new Date(variables.scheduledFor).toLocaleString();
      toast.scheduled(dateTime, variables.platform);
    },
    onError: (error) => {
      toast.apiError('schedule post', error.message);
    },
  });
}

/**
 * Bulk operations on posts
 */
export function useBulkUpdatePosts() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: {
      action: string;
      postIds: string[];
    }) => {
      const response = await apiClient.post('/api/posts/bulk', data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to perform bulk operation');
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate posts lists to refetch with updated data
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      
      // Invalidate dashboard to reflect bulk changes
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
      
      // Invalidate sidebar counts for bulk status changes
      queryClient.invalidateQueries({ queryKey: sidebarKeys.counts() });
      
      // Show success toast
      if (variables.action === 'schedule') {
        toast.success('Bulk schedule completed', {
          description: `Successfully scheduled ${variables.postIds.length} post${variables.postIds.length === 1 ? '' : 's'}`
        });
      } else {
        toast.success(`Bulk ${variables.action} completed`, {
          description: `Successfully ${variables.action}ed ${variables.postIds.length} post${variables.postIds.length === 1 ? '' : 's'}`
        });
      }
    },
    onError: (error, variables) => {
      toast.apiError(`bulk ${variables.action} posts`, error.message);
    },
  });
}