import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { 
  TranscriptView, 
  InsightView, 
  PostView,
  TranscriptStatus,
  InsightStatus,
  PostStatus,
  ContentView,
} from '@content-creation/types';
import { useToast } from '@/lib/toast';

// Query key factory for type-safe query keys
export const contentQueryKeys = {
  all: ['content'] as const,
  transcripts: (params?: Record<string, any>) => 
    ['content', 'transcripts', params] as const,
  insights: (params?: Record<string, any>) => 
    ['content', 'insights', params] as const,
  posts: (params?: Record<string, any>) => 
    ['content', 'posts', params] as const,
  dashboardCounts: () => 
    ['content', 'dashboard-counts'] as const,
};

interface ContentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TranscriptStatus | InsightStatus | PostStatus;
  category?: string;
  postType?: string;
  scoreMin?: number;
  scoreMax?: number;
  platform?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ContentQueryResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Hook to fetch transcripts
interface UseTranscriptsQueryOptions extends ContentQueryParams {
  enabled?: boolean;
  initialData?: ContentQueryResult<TranscriptView>;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean | 'always';
}

export function useTranscriptsQuery(options: UseTranscriptsQueryOptions = {}) {
  const { 
    enabled = true,
    initialData,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    refetchOnMount,
    ...params 
  } = options;
  
  return useQuery({
    queryKey: contentQueryKeys.transcripts(params),
    queryFn: async () => {
      const result = await api.transcripts.getTranscripts({
        page: params.page || 1,
        limit: params.limit || 20,
        search: params.search,
        status: params.status as TranscriptStatus,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch transcripts');
      }
      
      if (!result.data) {
        throw new Error('No data returned from server');
      }

      return {
        items: result.data,
        pagination: result.meta?.pagination || {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          totalPages: 1,
        },
      } as ContentQueryResult<TranscriptView>;
    },
    enabled,
    initialData,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    refetchOnMount,
    placeholderData: (previousData) => previousData,
  });
}

// Hook to fetch insights
interface UseInsightsQueryOptions extends ContentQueryParams {
  enabled?: boolean;
  initialData?: ContentQueryResult<InsightView>;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean | 'always';
}

export function useInsightsQuery(options: UseInsightsQueryOptions = {}) {
  const { 
    enabled = true,
    initialData,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    refetchOnMount,
    ...params 
  } = options;
  
  return useQuery({
    queryKey: contentQueryKeys.insights(params),
    queryFn: async () => {
      const result = await api.insights.getInsights({
        page: params.page || 1,
        limit: params.limit || 20,
        search: params.search,
        status: params.status as InsightStatus,
        category: params.category,
        scoreMin: params.scoreMin,
        scoreMax: params.scoreMax,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch insights');
      }
      
      if (!result.data) {
        throw new Error('No data returned from server');
      }

      return {
        items: result.data,
        pagination: result.meta?.pagination || {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          totalPages: 1,
        },
      } as ContentQueryResult<InsightView>;
    },
    enabled,
    initialData,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    refetchOnMount,
    placeholderData: (previousData) => previousData,
  });
}

// Hook to fetch posts
interface UsePostsQueryOptions extends ContentQueryParams {
  enabled?: boolean;
  initialData?: ContentQueryResult<PostView>;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean | 'always';
}

export function usePostsQuery(options: UsePostsQueryOptions = {}) {
  const { 
    enabled = true,
    initialData,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    refetchOnMount,
    ...params 
  } = options;
  
  return useQuery({
    queryKey: contentQueryKeys.posts(params),
    queryFn: async () => {
      const result = await api.posts.getPosts({
        page: params.page || 1,
        limit: params.limit || 20,
        search: params.search,
        status: params.status as PostStatus,
        platform: params.platform,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch posts');
      }
      
      if (!result.data) {
        throw new Error('No data returned from server');
      }

      return {
        items: result.data,
        pagination: result.meta?.pagination || {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          totalPages: 1,
        },
      } as ContentQueryResult<PostView>;
    },
    enabled,
    initialData,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    refetchOnMount,
    placeholderData: (previousData) => previousData,
  });
}

// Mutation hooks for transcript actions
export function useDeleteTranscriptMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: deleteTranscript,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.transcripts() });
      toast.success('Transcript deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete transcript: ${error.message}`);
    },
  });
}

export function useCleanTranscriptMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: cleanTranscript,
    onSuccess: (result) => {
      if (result.success && result.data?.type === 'workflow_job') {
        toast.success('Transcript cleaning started');
      } else if (result.success) {
        queryClient.invalidateQueries({ queryKey: contentQueryKeys.transcripts() });
        toast.success('Transcript cleaned successfully');
      } else if (!result.success) {
        toast.error(result.error?.message || 'Failed to clean transcript');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to clean transcript: ${error.message}`);
    },
  });
}

export function useGenerateInsightsMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: generateInsightsFromTranscript,
    onSuccess: (result) => {
      if (result.success && result.data?.type === 'workflow_job') {
        toast.success('Insight generation started');
      } else if (result.success) {
        queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
        toast.success('Insights generated successfully');
      } else if (!result.success) {
        toast.error(result.error?.message || 'Failed to generate insights');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate insights: ${error.message}`);
    },
  });
}

// Mutation hooks for insight actions
export function useApproveInsightMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: approveInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
      toast.success('Insight approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve insight: ${error.message}`);
    },
  });
}

export function useRejectInsightMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: rejectInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
      toast.success('Insight rejected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject insight: ${error.message}`);
    },
  });
}

export function useDeleteInsightMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: deleteInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
      toast.success('Insight deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete insight: ${error.message}`);
    },
  });
}

export function useGeneratePostsMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: generatePostsFromInsight,
    onSuccess: (result) => {
      if (result.success && result.data?.type === 'workflow_job') {
        toast.success('Post generation started');
      } else if (result.success) {
        queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
        toast.success('Posts generated successfully');
      } else if (!result.success) {
        toast.error(result.error?.message || 'Failed to generate posts');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate posts: ${error.message}`);
    },
  });
}

// Mutation hooks for post actions
export function useApprovePostMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: approvePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
      toast.success('Post approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve post: ${error.message}`);
    },
  });
}

export function useRejectPostMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: rejectPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
      toast.success('Post rejected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject post: ${error.message}`);
    },
  });
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
      toast.success('Post deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });
}

export function useSchedulePostMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ postId, scheduledFor }: { postId: string; scheduledFor: string }) =>
      api.posts.schedulePost(postId, scheduledFor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
      toast.success('Post scheduled successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to schedule post: ${error.message}`);
    },
  });
}

// Hook to invalidate queries based on SSE events
export function useContentQueryInvalidation() {
  const queryClient = useQueryClient();

  const invalidateTranscripts = () => {
    queryClient.invalidateQueries({ queryKey: contentQueryKeys.transcripts() });
  };

  const invalidateInsights = () => {
    queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
  };

  const invalidatePosts = () => {
    queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: contentQueryKeys.all });
  };

  return {
    invalidateTranscripts,
    invalidateInsights,
    invalidatePosts,
    invalidateAll,
  };
}

// Hook to fetch dashboard counts for accurate totals
export function useDashboardCountsQuery() {
  return useQuery({
    queryKey: contentQueryKeys.dashboardCounts(),
    queryFn: async () => {
      const result = await api.dashboard.getDashboardCounts();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch dashboard counts');
      }
      
      if (!result.data) {
        throw new Error('No data returned from server');
      }
      
      return result.data as {
        transcripts: { total: number; byStatus: Record<string, number> };
        insights: { total: number; byStatus: Record<string, number> };
        posts: { total: number; byStatus: Record<string, number> };
      };
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute to keep counts updated
  });
}