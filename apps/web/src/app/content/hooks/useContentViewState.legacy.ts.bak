import { useReducer, useCallback, useMemo } from 'react';
import type { TranscriptView, InsightView, PostView } from '@/types';

// Types
type ContentView = 'transcripts' | 'insights' | 'posts';

export interface InitialFilters {
  status?: string;
  category?: string;
  postType?: string;
  platform?: string;
  scoreMin?: string;
  scoreMax?: string;
}

export interface InitialSort {
  field?: string;
  order?: string;
}

interface ViewFilters {
  transcripts: {
    statusFilter: string;
    sortBy: string;
  };
  insights: {
    statusFilter: string;
    postTypeFilter: string;
    categoryFilter: string;
    scoreRange: [number, number];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  posts: {
    statusFilter: string;
    platformFilter: string;
    sortBy: string;
  };
}

interface ColumnVisibility {
  transcripts: string[];
  insights: string[];
  posts: string[];
}

interface ContentViewState {
  // Unified state
  searchQuery: string;
  selectedItems: string[];
  showFilters: boolean;
  
  // View-specific filters
  filters: ViewFilters;
  
  // Column visibility
  columnVisibility: ColumnVisibility;
  
  // Modal states
  modals: {
    showTranscriptInput: boolean;
    showTranscriptModal: boolean;
    selectedTranscript: TranscriptView | null;
    transcriptModalMode: 'view' | 'edit';
    
    showInsightModal: boolean;
    selectedInsight: InsightView | null;
    
    showPostModal: boolean;
    showScheduleModal: boolean;
    showBulkScheduleModal: boolean;
    selectedPost: PostView | null;
    postToSchedule: PostView | null;
  };
}

type ContentViewAction = 
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_ITEMS'; payload: string[] }
  | { type: 'TOGGLE_FILTERS' }
  | { type: 'SET_SHOW_FILTERS'; payload: boolean }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'DESELECT_ITEM'; payload: string }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'INVERT_SELECTION'; payload: Array<{ id: string }> }
  | { type: 'SET_TRANSCRIPT_STATUS_FILTER'; payload: string }
  | { type: 'SET_TRANSCRIPT_SORT'; payload: string }
  | { type: 'SET_INSIGHT_STATUS_FILTER'; payload: string }
  | { type: 'SET_INSIGHT_POST_TYPE_FILTER'; payload: string }
  | { type: 'SET_INSIGHT_CATEGORY_FILTER'; payload: string }
  | { type: 'SET_INSIGHT_SCORE_RANGE'; payload: [number, number] }
  | { type: 'SET_INSIGHT_SORT'; payload: { field: string; order: 'asc' | 'desc' } }
  | { type: 'SET_POST_STATUS_FILTER'; payload: string }
  | { type: 'SET_POST_PLATFORM_FILTER'; payload: string }
  | { type: 'SET_POST_SORT'; payload: string }
  | { type: 'SHOW_TRANSCRIPT_INPUT_MODAL' }
  | { type: 'HIDE_TRANSCRIPT_INPUT_MODAL' }
  | { type: 'SHOW_TRANSCRIPT_MODAL'; payload: { transcript: TranscriptView; mode: 'view' | 'edit' } }
  | { type: 'HIDE_TRANSCRIPT_MODAL' }
  | { type: 'SHOW_INSIGHT_MODAL'; payload: InsightView }
  | { type: 'HIDE_INSIGHT_MODAL' }
  | { type: 'SHOW_POST_MODAL'; payload: PostView }
  | { type: 'HIDE_POST_MODAL' }
  | { type: 'SHOW_SCHEDULE_MODAL'; payload: PostView }
  | { type: 'HIDE_SCHEDULE_MODAL' }
  | { type: 'SHOW_BULK_SCHEDULE_MODAL' }
  | { type: 'HIDE_BULK_SCHEDULE_MODAL' }
  | { type: 'SET_COLUMN_VISIBILITY'; payload: { view: ContentView; columnId: string; visible: boolean } }
  | { type: 'SET_ALL_COLUMNS_VISIBILITY'; payload: { view: ContentView; columns: string[] } };

/**
 * Create initial state from URL parameters
 */
function createInitialState(
  view: string = 'transcripts',
  search?: string,
  filters?: InitialFilters,
  sort?: InitialSort
): ContentViewState {
  const baseState: ContentViewState = {
    searchQuery: search || '',
    selectedItems: [],
    showFilters: false,
    filters: {
      transcripts: {
        statusFilter: 'all',
        sortBy: 'createdAt-desc',
      },
      insights: {
        statusFilter: 'all',
        postTypeFilter: 'all',
        categoryFilter: 'all',
        scoreRange: [0, 20],
        sortBy: 'totalScore',
        sortOrder: 'desc',
      },
      posts: {
        statusFilter: 'all',
        platformFilter: 'all',
        sortBy: 'createdAt-desc',
      },
    },
    columnVisibility: {
      transcripts: ['title', 'source', 'wordCount', 'status', 'createdAt'],
      insights: ['title', 'type', 'category', 'totalScore', 'status', 'createdAt'],
      posts: ['title', 'platform', 'status', 'createdAt', 'scheduledFor', 'characterCount', 'insightTitle'],
    },
    modals: {
      showTranscriptInput: false,
      showTranscriptModal: false,
      selectedTranscript: null,
      transcriptModalMode: 'view',
      showInsightModal: false,
      selectedInsight: null,
      showPostModal: false,
      showScheduleModal: false,
      showBulkScheduleModal: false,
      selectedPost: null,
      postToSchedule: null,
    },
  };

  // Apply URL filters based on current view
  if (filters) {
    switch (view) {
      case 'transcripts':
        if (filters.status) {
          baseState.filters.transcripts.statusFilter = filters.status;
        }
        if (sort?.field) {
          const order = sort.order || 'desc';
          baseState.filters.transcripts.sortBy = `${sort.field}-${order}`;
        }
        break;
      
      case 'insights':
        if (filters.status) {
          baseState.filters.insights.statusFilter = filters.status;
        }
        if (filters.category) {
          baseState.filters.insights.categoryFilter = filters.category;
        }
        if (filters.postType) {
          baseState.filters.insights.postTypeFilter = filters.postType;
        }
        if (filters.scoreMin) {
          baseState.filters.insights.scoreRange[0] = parseInt(filters.scoreMin, 10);
        }
        if (filters.scoreMax) {
          baseState.filters.insights.scoreRange[1] = parseInt(filters.scoreMax, 10);
        }
        if (sort?.field) {
          baseState.filters.insights.sortBy = sort.field;
          baseState.filters.insights.sortOrder = (sort.order as 'asc' | 'desc') || 'desc';
        }
        break;
      
      case 'posts':
        if (filters.status) {
          baseState.filters.posts.statusFilter = filters.status;
        }
        if (filters.platform) {
          baseState.filters.posts.platformFilter = filters.platform;
        }
        if (sort?.field) {
          const order = sort.order || 'desc';
          baseState.filters.posts.sortBy = `${sort.field}-${order}`;
        }
        break;
    }
  }

  return baseState;
}

// Default initial state for backward compatibility
const initialState = createInitialState();

function contentViewReducer(state: ContentViewState, action: ContentViewAction): ContentViewState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_SELECTED_ITEMS':
      return { ...state, selectedItems: action.payload };
    
    case 'TOGGLE_FILTERS':
      return { ...state, showFilters: !state.showFilters };
    
    case 'SET_SHOW_FILTERS':
      return { ...state, showFilters: action.payload };
    
    case 'CLEAR_SELECTION':
      return { ...state, selectedItems: [] };
    
    case 'SELECT_ITEM':
      return { 
        ...state, 
        selectedItems: [...state.selectedItems, action.payload] 
      };
    
    case 'DESELECT_ITEM':
      return { 
        ...state, 
        selectedItems: state.selectedItems.filter(id => id !== action.payload) 
      };
    
    case 'SELECT_ALL':
      return { ...state, selectedItems: action.payload };
    
    case 'INVERT_SELECTION':
      const currentSelected = new Set(state.selectedItems);
      const inverted = action.payload
        .filter(item => !currentSelected.has(item.id))
        .map(item => item.id);
      return { ...state, selectedItems: inverted };
    
    // Transcript filters
    case 'SET_TRANSCRIPT_STATUS_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          transcripts: { ...state.filters.transcripts, statusFilter: action.payload }
        }
      };
    
    case 'SET_TRANSCRIPT_SORT':
      return {
        ...state,
        filters: {
          ...state.filters,
          transcripts: { ...state.filters.transcripts, sortBy: action.payload }
        }
      };
    
    // Insight filters
    case 'SET_INSIGHT_STATUS_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          insights: { ...state.filters.insights, statusFilter: action.payload }
        }
      };
    
    case 'SET_INSIGHT_POST_TYPE_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          insights: { ...state.filters.insights, postTypeFilter: action.payload }
        }
      };
    
    case 'SET_INSIGHT_CATEGORY_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          insights: { ...state.filters.insights, categoryFilter: action.payload }
        }
      };
    
    case 'SET_INSIGHT_SCORE_RANGE':
      return {
        ...state,
        filters: {
          ...state.filters,
          insights: { ...state.filters.insights, scoreRange: action.payload }
        }
      };
    
    case 'SET_INSIGHT_SORT':
      return {
        ...state,
        filters: {
          ...state.filters,
          insights: { 
            ...state.filters.insights, 
            sortBy: action.payload.field,
            sortOrder: action.payload.order
          }
        }
      };
    
    // Post filters
    case 'SET_POST_STATUS_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          posts: { ...state.filters.posts, statusFilter: action.payload }
        }
      };
    
    case 'SET_POST_PLATFORM_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          posts: { ...state.filters.posts, platformFilter: action.payload }
        }
      };
    
    case 'SET_POST_SORT':
      return {
        ...state,
        filters: {
          ...state.filters,
          posts: { ...state.filters.posts, sortBy: action.payload }
        }
      };
    
    // Modal actions
    case 'SHOW_TRANSCRIPT_INPUT_MODAL':
      return {
        ...state,
        modals: { ...state.modals, showTranscriptInput: true }
      };
    
    case 'HIDE_TRANSCRIPT_INPUT_MODAL':
      return {
        ...state,
        modals: { ...state.modals, showTranscriptInput: false }
      };
    
    case 'SHOW_TRANSCRIPT_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          showTranscriptModal: true,
          selectedTranscript: action.payload.transcript,
          transcriptModalMode: action.payload.mode
        }
      };
    
    case 'HIDE_TRANSCRIPT_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          showTranscriptModal: false,
          selectedTranscript: null
        }
      };
    
    case 'SHOW_INSIGHT_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          showInsightModal: true,
          selectedInsight: action.payload
        }
      };
    
    case 'HIDE_INSIGHT_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          showInsightModal: false,
          selectedInsight: null
        }
      };
    
    case 'SHOW_POST_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          showPostModal: true,
          selectedPost: action.payload
        }
      };
    
    case 'HIDE_POST_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          showPostModal: false,
          selectedPost: null
        }
      };
    
    case 'SHOW_SCHEDULE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          showScheduleModal: true,
          postToSchedule: action.payload
        }
      };
    
    case 'HIDE_SCHEDULE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          showScheduleModal: false,
          postToSchedule: null
        }
      };
    
    case 'SHOW_BULK_SCHEDULE_MODAL':
      return {
        ...state,
        modals: { ...state.modals, showBulkScheduleModal: true }
      };
    
    case 'HIDE_BULK_SCHEDULE_MODAL':
      return {
        ...state,
        modals: { ...state.modals, showBulkScheduleModal: false }
      };
    
    case 'SET_COLUMN_VISIBILITY':
      const { view, columnId, visible } = action.payload;
      const currentColumns = state.columnVisibility[view];
      const newColumns = visible 
        ? [...currentColumns, columnId]
        : currentColumns.filter(col => col !== columnId);
      return {
        ...state,
        columnVisibility: {
          ...state.columnVisibility,
          [view]: newColumns
        }
      };
    
    case 'SET_ALL_COLUMNS_VISIBILITY':
      return {
        ...state,
        columnVisibility: {
          ...state.columnVisibility,
          [action.payload.view]: action.payload.columns
        }
      };
    
    default:
      return state;
  }
}

export function useContentViewState(
  initialView?: string,
  initialSearch?: string,
  initialFilters?: InitialFilters,
  initialSort?: InitialSort
) {
  const [state, dispatch] = useReducer(
    contentViewReducer, 
    null,
    () => createInitialState(initialView, initialSearch, initialFilters, initialSort)
  );
  
  // Selection handlers
  const handleSelect = useCallback((id: string, selected: boolean) => {
    if (selected) {
      dispatch({ type: 'SELECT_ITEM', payload: id });
    } else {
      dispatch({ type: 'DESELECT_ITEM', payload: id });
    }
  }, []);
  
  const handleSelectAll = useCallback((selected: boolean, allItems: Array<{ id: string }>) => {
    if (selected) {
      dispatch({ type: 'SELECT_ALL', payload: allItems.map(item => item.id) });
    } else {
      dispatch({ type: 'CLEAR_SELECTION' });
    }
  }, []);
  
  // Smart selection handlers
  const handleSelectFiltered = useCallback((filteredItems: Array<{ id: string }>) => {
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: filteredItems.map(item => item.id) });
  }, []);
  
  const handleSelectByStatus = useCallback((status: string, allItems: Array<{ id: string; status: string }>) => {
    const statusItems = allItems.filter(item => item.status === status);
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: statusItems.map(item => item.id) });
  }, []);
  
  const handleSelectByPlatform = useCallback((platform: string, allItems: Array<{ id: string; platform?: string; category?: string }>) => {
    const platformItems = allItems.filter(item => 
      item.platform === platform || item.category === platform
    );
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: platformItems.map(item => item.id) });
  }, []);
  
  const handleInvertSelection = useCallback((allItems: Array<{ id: string }>) => {
    dispatch({ type: 'INVERT_SELECTION', payload: allItems });
  }, []);
  
  const handleSelectDateRange = useCallback((start: Date, end: Date, allItems: Array<{ id: string; createdAt: Date | string }>) => {
    const rangeItems = allItems.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= start && itemDate <= end;
    });
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: rangeItems.map(item => item.id) });
  }, []);
  
  // Clear selections when view changes
  const clearSelectionsForViewChange = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
  }, []);
  
  // Create stable action callbacks
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);
  
  const setSelectedItems = useCallback((items: string[]) => {
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: items });
  }, []);
  
  const toggleFilters = useCallback(() => {
    dispatch({ type: 'TOGGLE_FILTERS' });
  }, []);
  
  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);
  
  // Memoize actions object
  const actions = useMemo(() => ({
    setSearchQuery,
    setSelectedItems,
    toggleFilters,
    clearSelection,
  }), [setSearchQuery, setSelectedItems, toggleFilters, clearSelection]);
  
  // Don't memoize the handlers object - let individual handlers be stable
  const handlers = {
    handleSelect,
    handleSelectAll,
    handleSelectFiltered,
    handleSelectByStatus,
    handleSelectByPlatform,
    handleInvertSelection,
    handleSelectDateRange,
    clearSelectionsForViewChange,
  };
  
  return {
    state,
    dispatch,
    handlers,
    actions,
  };
}