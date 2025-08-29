// Main store
export { useContentStore } from './content-store';

// Types
export type { ContentStore, GlobalSlice, TranscriptSlice, InsightSlice, PostSlice, ModalSlice } from './types';
export { ModalType } from './types';

// Selectors
export {
  // Global
  useSearchQuery,
  useActiveView,
  useSetSearchQuery,
  useSetActiveView,
  
  // Transcripts
  useTranscripts,
  useTranscriptActions,
  useTranscriptSelectionHandlers,
  useTranscriptComputedValues,
  
  // Insights
  useInsights,
  useInsightActions,
  useInsightSelectionHandlers,
  useInsightComputedValues,
  
  // Posts
  usePosts,
  usePostActions,
  usePostSelectionHandlers,
  usePostComputedValues,
  
  // Modals
  useModals,
  useModalActions,
  useModalComputedValues,
  
  // Helpers
  useContentOperations,
  useActiveContentState,
} from './selectors';

// Hydration utilities
export {
  useHydratedStore,
  useIsHydrated,
  HydrationBoundary,
  initializeStore,
  useManualHydration,
  useHydratedDefaults,
} from './hydration';