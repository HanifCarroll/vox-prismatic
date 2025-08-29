import type { TranscriptView, InsightView, PostView } from '@content-creation/types';
import { ModalType, EntityType } from '@content-creation/types';
import type { ServerDataSlice } from './slices/server-data-slice';

// Re-export enums as both type and value for local convenience
export { ModalType, EntityType } from '@content-creation/types';

// Global state
export interface GlobalSlice {
  searchQuery: string;
  activeView: 'transcripts' | 'insights' | 'posts'; // Keep as literal for UI navigation
  setSearchQuery: (query: string) => void;
  setActiveView: (view: 'transcripts' | 'insights' | 'posts') => void;
}

// Transcript state and actions
export interface TranscriptSlice {
  transcripts: {
    statusFilter: string;
    sortBy: string;
    selectedItems: string[];
    showFilters: boolean;
    columnVisibility: string[];
  };
  
  // Transcript actions
  setTranscriptStatusFilter: (filter: string) => void;
  setTranscriptSort: (sort: string) => void;
  setTranscriptSelectedItems: (items: string[]) => void;
  selectTranscriptItem: (id: string) => void;
  deselectTranscriptItem: (id: string) => void;
  clearTranscriptSelection: () => void;
  toggleTranscriptFilters: () => void;
  setTranscriptColumnVisibility: (columnId: string, visible: boolean) => void;
  resetTranscriptFilters: () => void;
  
  // Transcript selection handlers
  handleTranscriptSelect: (id: string, selected: boolean) => void;
  handleTranscriptSelectAll: (selected: boolean, allItems: TranscriptView[]) => void;
  handleTranscriptSelectFiltered: (filteredItems: TranscriptView[]) => void;
  handleTranscriptSelectByStatus: (status: string, allItems: TranscriptView[]) => void;
  handleTranscriptInvertSelection: (allItems: TranscriptView[]) => void;
}

// Insight state and actions
export interface InsightSlice {
  insights: {
    statusFilter: string;
    categoryFilter: string;
    postTypeFilter: string;
    scoreRange: [number, number];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    selectedItems: string[];
    showFilters: boolean;
    columnVisibility: string[];
  };
  
  // Insight actions
  setInsightStatusFilter: (filter: string) => void;
  setInsightCategoryFilter: (filter: string) => void;
  setInsightPostTypeFilter: (filter: string) => void;
  setInsightScoreRange: (range: [number, number]) => void;
  setInsightSort: (field: string, order: 'asc' | 'desc') => void;
  setInsightSelectedItems: (items: string[]) => void;
  selectInsightItem: (id: string) => void;
  deselectInsightItem: (id: string) => void;
  clearInsightSelection: () => void;
  toggleInsightFilters: () => void;
  setInsightColumnVisibility: (columnId: string, visible: boolean) => void;
  resetInsightFilters: () => void;
  
  // Insight selection handlers
  handleInsightSelect: (id: string, selected: boolean) => void;
  handleInsightSelectAll: (selected: boolean, allItems: InsightView[]) => void;
  handleInsightSelectFiltered: (filteredItems: InsightView[]) => void;
  handleInsightSelectByStatus: (status: string, allItems: InsightView[]) => void;
  handleInsightSelectByCategory: (category: string, allItems: InsightView[]) => void;
  handleInsightInvertSelection: (allItems: InsightView[]) => void;
}

// Post state and actions
export interface PostSlice {
  posts: {
    statusFilter: string;
    platformFilter: string;
    sortBy: string;
    selectedItems: string[];
    showFilters: boolean;
    columnVisibility: string[];
  };
  
  // Post actions
  setPostStatusFilter: (filter: string) => void;
  setPostPlatformFilter: (filter: string) => void;
  setPostSort: (sort: string) => void;
  setPostSelectedItems: (items: string[]) => void;
  selectPostItem: (id: string) => void;
  deselectPostItem: (id: string) => void;
  clearPostSelection: () => void;
  togglePostFilters: () => void;
  setPostColumnVisibility: (columnId: string, visible: boolean) => void;
  resetPostFilters: () => void;
  
  // Post selection handlers
  handlePostSelect: (id: string, selected: boolean) => void;
  handlePostSelectAll: (selected: boolean, allItems: PostView[]) => void;
  handlePostSelectFiltered: (filteredItems: PostView[]) => void;
  handlePostSelectByStatus: (status: string, allItems: PostView[]) => void;
  handlePostSelectByPlatform: (platform: string, allItems: PostView[]) => void;
  handlePostInvertSelection: (allItems: PostView[]) => void;
  handlePostSelectDateRange: (start: Date, end: Date, allItems: PostView[]) => void;
}

// Modal state and actions
export interface ModalSlice {
  modals: {
    activeModals: Set<ModalType>;
    selectedTranscript: TranscriptView | null;
    selectedInsight: InsightView | null;
    selectedPost: PostView | null;
    postToSchedule: PostView | null;
    transcriptModalMode: 'view' | 'edit';
  };
  
  // Modal actions
  openModal: (modalType: ModalType, data?: any) => void;
  closeModal: (modalType: ModalType) => void;
  closeAllModals: () => void;
  setTranscriptData: (transcript: TranscriptView, mode: 'view' | 'edit') => void;
  setInsightData: (insight: InsightView) => void;
  setPostData: (post: PostView) => void;
  setSchedulePostData: (post: PostView) => void;
  clearModalData: (modalType: ModalType) => void;
}

// Combined store type
export type ContentStore = GlobalSlice & TranscriptSlice & InsightSlice & PostSlice & ModalSlice & ServerDataSlice;