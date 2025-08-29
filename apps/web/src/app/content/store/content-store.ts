import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ContentStore } from './types';

// Import slices
import { createGlobalSlice } from './slices/global-slice';
import { createTranscriptSlice } from './slices/transcript-slice';
import { createInsightSlice } from './slices/insight-slice';
import { createPostSlice } from './slices/post-slice';
import { createModalSlice } from './slices/modal-slice';

// Create the store
export const useContentStore = create<ContentStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createGlobalSlice(...args),
        ...createTranscriptSlice(...args),
        ...createInsightSlice(...args),
        ...createPostSlice(...args),
        ...createModalSlice(...args),
      }),
      {
        name: 'content-store',
        // Only persist user preferences, not transient state
        partialize: (state) => ({
          // Global preferences
          searchQuery: state.searchQuery,
          activeView: state.activeView,
          
          // Transcript preferences (exclude selectedItems)
          transcripts: {
            statusFilter: state.transcripts.statusFilter,
            sortBy: state.transcripts.sortBy,
            showFilters: state.transcripts.showFilters,
            columnVisibility: state.transcripts.columnVisibility,
            selectedItems: [], // Reset on reload
          },
          
          // Insight preferences (exclude selectedItems)
          insights: {
            statusFilter: state.insights.statusFilter,
            categoryFilter: state.insights.categoryFilter,
            postTypeFilter: state.insights.postTypeFilter,
            scoreRange: state.insights.scoreRange,
            sortBy: state.insights.sortBy,
            sortOrder: state.insights.sortOrder,
            showFilters: state.insights.showFilters,
            columnVisibility: state.insights.columnVisibility,
            selectedItems: [], // Reset on reload
          },
          
          // Post preferences (exclude selectedItems)
          posts: {
            statusFilter: state.posts.statusFilter,
            platformFilter: state.posts.platformFilter,
            sortBy: state.posts.sortBy,
            showFilters: state.posts.showFilters,
            columnVisibility: state.posts.columnVisibility,
            selectedItems: [], // Reset on reload
          },
          
          // Don't persist modal state
        }),
      }
    ),
    {
      name: 'content-store-devtools',
    }
  )
);

// Computed selectors with memoization
export const getTranscriptComputedValues = (state: ContentStore) => ({
  hasActiveFilters: state.transcripts.statusFilter !== 'all' || state.searchQuery !== '',
  activeFilterCount: [
    state.transcripts.statusFilter !== 'all',
    state.searchQuery !== '',
  ].filter(Boolean).length,
  selectedCount: state.transcripts.selectedItems.length,
  hasSelection: state.transcripts.selectedItems.length > 0,
});

export const getInsightComputedValues = (state: ContentStore) => ({
  sortString: `${state.insights.sortBy}-${state.insights.sortOrder}`,
  activeFilterCount: [
    state.insights.statusFilter !== 'all',
    state.insights.categoryFilter !== 'all',
    state.insights.postTypeFilter !== 'all',
    state.insights.scoreRange[0] !== 0 || state.insights.scoreRange[1] !== 20,
    state.searchQuery !== '',
  ].filter(Boolean).length,
  hasActiveFilters: function() { return this.activeFilterCount > 0; },
  selectedCount: state.insights.selectedItems.length,
  hasSelection: state.insights.selectedItems.length > 0,
});

export const getPostComputedValues = (state: ContentStore) => ({
  sortField: state.posts.sortBy.split('-')[0],
  sortOrder: state.posts.sortBy.split('-')[1] as 'asc' | 'desc',
  activeFilterCount: [
    state.posts.statusFilter !== 'all',
    state.posts.platformFilter !== 'all',
    state.searchQuery !== '',
  ].filter(Boolean).length,
  hasActiveFilters: function() { return this.activeFilterCount > 0; },
  selectedCount: state.posts.selectedItems.length,
  hasSelection: state.posts.selectedItems.length > 0,
});

export const getModalComputedValues = (state: ContentStore) => ({
  hasActiveModals: state.modals.activeModals.size > 0,
  isModalOpen: (modalType: string) => state.modals.activeModals.has(modalType as any),
  modalCount: state.modals.activeModals.size,
});

// Helper to get active content state based on current view
export const getActiveContentState = (state: ContentStore) => {
  switch (state.activeView) {
    case 'transcripts':
      return {
        type: 'transcripts' as const,
        state: state.transcripts,
        computedValues: getTranscriptComputedValues(state),
      };
    case 'insights':
      return {
        type: 'insights' as const,
        state: state.insights,
        computedValues: getInsightComputedValues(state),
      };
    case 'posts':
      return {
        type: 'posts' as const,
        state: state.posts,
        computedValues: getPostComputedValues(state),
      };
  }
};