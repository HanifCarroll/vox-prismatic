import { useShallow } from 'zustand/react/shallow';
import { useContentStore } from './content-store';
import type { ContentStore } from './types';

// Global selectors
export const useSearchQuery = () => useContentStore((state) => state.searchQuery);
export const useActiveView = () => useContentStore((state) => state.activeView);
export const useSetSearchQuery = () => useContentStore((state) => state.setSearchQuery);
export const useSetActiveView = () => useContentStore((state) => state.setActiveView);

// Transcript selectors
export const useTranscripts = () => useContentStore(useShallow((state) => state.transcripts));
export const useTranscriptActions = () => 
  useContentStore(
    useShallow((state) => ({
      setStatusFilter: state.setTranscriptStatusFilter,
      setSort: state.setTranscriptSort,
      setSelectedItems: state.setTranscriptSelectedItems,
      selectItem: state.selectTranscriptItem,
      deselectItem: state.deselectTranscriptItem,
      clearSelection: state.clearTranscriptSelection,
      toggleFilters: state.toggleTranscriptFilters,
      setColumnVisibility: state.setTranscriptColumnVisibility,
      resetFilters: state.resetTranscriptFilters,
    }))
  );

export const useTranscriptSelectionHandlers = () =>
  useContentStore(
    useShallow((state) => ({
      handleSelect: state.handleTranscriptSelect,
      handleSelectAll: state.handleTranscriptSelectAll,
      handleSelectFiltered: state.handleTranscriptSelectFiltered,
      handleSelectByStatus: state.handleTranscriptSelectByStatus,
      handleInvertSelection: state.handleTranscriptInvertSelection,
    }))
  );

// Insight selectors
export const useInsights = () => useContentStore(useShallow((state) => state.insights));
export const useInsightActions = () =>
  useContentStore(
    useShallow((state) => ({
      setStatusFilter: state.setInsightStatusFilter,
      setCategoryFilter: state.setInsightCategoryFilter,
      setPostTypeFilter: state.setInsightPostTypeFilter,
      setScoreRange: state.setInsightScoreRange,
      setSort: state.setInsightSort,
      setSelectedItems: state.setInsightSelectedItems,
      selectItem: state.selectInsightItem,
      deselectItem: state.deselectInsightItem,
      clearSelection: state.clearInsightSelection,
      toggleFilters: state.toggleInsightFilters,
      setColumnVisibility: state.setInsightColumnVisibility,
      resetFilters: state.resetInsightFilters,
    }))
  );

export const useInsightSelectionHandlers = () =>
  useContentStore(
    useShallow((state) => ({
      handleSelect: state.handleInsightSelect,
      handleSelectAll: state.handleInsightSelectAll,
      handleSelectFiltered: state.handleInsightSelectFiltered,
      handleSelectByStatus: state.handleInsightSelectByStatus,
      handleSelectByCategory: state.handleInsightSelectByCategory,
      handleInvertSelection: state.handleInsightInvertSelection,
    }))
  );

// Post selectors
export const usePosts = () => useContentStore(useShallow((state) => state.posts));
export const usePostActions = () =>
  useContentStore(
    useShallow((state) => ({
      setStatusFilter: state.setPostStatusFilter,
      setPlatformFilter: state.setPostPlatformFilter,
      setSort: state.setPostSort,
      setSelectedItems: state.setPostSelectedItems,
      selectItem: state.selectPostItem,
      deselectItem: state.deselectPostItem,
      clearSelection: state.clearPostSelection,
      toggleFilters: state.togglePostFilters,
      setColumnVisibility: state.setPostColumnVisibility,
      resetFilters: state.resetPostFilters,
    }))
  );

export const usePostSelectionHandlers = () =>
  useContentStore(
    useShallow((state) => ({
      handleSelect: state.handlePostSelect,
      handleSelectAll: state.handlePostSelectAll,
      handleSelectFiltered: state.handlePostSelectFiltered,
      handleSelectByStatus: state.handlePostSelectByStatus,
      handleSelectByPlatform: state.handlePostSelectByPlatform,
      handleInvertSelection: state.handlePostInvertSelection,
      handleSelectDateRange: state.handlePostSelectDateRange,
    }))
  );

// Modal selectors
export const useModals = () => useContentStore(useShallow((state) => state.modals));
export const useModalActions = () =>
  useContentStore(
    useShallow((state) => ({
      openModal: state.openModal,
      closeModal: state.closeModal,
      closeAllModals: state.closeAllModals,
      setTranscriptData: state.setTranscriptData,
      setInsightData: state.setInsightData,
      setPostData: state.setPostData,
      setSchedulePostData: state.setSchedulePostData,
      clearModalData: state.clearModalData,
    }))
  );

// Computed value selectors
export const useTranscriptComputedValues = () =>
  useContentStore((state) => ({
    hasActiveFilters: state.transcripts.statusFilter !== 'all' || state.searchQuery !== '',
    activeFilterCount: [
      state.transcripts.statusFilter !== 'all',
      state.searchQuery !== '',
    ].filter(Boolean).length,
    selectedCount: state.transcripts.selectedItems.length,
    hasSelection: state.transcripts.selectedItems.length > 0,
  }));

export const useInsightComputedValues = () =>
  useContentStore((state) => {
    const activeFilterCount = [
      state.insights.statusFilter !== 'all',
      state.insights.categoryFilter !== 'all',
      state.insights.postTypeFilter !== 'all',
      state.insights.scoreRange[0] !== 0 || state.insights.scoreRange[1] !== 20,
      state.searchQuery !== '',
    ].filter(Boolean).length;
    
    return {
      sortString: `${state.insights.sortBy}-${state.insights.sortOrder}`,
      activeFilterCount,
      hasActiveFilters: () => activeFilterCount > 0,
      selectedCount: state.insights.selectedItems.length,
      hasSelection: state.insights.selectedItems.length > 0,
    };
  });

export const usePostComputedValues = () =>
  useContentStore((state) => {
    const activeFilterCount = [
      state.posts.statusFilter !== 'all',
      state.posts.platformFilter !== 'all',
      state.searchQuery !== '',
    ].filter(Boolean).length;
    
    return {
      sortField: state.posts.sortBy.split('-')[0],
      sortOrder: state.posts.sortBy.split('-')[1] as 'asc' | 'desc',
      activeFilterCount,
      hasActiveFilters: () => activeFilterCount > 0,
      selectedCount: state.posts.selectedItems.length,
      hasSelection: state.posts.selectedItems.length > 0,
    };
  });

export const useModalComputedValues = () =>
  useContentStore((state) => ({
    hasActiveModals: state.modals.activeModals.size > 0,
    isModalOpen: (modalType: string) => state.modals.activeModals.has(modalType as any),
    modalCount: state.modals.activeModals.size,
  }));

// Content operations helper (similar to the old useContentOperations)
export const useContentOperations = (contentType: 'transcripts' | 'insights' | 'posts') => {
  const searchQuery = useSearchQuery();
  
  switch (contentType) {
    case 'transcripts': {
      const state = useTranscripts();
      const actions = useTranscriptActions();
      const selectionHandlers = useTranscriptSelectionHandlers();
      const computedValues = useTranscriptComputedValues();
      
      return {
        state,
        actions,
        selectionHandlers,
        computedValues,
        operations: {
          clearAllFilters: actions.resetFilters,
          hasActiveFilters: () => computedValues.hasActiveFilters,
          clearSelection: actions.clearSelection,
          hasSelection: computedValues.hasSelection,
          selectedCount: computedValues.selectedCount,
          toggleFilters: actions.toggleFilters,
          isFiltersVisible: state.showFilters,
        },
      };
    }
    
    case 'insights': {
      const state = useInsights();
      const actions = useInsightActions();
      const selectionHandlers = useInsightSelectionHandlers();
      const computedValues = useInsightComputedValues();
      
      return {
        state,
        actions,
        selectionHandlers,
        computedValues,
        operations: {
          clearAllFilters: actions.resetFilters,
          hasActiveFilters: computedValues.hasActiveFilters,
          clearSelection: actions.clearSelection,
          hasSelection: computedValues.hasSelection,
          selectedCount: computedValues.selectedCount,
          toggleFilters: actions.toggleFilters,
          isFiltersVisible: state.showFilters,
        },
      };
    }
    
    case 'posts': {
      const state = usePosts();
      const actions = usePostActions();
      const selectionHandlers = usePostSelectionHandlers();
      const computedValues = usePostComputedValues();
      
      return {
        state,
        actions,
        selectionHandlers,
        computedValues,
        operations: {
          clearAllFilters: actions.resetFilters,
          hasActiveFilters: computedValues.hasActiveFilters,
          clearSelection: actions.clearSelection,
          hasSelection: computedValues.hasSelection,
          selectedCount: computedValues.selectedCount,
          toggleFilters: actions.toggleFilters,
          isFiltersVisible: state.showFilters,
        },
      };
    }
  }
};

// Active content state helper
export const useActiveContentState = () => {
  const activeView = useActiveView();
  const transcripts = useTranscripts();
  const insights = useInsights();
  const posts = usePosts();
  const transcriptComputedValues = useTranscriptComputedValues();
  const insightComputedValues = useInsightComputedValues();
  const postComputedValues = usePostComputedValues();
  
  switch (activeView) {
    case 'transcripts':
      return {
        type: 'transcripts' as const,
        state: transcripts,
        computedValues: transcriptComputedValues,
      };
    case 'insights':
      return {
        type: 'insights' as const,
        state: insights,
        computedValues: insightComputedValues,
      };
    case 'posts':
      return {
        type: 'posts' as const,
        state: posts,
        computedValues: postComputedValues,
      };
  }
};

// =====================================================================
// SERVER DATA SELECTORS
// =====================================================================

// Transcript data selectors
export const useTranscriptsData = () => 
  useContentStore(useShallow((state) => ({
    data: state.transcriptsData,
    loading: state.transcriptsLoading,
    error: state.transcriptsError,
    pagination: state.transcriptsPagination
  })));

export const useTranscriptDataActions = () =>
  useContentStore(
    useShallow((state) => ({
      setData: state.setTranscriptsData,
      setLoading: state.setTranscriptsLoading,
      setError: state.setTranscriptsError,
      setPagination: state.setTranscriptsPagination,
      updateTranscript: state.updateTranscript,
      removeTranscript: state.removeTranscript,
      addTranscript: state.addTranscript
    }))
  );

// Insight data selectors
export const useInsightsData = () => 
  useContentStore(useShallow((state) => ({
    data: state.insightsData,
    loading: state.insightsLoading,
    error: state.insightsError,
    pagination: state.insightsPagination
  })));

export const useInsightDataActions = () =>
  useContentStore(
    useShallow((state) => ({
      setData: state.setInsightsData,
      setLoading: state.setInsightsLoading,
      setError: state.setInsightsError,
      setPagination: state.setInsightsPagination,
      updateInsight: state.updateInsight,
      removeInsight: state.removeInsight,
      addInsight: state.addInsight
    }))
  );

// Post data selectors
export const usePostsData = () => 
  useContentStore(useShallow((state) => ({
    data: state.postsData,
    loading: state.postsLoading,
    error: state.postsError,
    pagination: state.postsPagination
  })));

export const usePostDataActions = () =>
  useContentStore(
    useShallow((state) => ({
      setData: state.setPostsData,
      setLoading: state.setPostsLoading,
      setError: state.setPostsError,
      setPagination: state.setPostsPagination,
      updatePost: state.updatePost,
      removePost: state.removePost,
      addPost: state.addPost
    }))
  );

// Optimistic updates selectors
export const useOptimisticUpdates = () =>
  useContentStore((state) => state.optimisticUpdates);

export const useOptimisticActions = () =>
  useContentStore(
    useShallow((state) => ({
      addOptimistic: state.addOptimisticUpdate,
      removeOptimistic: state.removeOptimisticUpdate,
      clearOptimistic: state.clearOptimisticUpdates
    }))
  );