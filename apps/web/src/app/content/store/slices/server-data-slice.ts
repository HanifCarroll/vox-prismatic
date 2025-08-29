import { StateCreator } from 'zustand';
import type { TranscriptView, InsightView, PostView } from '@/types';

/**
 * Server Data Slice
 * Manages data fetched from server actions
 */

export interface ServerDataState {
  // Transcript data
  transcriptsData: TranscriptView[];
  transcriptsLoading: boolean;
  transcriptsError: string | null;
  transcriptsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  
  // Insight data
  insightsData: InsightView[];
  insightsLoading: boolean;
  insightsError: string | null;
  insightsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  
  // Post data
  postsData: PostView[];
  postsLoading: boolean;
  postsError: string | null;
  postsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  
  // Optimistic updates tracking
  optimisticUpdates: Map<string, any>;
}

export interface ServerDataActions {
  // Transcript actions
  setTranscriptsData: (data: TranscriptView[]) => void;
  setTranscriptsLoading: (loading: boolean) => void;
  setTranscriptsError: (error: string | null) => void;
  setTranscriptsPagination: (pagination: ServerDataState['transcriptsPagination']) => void;
  updateTranscript: (id: string, updates: Partial<TranscriptView>) => void;
  removeTranscript: (id: string) => void;
  addTranscript: (transcript: TranscriptView) => void;
  
  // Insight actions
  setInsightsData: (data: InsightView[]) => void;
  setInsightsLoading: (loading: boolean) => void;
  setInsightsError: (error: string | null) => void;
  setInsightsPagination: (pagination: ServerDataState['insightsPagination']) => void;
  updateInsight: (id: string, updates: Partial<InsightView>) => void;
  removeInsight: (id: string) => void;
  addInsight: (insight: InsightView) => void;
  
  // Post actions
  setPostsData: (data: PostView[]) => void;
  setPostsLoading: (loading: boolean) => void;
  setPostsError: (error: string | null) => void;
  setPostsPagination: (pagination: ServerDataState['postsPagination']) => void;
  updatePost: (id: string, updates: Partial<PostView>) => void;
  removePost: (id: string) => void;
  addPost: (post: PostView) => void;
  
  // Optimistic update actions
  addOptimisticUpdate: (key: string, data: any) => void;
  removeOptimisticUpdate: (key: string) => void;
  clearOptimisticUpdates: () => void;
  
  // Utility actions
  clearAllServerData: () => void;
  refreshServerData: () => void;
}

export type ServerDataSlice = ServerDataState & ServerDataActions;

const initialPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasMore: false
};

export const createServerDataSlice: StateCreator<
  ServerDataSlice,
  [],
  [],
  ServerDataSlice
> = (set, get) => ({
  // Initial state
  transcriptsData: [],
  transcriptsLoading: false,
  transcriptsError: null,
  transcriptsPagination: initialPagination,
  
  insightsData: [],
  insightsLoading: false,
  insightsError: null,
  insightsPagination: initialPagination,
  
  postsData: [],
  postsLoading: false,
  postsError: null,
  postsPagination: initialPagination,
  
  optimisticUpdates: new Map(),
  
  // Transcript actions
  setTranscriptsData: (data) => set({ transcriptsData: data }),
  setTranscriptsLoading: (loading) => set({ transcriptsLoading: loading }),
  setTranscriptsError: (error) => set({ transcriptsError: error }),
  setTranscriptsPagination: (pagination) => set({ transcriptsPagination: pagination }),
  
  updateTranscript: (id, updates) => set((state) => ({
    transcriptsData: state.transcriptsData.map(t => 
      t.id === id ? { ...t, ...updates } : t
    )
  })),
  
  removeTranscript: (id) => set((state) => ({
    transcriptsData: state.transcriptsData.filter(t => t.id !== id),
    transcriptsPagination: {
      ...state.transcriptsPagination,
      total: Math.max(0, state.transcriptsPagination.total - 1)
    }
  })),
  
  addTranscript: (transcript) => set((state) => ({
    transcriptsData: [transcript, ...state.transcriptsData],
    transcriptsPagination: {
      ...state.transcriptsPagination,
      total: state.transcriptsPagination.total + 1
    }
  })),
  
  // Insight actions
  setInsightsData: (data) => set({ insightsData: data }),
  setInsightsLoading: (loading) => set({ insightsLoading: loading }),
  setInsightsError: (error) => set({ insightsError: error }),
  setInsightsPagination: (pagination) => set({ insightsPagination: pagination }),
  
  updateInsight: (id, updates) => set((state) => ({
    insightsData: state.insightsData.map(i => 
      i.id === id ? { ...i, ...updates } : i
    )
  })),
  
  removeInsight: (id) => set((state) => ({
    insightsData: state.insightsData.filter(i => i.id !== id),
    insightsPagination: {
      ...state.insightsPagination,
      total: Math.max(0, state.insightsPagination.total - 1)
    }
  })),
  
  addInsight: (insight) => set((state) => ({
    insightsData: [insight, ...state.insightsData],
    insightsPagination: {
      ...state.insightsPagination,
      total: state.insightsPagination.total + 1
    }
  })),
  
  // Post actions
  setPostsData: (data) => set({ postsData: data }),
  setPostsLoading: (loading) => set({ postsLoading: loading }),
  setPostsError: (error) => set({ postsError: error }),
  setPostsPagination: (pagination) => set({ postsPagination: pagination }),
  
  updatePost: (id, updates) => set((state) => ({
    postsData: state.postsData.map(p => 
      p.id === id ? { ...p, ...updates } : p
    )
  })),
  
  removePost: (id) => set((state) => ({
    postsData: state.postsData.filter(p => p.id !== id),
    postsPagination: {
      ...state.postsPagination,
      total: Math.max(0, state.postsPagination.total - 1)
    }
  })),
  
  addPost: (post) => set((state) => ({
    postsData: [post, ...state.postsData],
    postsPagination: {
      ...state.postsPagination,
      total: state.postsPagination.total + 1
    }
  })),
  
  // Optimistic update actions
  addOptimisticUpdate: (key, data) => set((state) => {
    const updates = new Map(state.optimisticUpdates);
    updates.set(key, data);
    return { optimisticUpdates: updates };
  }),
  
  removeOptimisticUpdate: (key) => set((state) => {
    const updates = new Map(state.optimisticUpdates);
    updates.delete(key);
    return { optimisticUpdates: updates };
  }),
  
  clearOptimisticUpdates: () => set({ optimisticUpdates: new Map() }),
  
  // Utility actions
  clearAllServerData: () => set({
    transcriptsData: [],
    transcriptsError: null,
    transcriptsPagination: initialPagination,
    
    insightsData: [],
    insightsError: null,
    insightsPagination: initialPagination,
    
    postsData: [],
    postsError: null,
    postsPagination: initialPagination,
    
    optimisticUpdates: new Map()
  }),
  
  refreshServerData: () => {
    // This will trigger a re-fetch in components
    set({
      transcriptsLoading: false,
      insightsLoading: false,
      postsLoading: false
    });
  }
});