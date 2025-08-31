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

// Mutation functions
const deleteTranscript = async (transcriptId: string) => {
  const result = await api.transcripts.deleteTranscript(transcriptId);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to delete transcript');
  }
  return result;
};

const cleanTranscript = async (transcriptId: string) => {
  const result = await api.transcripts.cleanTranscript(transcriptId);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to clean transcript');
  }
  return result;
};

const generateInsightsFromTranscript = async (transcriptId: string) => {
  const result = await api.insights.generateInsightsFromTranscript(transcriptId);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to generate insights');
  }
  return result;
};

const approveInsight = async (insightId: string) => {
  const result = await api.insights.approveInsight(insightId);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to approve insight');
  }
  return result;
};

const rejectInsight = async (insightId: string) => {
  const result = await api.insights.rejectInsight(insightId);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to reject insight');
  }
  return result;
};

const deleteInsight = async (insightId: string) => {
  const result = await api.insights.deleteInsight(insightId);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to delete insight');
  }
  return result;
};

const generatePostsFromInsight = async (insightId: string) => {
  const result = await api.posts.generatePostsFromInsight(insightId);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to generate posts');
  }
  return result;
};

const approvePost = async (postId: string) => {
  const result = await api.posts.approvePost(postId);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to approve post');
  }
  return result;
};

const rejectPost = async (postId: string) => {
  const result = await api.posts.rejectPost(postId);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to reject post');
  }
  return result;
};

const deletePost = async (postId: string) => {
  const result = await api.posts.deletePost(postId);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to delete post');
  }
  return result;
};

// Query key factory for type-safe query keys
export const contentQueryKeys = {
  all: ['content'] as const,
  transcripts: () => ['content', 'transcripts'] as const,
  insights: () => ['content', 'insights'] as const,
  posts: () => ['content', 'posts'] as const,
  dashboardCounts: () => ['content', 'dashboard-counts'] as const,
};

interface ContentQueryResult<T> {
  items: T[];
}

// Hook to fetch transcripts
interface UseTranscriptsQueryOptions {
  enabled?: boolean;
  initialData?: { items: TranscriptView[] };
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean | 'always';
}

export function useTranscriptsQuery(options: UseTranscriptsQueryOptions = {}) {
  const {
    enabled = true,
    initialData,
    staleTime = 10 * 60 * 1000, // Default 10 min cache
    gcTime = 15 * 60 * 1000,
    refetchOnWindowFocus = false,
    refetchOnMount = false,
  } = options;

  return useQuery({
    queryKey: contentQueryKeys.transcripts(),
    queryFn: async () => {
      // Simple API call with no parameters
      const result = await api.transcripts.getTranscripts();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch transcripts');
      }

      return {
        items: result.data || [],
      };
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
interface UseInsightsQueryOptions {
  enabled?: boolean;
  initialData?: { items: InsightView[] };
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean | 'always';
}

export function useInsightsQuery(options: UseInsightsQueryOptions = {}) {
  const {
    enabled = true,
    initialData,
    staleTime = 10 * 60 * 1000, // Default 10 min cache
    gcTime = 15 * 60 * 1000,
    refetchOnWindowFocus = false,
    refetchOnMount = false,
  } = options;

  return useQuery({
    queryKey: contentQueryKeys.insights(),
    queryFn: async () => {
      // Simple API call with no parameters
      const result = await api.insights.getInsights();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch insights');
      }

      return {
        items: result.data || [],
      };
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
interface UsePostsQueryOptions {
  enabled?: boolean;
  initialData?: { items: PostView[] };
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean | 'always';
}

export function usePostsQuery(options: UsePostsQueryOptions = {}) {
  const {
    enabled = true,
    initialData,
    staleTime = 10 * 60 * 1000, // Default 10 min cache
    gcTime = 15 * 60 * 1000,
    refetchOnWindowFocus = false,
    refetchOnMount = false,
  } = options;

  return useQuery({
    queryKey: contentQueryKeys.posts(),
    queryFn: async () => {
      // Simple API call with no parameters
      const result = await api.posts.getPosts();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch posts');
      }

      return {
        items: result.data || [],
      };
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