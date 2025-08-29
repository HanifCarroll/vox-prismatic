import { shallow } from 'zustand/shallow';
import { useContentStore } from './content-store';
import type { ContentStore } from './types';

// Global selectors
export const useSearchQuery = () => useContentStore((state) => state.searchQuery);
export const useActiveView = () => useContentStore((state) => state.activeView);
export const useSetSearchQuery = () => useContentStore((state) => state.setSearchQuery);
export const useSetActiveView = () => useContentStore((state) => state.setActiveView);

// Transcript selectors
export const useTranscripts = () => useContentStore((state) => state.transcripts, shallow);
export const useTranscriptActions = () => 
  useContentStore(
    (state) => ({
      setStatusFilter: state.setTranscriptStatusFilter,
      setSort: state.setTranscriptSort,
      setSelectedItems: state.setTranscriptSelectedItems,
      selectItem: state.selectTranscriptItem,
      deselectItem: state.deselectTranscriptItem,
      clearSelection: state.clearTranscriptSelection,
      toggleFilters: state.toggleTranscriptFilters,
      setColumnVisibility: state.setTranscriptColumnVisibility,
      resetFilters: state.resetTranscriptFilters,
    }),
    shallow
  );

export const useTranscriptSelectionHandlers = () =>
  useContentStore(
    (state) => ({
      handleSelect: state.handleTranscriptSelect,
      handleSelectAll: state.handleTranscriptSelectAll,
      handleSelectFiltered: state.handleTranscriptSelectFiltered,
      handleSelectByStatus: state.handleTranscriptSelectByStatus,
      handleInvertSelection: state.handleTranscriptInvertSelection,
    }),
    shallow
  );

// Insight selectors
export const useInsights = () => useContentStore((state) => state.insights, shallow);
export const useInsightActions = () =>
  useContentStore(
    (state) => ({
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
    }),
    shallow
  );

export const useInsightSelectionHandlers = () =>
  useContentStore(
    (state) => ({
      handleSelect: state.handleInsightSelect,
      handleSelectAll: state.handleInsightSelectAll,
      handleSelectFiltered: state.handleInsightSelectFiltered,
      handleSelectByStatus: state.handleInsightSelectByStatus,
      handleSelectByCategory: state.handleInsightSelectByCategory,
      handleInvertSelection: state.handleInsightInvertSelection,
    }),
    shallow
  );

// Post selectors
export const usePosts = () => useContentStore((state) => state.posts, shallow);
export const usePostActions = () =>
  useContentStore(
    (state) => ({
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
    }),
    shallow
  );

export const usePostSelectionHandlers = () =>
  useContentStore(
    (state) => ({
      handleSelect: state.handlePostSelect,
      handleSelectAll: state.handlePostSelectAll,
      handleSelectFiltered: state.handlePostSelectFiltered,
      handleSelectByStatus: state.handlePostSelectByStatus,
      handleSelectByPlatform: state.handlePostSelectByPlatform,
      handleInvertSelection: state.handlePostInvertSelection,
      handleSelectDateRange: state.handlePostSelectDateRange,
    }),
    shallow
  );

// Modal selectors
export const useModals = () => useContentStore((state) => state.modals, shallow);
export const useModalActions = () =>
  useContentStore(
    (state) => ({
      openModal: state.openModal,
      closeModal: state.closeModal,
      closeAllModals: state.closeAllModals,
      setTranscriptData: state.setTranscriptData,
      setInsightData: state.setInsightData,
      setPostData: state.setPostData,
      setSchedulePostData: state.setSchedulePostData,
      clearModalData: state.clearModalData,
    }),
    shallow
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