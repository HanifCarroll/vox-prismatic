import { useCallback, useOptimistic, useTransition, useState } from 'react';
import { useActionState } from 'react';
import { useToast } from '@/lib/toast';
import { useContentStore } from '../store/content-store';
import {
  getTranscripts,
  getTranscript,
  createTranscript,
  updateTranscript,
  deleteTranscript,
  bulkUpdateTranscripts,
  cleanTranscript,
  generateInsightsFromTranscript
} from '@/app/actions/transcripts';
import {
  getInsights,
  getInsight,
  updateInsight,
  deleteInsight,
  bulkUpdateInsights,
  approveInsight,
  rejectInsight,
  generatePostsFromInsight
} from '@/app/actions/insights';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  bulkUpdatePosts,
  schedulePost,
  unschedulePost,
  approvePost,
  rejectPost
} from '@/app/actions/posts';
import {
  getDashboard,
  getDashboardCounts
} from '@/app/actions/dashboard.actions';
import type { TranscriptView, InsightView, PostView, DashboardData } from '@/types';

/**
 * Custom hooks for server actions
 * These hooks bridge server actions with Zustand store and provide UI state management
 */

// =====================================================================
// TRANSCRIPT HOOKS
// =====================================================================

/**
 * Hook for fetching transcripts with filters
 */
export function useTranscriptsData() {
  const {
    transcriptsData,
    transcriptsLoading,
    transcriptsError,
    transcriptsPagination,
    setTranscriptsData,
    setTranscriptsLoading,
    setTranscriptsError,
    setTranscriptsPagination
  } = useContentStore();
  
  const [isPending, startTransition] = useTransition();
  
  const fetchTranscripts = useCallback(async (params?: {
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) => {
    setTranscriptsLoading(true);
    setTranscriptsError(null);
    
    startTransition(async () => {
      try {
        const result = await getTranscripts(params);
        
        if (result.success) {
          setTranscriptsData(result.data);
          if (result.meta?.pagination) {
            setTranscriptsPagination(result.meta.pagination);
          }
        } else {
          setTranscriptsError(result.error || 'Unknown error');
        }
      } catch (error) {
        setTranscriptsError(error instanceof Error ? error.message : 'Failed to fetch transcripts');
      } finally {
        setTranscriptsLoading(false);
      }
    });
  }, [setTranscriptsData, setTranscriptsLoading, setTranscriptsError, setTranscriptsPagination]);
  
  return {
    data: transcriptsData,
    loading: transcriptsLoading || isPending,
    error: transcriptsError,
    pagination: transcriptsPagination,
    fetchTranscripts,
    refetch: fetchTranscripts
  };
}

/**
 * Hook for fetching single transcript
 */
export function useTranscriptData(id?: string) {
  const [transcript, setTranscript] = useState<TranscriptView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const fetchTranscript = useCallback(async (transcriptId: string) => {
    setLoading(true);
    setError(null);
    
    startTransition(async () => {
      try {
        const result = await getTranscript(transcriptId);
        
        if (result.success) {
          setTranscript(result.data);
        } else {
          setError(result.error || 'Unknown error');
          setTranscript(null);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch transcript');
        setTranscript(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);
  
  // Auto-fetch if id is provided
  useState(() => {
    if (id) {
      fetchTranscript(id);
    }
  });
  
  return {
    transcript,
    loading: loading || isPending,
    error,
    fetchTranscript,
    refetch: id ? () => fetchTranscript(id) : undefined
  };
}

/**
 * Hook for creating transcripts with optimistic UI
 */
export function useCreateTranscript() {
  const toast = useToast();
  const { addTranscript } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  // Optimistic state for immediate UI feedback
  const [optimisticTranscripts, addOptimisticTranscript] = useOptimistic(
    [] as TranscriptView[],
    (state, newTranscript: TranscriptView) => [newTranscript, ...state]
  );
  
  const createTranscriptAction = useCallback(async (formData: FormData) => {
    const title = formData.get('title') as string;
    
    // Create optimistic transcript for immediate UI feedback
    const optimisticTranscript: TranscriptView = {
      id: `temp-${Date.now()}`,
      title: title || 'New Transcript',
      rawContent: formData.get('rawContent') as string || '',
      status: 'processing' as any,
      wordCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as TranscriptView;
    
    addOptimisticTranscript(optimisticTranscript);
    
    startTransition(async () => {
      try {
        const result = await createTranscript(formData);
        
        if (result.success) {
          // Add real transcript to store
          addTranscript(result.data);
          toast.success('Transcript created successfully', {
            description: `"${title}" has been added to your library`
          });
        } else {
          toast.error('Failed to create transcript', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to create transcript', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [addTranscript, toast, addOptimisticTranscript]);
  
  return {
    createTranscript: createTranscriptAction,
    isPending,
    optimisticTranscripts
  };
}

/**
 * Hook for updating transcripts with optimistic UI
 */
export function useUpdateTranscript() {
  const toast = useToast();
  const { updateTranscript: updateTranscriptInStore } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const updateTranscriptAction = useCallback(async (
    id: string,
    formData: FormData
  ) => {
    const updates = Object.fromEntries(formData.entries());
    
    // Optimistic update
    updateTranscriptInStore(id, updates as any);
    
    startTransition(async () => {
      try {
        const result = await updateTranscript(id, formData);
        
        if (result.success) {
          // Update with server response (overwrites optimistic update)
          updateTranscriptInStore(id, result.data);
          toast.success('Transcript updated successfully');
        } else {
          toast.error('Failed to update transcript', {
            description: result.error || 'Unknown error'
          });
          // TODO: Revert optimistic update
        }
      } catch (error) {
        toast.error('Failed to update transcript', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
        // TODO: Revert optimistic update
      }
    });
  }, [updateTranscriptInStore, toast]);
  
  return {
    updateTranscript: updateTranscriptAction,
    isPending
  };
}

/**
 * Hook for deleting transcripts with optimistic UI
 */
export function useDeleteTranscript() {
  const toast = useToast();
  const { removeTranscript } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const deleteTranscriptAction = useCallback(async (id: string) => {
    // Optimistic delete
    removeTranscript(id);
    
    startTransition(async () => {
      try {
        const result = await deleteTranscript(id);
        
        if (result.success) {
          toast.success('Transcript deleted successfully');
        } else {
          toast.error('Failed to delete transcript', {
            description: result.error || 'Unknown error'
          });
          // TODO: Restore transcript in store
        }
      } catch (error) {
        toast.error('Failed to delete transcript', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
        // TODO: Restore transcript in store
      }
    });
  }, [removeTranscript, toast]);
  
  return {
    deleteTranscript: deleteTranscriptAction,
    isPending
  };
}

/**
 * Hook for bulk operations on transcripts
 */
export function useBulkTranscriptActions() {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  
  const bulkAction = useCallback(async (
    action: string,
    transcriptIds: string[]
  ) => {
    startTransition(async () => {
      try {
        const result = await bulkUpdateTranscripts(action, transcriptIds);
        
        if (result.success) {
          toast.success(`Bulk ${action} completed`, {
            description: `Successfully processed ${transcriptIds.length} transcript${transcriptIds.length === 1 ? '' : 's'}`
          });
        } else {
          toast.error(`Failed to ${action} transcripts`, {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error(`Failed to ${action} transcripts`, {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [toast]);
  
  return {
    bulkAction,
    isPending
  };
}

/**
 * Hook for processing operations (clean, generate insights)
 */
export function useTranscriptProcessing() {
  const toast = useToast();
  const { updateTranscript: updateTranscriptInStore } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const cleanTranscriptAction = useCallback(async (id: string) => {
    startTransition(async () => {
      try {
        const result = await cleanTranscript(id);
        
        if (result.success) {
          // Update transcript status optimistically
          updateTranscriptInStore(id, { status: 'cleaning' as any });
          toast.success('Transcript cleaning started');
        } else {
          toast.error('Failed to start cleaning', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to start cleaning', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [toast, updateTranscriptInStore]);
  
  const generateInsightsAction = useCallback(async (id: string) => {
    startTransition(async () => {
      try {
        const result = await generateInsightsFromTranscript(id);
        
        if (result.success) {
          toast.success('Insight generation started', {
            description: result.data?.insightIds?.length 
              ? `Generating ${result.data.insightIds.length} insights`
              : 'Processing your transcript'
          });
        } else {
          toast.error('Failed to start insight generation', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to start insight generation', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [toast]);
  
  return {
    cleanTranscript: cleanTranscriptAction,
    generateInsights: generateInsightsAction,
    isPending
  };
}

// =====================================================================
// FORM ACTION HOOKS
// =====================================================================

/**
 * Hook for form submissions with validation and error handling
 */
export function useTranscriptForm(action: 'create' | 'update', initialData?: any) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        if (action === 'create') {
          const result = await createTranscript(formData);
          if (result.success) {
            return { success: true, message: 'Transcript created successfully' };
          } else {
            return { success: false, message: result.error || 'Unknown error' };
          }
        } else if (action === 'update' && initialData?.id) {
          const result = await updateTranscript(initialData.id, formData);
          if (result.success) {
            return { success: true, message: 'Transcript updated successfully' };
          } else {
            return { success: false, message: result.error || 'Unknown error' };
          }
        }
        return { success: false, message: 'Invalid action' };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        };
      }
    },
    { success: null, message: '' }
  );
  
  return {
    state,
    formAction,
    isPending
  };
}

// =====================================================================
// INSIGHT HOOKS
// =====================================================================

/**
 * Hook for fetching insights with filters
 */
export function useInsightsData() {
  const {
    insightsData,
    insightsLoading,
    insightsError,
    insightsPagination,
    setInsightsData,
    setInsightsLoading,
    setInsightsError,
    setInsightsPagination
  } = useContentStore();
  
  const [isPending, startTransition] = useTransition();
  
  const fetchInsights = useCallback(async (params?: {
    status?: string;
    category?: string;
    postType?: string;
    scoreMin?: number;
    scoreMax?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    transcriptId?: string;
    page?: number;
    limit?: number;
  }) => {
    setInsightsLoading(true);
    setInsightsError(null);
    
    startTransition(async () => {
      try {
        const result = await getInsights(params);
        
        if (result.success) {
          setInsightsData(result.data);
          if (result.meta?.pagination) {
            setInsightsPagination(result.meta.pagination);
          }
        } else {
          setInsightsError(result.error || 'Unknown error');
        }
      } catch (error) {
        setInsightsError(error instanceof Error ? error.message : 'Failed to fetch insights');
      } finally {
        setInsightsLoading(false);
      }
    });
  }, [setInsightsData, setInsightsLoading, setInsightsError, setInsightsPagination]);
  
  return {
    data: insightsData,
    loading: insightsLoading || isPending,
    error: insightsError,
    pagination: insightsPagination,
    fetchInsights,
    refetch: fetchInsights
  };
}

/**
 * Hook for updating insights with optimistic UI
 */
export function useUpdateInsight() {
  const toast = useToast();
  const { updateInsight: updateInsightInStore } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const updateInsightAction = useCallback(async (
    id: string,
    formData: FormData
  ) => {
    const updates = Object.fromEntries(formData.entries());
    
    // Optimistic update
    updateInsightInStore(id, updates as any);
    
    startTransition(async () => {
      try {
        const result = await updateInsight(id, formData);
        
        if (result.success) {
          updateInsightInStore(id, result.data);
          toast.success('Insight updated successfully');
        } else {
          toast.error('Failed to update insight', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to update insight', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [updateInsightInStore, toast]);
  
  return {
    updateInsight: updateInsightAction,
    isPending
  };
}

/**
 * Hook for deleting insights with optimistic UI
 */
export function useDeleteInsight() {
  const toast = useToast();
  const { removeInsight } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const deleteInsightAction = useCallback(async (id: string) => {
    // Optimistic delete
    removeInsight(id);
    
    startTransition(async () => {
      try {
        const result = await deleteInsight(id);
        
        if (result.success) {
          toast.success('Insight deleted successfully');
        } else {
          toast.error('Failed to delete insight', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to delete insight', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [removeInsight, toast]);
  
  return {
    deleteInsight: deleteInsightAction,
    isPending
  };
}

/**
 * Hook for insight approval/rejection
 */
export function useInsightApproval() {
  const toast = useToast();
  const { updateInsight: updateInsightInStore } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const approveInsightAction = useCallback(async (id: string) => {
    startTransition(async () => {
      try {
        const result = await approveInsight(id);
        
        if (result.success) {
          updateInsightInStore(id, result.data);
          toast.success('Insight approved successfully');
        } else {
          toast.error('Failed to approve insight', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to approve insight', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [updateInsightInStore, toast]);
  
  const rejectInsightAction = useCallback(async (id: string) => {
    startTransition(async () => {
      try {
        const result = await rejectInsight(id);
        
        if (result.success) {
          updateInsightInStore(id, result.data);
          toast.success('Insight rejected');
        } else {
          toast.error('Failed to reject insight', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to reject insight', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [updateInsightInStore, toast]);
  
  const generatePostsAction = useCallback(async (id: string) => {
    startTransition(async () => {
      try {
        const result = await generatePostsFromInsight(id);
        
        if (result.success) {
          toast.success('Post generation started', {
            description: result.data?.postIds?.length 
              ? `Generating ${result.data.postIds.length} posts`
              : 'Processing your insight'
          });
        } else {
          toast.error('Failed to start post generation', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to start post generation', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [toast]);
  
  return {
    approveInsight: approveInsightAction,
    rejectInsight: rejectInsightAction,
    generatePosts: generatePostsAction,
    isPending
  };
}

// =====================================================================
// POST HOOKS
// =====================================================================

/**
 * Hook for fetching posts with filters
 */
export function usePostsData() {
  const {
    postsData,
    postsLoading,
    postsError,
    postsPagination,
    setPostsData,
    setPostsLoading,
    setPostsError,
    setPostsPagination
  } = useContentStore();
  
  const [isPending, startTransition] = useTransition();
  
  const fetchPosts = useCallback(async (params?: {
    status?: string;
    platform?: string;
    insightId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) => {
    setPostsLoading(true);
    setPostsError(null);
    
    startTransition(async () => {
      try {
        const result = await getPosts(params);
        
        if (result.success) {
          setPostsData(result.data);
          if (result.meta?.pagination) {
            setPostsPagination(result.meta.pagination);
          }
        } else {
          setPostsError(result.error || 'Unknown error');
        }
      } catch (error) {
        setPostsError(error instanceof Error ? error.message : 'Failed to fetch posts');
      } finally {
        setPostsLoading(false);
      }
    });
  }, [setPostsData, setPostsLoading, setPostsError, setPostsPagination]);
  
  return {
    data: postsData,
    loading: postsLoading || isPending,
    error: postsError,
    pagination: postsPagination,
    fetchPosts,
    refetch: fetchPosts
  };
}

/**
 * Hook for creating posts with optimistic UI
 */
export function useCreatePost() {
  const toast = useToast();
  const { addPost } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const createPostAction = useCallback(async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await createPost(formData);
        
        if (result.success) {
          addPost(result.data);
          toast.success('Post created successfully');
        } else {
          toast.error('Failed to create post', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to create post', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [addPost, toast]);
  
  return {
    createPost: createPostAction,
    isPending
  };
}

/**
 * Hook for updating posts with optimistic UI
 */
export function useUpdatePost() {
  const toast = useToast();
  const { updatePost: updatePostInStore } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const updatePostAction = useCallback(async (
    id: string,
    formData: FormData
  ) => {
    const updates = Object.fromEntries(formData.entries());
    
    // Optimistic update
    updatePostInStore(id, updates as any);
    
    startTransition(async () => {
      try {
        const result = await updatePost(id, formData);
        
        if (result.success) {
          updatePostInStore(id, result.data);
          toast.success('Post updated successfully');
        } else {
          toast.error('Failed to update post', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to update post', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [updatePostInStore, toast]);
  
  return {
    updatePost: updatePostAction,
    isPending
  };
}

/**
 * Hook for deleting posts with optimistic UI
 */
export function useDeletePost() {
  const toast = useToast();
  const { removePost } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const deletePostAction = useCallback(async (id: string) => {
    // Optimistic delete
    removePost(id);
    
    startTransition(async () => {
      try {
        const result = await deletePost(id);
        
        if (result.success) {
          toast.success('Post deleted successfully');
        } else {
          toast.error('Failed to delete post', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to delete post', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [removePost, toast]);
  
  return {
    deletePost: deletePostAction,
    isPending
  };
}

/**
 * Hook for post scheduling operations
 */
export function usePostScheduling() {
  const toast = useToast();
  const { updatePost: updatePostInStore } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const schedulePostAction = useCallback(async (
    id: string,
    scheduledFor: string,
    platform?: string
  ) => {
    startTransition(async () => {
      try {
        const result = await schedulePost(id, scheduledFor, platform);
        
        if (result.success) {
          toast.success('Post scheduled successfully');
        } else {
          toast.error('Failed to schedule post', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to schedule post', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [toast]);
  
  const unschedulePostAction = useCallback(async (id: string) => {
    startTransition(async () => {
      try {
        const result = await unschedulePost(id);
        
        if (result.success) {
          toast.success('Post unscheduled successfully');
        } else {
          toast.error('Failed to unschedule post', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to unschedule post', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [toast]);
  
  return {
    schedulePost: schedulePostAction,
    unschedulePost: unschedulePostAction,
    isPending
  };
}

/**
 * Hook for post approval/rejection
 */
export function usePostApproval() {
  const toast = useToast();
  const { updatePost: updatePostInStore } = useContentStore();
  const [isPending, startTransition] = useTransition();
  
  const approvePostAction = useCallback(async (id: string) => {
    startTransition(async () => {
      try {
        const result = await approvePost(id);
        
        if (result.success) {
          updatePostInStore(id, result.data);
          toast.success('Post approved successfully');
        } else {
          toast.error('Failed to approve post', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to approve post', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [updatePostInStore, toast]);
  
  const rejectPostAction = useCallback(async (id: string) => {
    startTransition(async () => {
      try {
        const result = await rejectPost(id);
        
        if (result.success) {
          updatePostInStore(id, result.data);
          toast.success('Post rejected');
        } else {
          toast.error('Failed to reject post', {
            description: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        toast.error('Failed to reject post', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    });
  }, [updatePostInStore, toast]);
  
  return {
    approvePost: approvePostAction,
    rejectPost: rejectPostAction,
    isPending
  };
}

// =====================================================================
// DASHBOARD HOOKS
// =====================================================================

/**
 * Hook for fetching complete dashboard data
 */
export function useDashboardData() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    startTransition(async () => {
      try {
        const result = await getDashboard();
        
        if (result.success) {
          setDashboard(result.data);
        } else {
          setError(result.error || 'Unknown error');
          setDashboard(null);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);
  
  return {
    dashboard,
    loading: loading || isPending,
    error,
    fetchDashboard,
    refetch: fetchDashboard
  };
}

/**
 * Hook for fetching dashboard counts only
 */
export function useDashboardCountsData() {
  const [counts, setCounts] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const fetchDashboardCounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    startTransition(async () => {
      try {
        const result = await getDashboardCounts();
        
        if (result.success) {
          setCounts(result.data);
        } else {
          setError(result.error || 'Unknown error');
          setCounts(null);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch dashboard counts');
        setCounts(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);
  
  return {
    counts, // Fix: Components expect 'counts' not 'data'
    loading: loading || isPending,
    error,
    fetchDashboardCounts,
    refetch: fetchDashboardCounts,
    isLoading: loading || isPending
  };
}

// =====================================================================
// MISSING ACTION HOOKS (Components expect these exact function names)
// =====================================================================

/**
 * Hook for updating insights - matches component expectations
 */
export function useUpdateInsightAction() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const updateInsightAction = useCallback(async (id: string, data: Partial<InsightView>) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await updateInsight(id, data);
          if (result.success) {
            toast.success('Insight updated successfully');
            resolve();
          } else {
            toast.error(result.error || 'Failed to update insight');
            reject(new Error(result.error || 'Failed to update insight'));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update insight';
          toast.error(errorMessage);
          reject(error);
        }
      });
    });
  }, [toast]);

  return updateInsightAction;
}

/**
 * Hook for bulk updating insights - matches component expectations
 */
export function useBulkUpdateInsightsAction() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const bulkUpdateAction = useCallback(async (data: { action: string; insightIds: string[] }) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await bulkUpdateInsights(data.action, data.insightIds);
          if (result.success) {
            toast.success(`Successfully ${data.action}d ${data.insightIds.length} insights`);
            resolve();
          } else {
            toast.error(result.error || 'Failed to bulk update insights');
            reject(new Error(result.error || 'Failed to bulk update insights'));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to bulk update insights';
          toast.error(errorMessage);
          reject(error);
        }
      });
    });
  }, [toast]);

  return bulkUpdateAction;
}

/**
 * Hook for updating posts - matches component expectations  
 */
export function useUpdatePostAction() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const updatePostAction = useCallback(async (id: string, data: Partial<PostView>) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await updatePost(id, data);
          if (result.success) {
            toast.success('Post updated successfully');
            resolve();
          } else {
            toast.error(result.error || 'Failed to update post');
            reject(new Error(result.error || 'Failed to update post'));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update post';
          toast.error(errorMessage);
          reject(error);
        }
      });
    });
  }, [toast]);

  return updatePostAction;
}

/**
 * Hook for bulk updating posts - matches component expectations
 */
export function useBulkUpdatePostsAction() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const bulkUpdateAction = useCallback(async (data: { action: string; postIds: string[] }) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await bulkUpdatePosts(data.action, data.postIds);
          if (result.success) {
            toast.success(`Successfully ${data.action}d ${data.postIds.length} posts`);
            resolve();
          } else {
            toast.error(result.error || 'Failed to bulk update posts');
            reject(new Error(result.error || 'Failed to bulk update posts'));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to bulk update posts';
          toast.error(errorMessage);
          reject(error);
        }
      });
    });
  }, [toast]);

  return bulkUpdateAction;
}

/**
 * Hook for creating transcripts - matches component expectations
 */
export function useCreateTranscriptAction() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const createTranscriptAction = useCallback(async (data: any) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await createTranscript(data);
          if (result.success) {
            toast.success('Transcript created successfully');
            resolve();
          } else {
            toast.error(result.error || 'Failed to create transcript');
            reject(new Error(result.error || 'Failed to create transcript'));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create transcript';
          toast.error(errorMessage);
          reject(error);
        }
      });
    });
  }, [toast]);

  return createTranscriptAction;
}

/**
 * Hook for updating transcripts - matches component expectations
 */
export function useUpdateTranscriptAction() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const updateTranscriptAction = useCallback(async (id: string, data: any) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await updateTranscript(id, data);
          if (result.success) {
            toast.success('Transcript updated successfully');
            resolve();
          } else {
            toast.error(result.error || 'Failed to update transcript');
            reject(new Error(result.error || 'Failed to update transcript'));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update transcript';
          toast.error(errorMessage);
          reject(error);
        }
      });
    });
  }, [toast]);

  return updateTranscriptAction;
}