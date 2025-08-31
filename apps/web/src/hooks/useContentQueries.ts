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

// Mutation functions - return Results without throwing
const deleteTranscript = async (transcriptId: string) => {
  return await api.transcripts.deleteTranscript(transcriptId);
};

const cleanTranscript = async (transcriptId: string) => {
  return await api.transcripts.cleanTranscript(transcriptId);
};

const generateInsightsFromTranscript = async (transcriptId: string) => {
  return await api.transcripts.generateInsightsFromTranscript(transcriptId);
};

const approveInsight = async (insightId: string) => {
  return await api.insights.approveInsight(insightId);
};

const rejectInsight = async (insightId: string) => {
  return await api.insights.rejectInsight(insightId);
};

const deleteInsight = async (insightId: string) => {
  return await api.insights.deleteInsight(insightId);
};

const generatePostsFromInsight = async (insightId: string) => {
  return await api.insights.generatePostsFromInsight(insightId);
};

const approvePost = async (postId: string) => {
  return await api.posts.approvePost(postId);
};

const rejectPost = async (postId: string) => {
  return await api.posts.rejectPost(postId);
};

const deletePost = async (postId: string) => {
  return await api.posts.deletePost(postId);
};

// Query key factory for type-safe query keys
export const contentQueryKeys = {
  all: ['content'] as const,
  transcripts: () => ['content', 'transcripts'] as const,
  insights: () => ['content', 'insights'] as const,
  posts: () => ['content', 'posts'] as const,
  dashboardCounts: () => ['content', 'dashboard-counts'] as const,
};


// Hook to fetch transcripts with smart caching
interface UseTranscriptsQueryOptions {
  enabled?: boolean;
}

export function useTranscriptsQuery(options: UseTranscriptsQueryOptions = {}) {
  const {
    enabled = true,
  } = options;

  return useQuery({
    queryKey: contentQueryKeys.transcripts(),
    queryFn: async () => {
      const result = await api.transcripts.getTranscripts();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transcripts');
      }

      return Array.isArray(result.data) ? result.data : [];
    },
    enabled,
    // Smart caching configuration for content creation sessions
    staleTime: 30 * 60 * 1000, // 30 minutes - data stays fresh for content creation sessions
    gcTime: 60 * 60 * 1000, // 1 hour - keep in memory longer
    refetchOnWindowFocus: false, // Don't refetch on every focus
    refetchInterval: 5 * 60 * 1000, // Background refresh every 5 minutes
    refetchOnMount: false, // Use cache if available
    placeholderData: (previousData) => previousData,
  });
}

// Hook to fetch insights with smart caching
interface UseInsightsQueryOptions {
  enabled?: boolean;
}

export function useInsightsQuery(options: UseInsightsQueryOptions = {}) {
  const {
    enabled = true,
  } = options;

  return useQuery({
    queryKey: contentQueryKeys.insights(),
    queryFn: async () => {
      const result = await api.insights.getInsights();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch insights');
      }

      return Array.isArray(result.data) ? result.data : [];
    },
    enabled,
    // Smart caching configuration for content creation sessions
    staleTime: 30 * 60 * 1000, // 30 minutes - data stays fresh for content creation sessions
    gcTime: 60 * 60 * 1000, // 1 hour - keep in memory longer
    refetchOnWindowFocus: false, // Don't refetch on every focus
    refetchInterval: 5 * 60 * 1000, // Background refresh every 5 minutes
    refetchOnMount: false, // Use cache if available
    placeholderData: (previousData) => previousData,
  });
}

// Hook to fetch posts with smart caching
interface UsePostsQueryOptions {
  enabled?: boolean;
}

export function usePostsQuery(options: UsePostsQueryOptions = {}) {
  const {
    enabled = true,
  } = options;

  return useQuery({
    queryKey: contentQueryKeys.posts(),
    queryFn: async () => {
      const result = await api.posts.getPosts();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch posts');
      }

      return Array.isArray(result.data) ? result.data : [];
    },
    enabled,
    // Smart caching configuration for content creation sessions
    staleTime: 30 * 60 * 1000, // 30 minutes - data stays fresh for content creation sessions
    gcTime: 60 * 60 * 1000, // 1 hour - keep in memory longer
    refetchOnWindowFocus: false, // Don't refetch on every focus
    refetchInterval: 5 * 60 * 1000, // Background refresh every 5 minutes
    refetchOnMount: false, // Use cache if available
    placeholderData: (previousData) => previousData,
  });
}

// Mutation hooks for transcript actions
export function useDeleteTranscriptMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (transcriptId: string) => {
      const result = await deleteTranscript(transcriptId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete transcript');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.transcripts() });
      toast.success('Transcript deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCleanTranscriptMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (transcriptId: string) => {
      const result = await cleanTranscript(transcriptId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to clean transcript');
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.data?.type === 'workflow_job') {
        toast.success('Transcript cleaning started');
      } else {
        queryClient.invalidateQueries({ queryKey: contentQueryKeys.transcripts() });
        toast.success('Transcript cleaned successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useGenerateInsightsMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (transcriptId: string) => {
      const result = await generateInsightsFromTranscript(transcriptId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate insights');
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.data?.type === 'workflow_job') {
        toast.success('Insight generation started');
      } else {
        queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
        toast.success('Insights generated successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Mutation hooks for insight actions
export function useApproveInsightMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const result = await approveInsight(insightId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve insight');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
      toast.success('Insight approved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRejectInsightMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const result = await rejectInsight(insightId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject insight');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
      toast.success('Insight rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteInsightMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const result = await deleteInsight(insightId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete insight');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
      toast.success('Insight deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useGeneratePostsMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const result = await generatePostsFromInsight(insightId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate posts');
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.data?.type === 'workflow_job') {
        toast.success('Post generation started');
      } else {
        queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
        toast.success('Posts generated successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Mutation hooks for post actions
export function useApprovePostMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      const result = await approvePost(postId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve post');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
      toast.success('Post approved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRejectPostMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      const result = await rejectPost(postId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject post');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
      toast.success('Post rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      const result = await deletePost(postId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete post');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
      toast.success('Post deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSchedulePostMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ postId, scheduledFor }: { postId: string; scheduledFor: string }) => {
      const result = await api.posts.schedulePost(postId, scheduledFor);
      if (!result.success) {
        throw new Error(result.error || 'Failed to schedule post');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
      toast.success('Post scheduled successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
        throw new Error(result.error || 'Failed to fetch dashboard counts');
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