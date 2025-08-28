import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { PostView } from '@/types';

// Post-specific state
export interface PostState {
  // Filters
  statusFilter: string;
  platformFilter: string;
  sortBy: string;
  
  // Selection
  selectedItems: string[];
  
  // UI State
  showFilters: boolean;
  columnVisibility: string[];
}

// Post-specific actions
export type PostAction =
  | { type: 'SET_STATUS_FILTER'; payload: string }
  | { type: 'SET_PLATFORM_FILTER'; payload: string }
  | { type: 'SET_SORT'; payload: string }
  | { type: 'SET_SELECTED_ITEMS'; payload: string[] }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'DESELECT_ITEM'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_FILTERS' }
  | { type: 'SET_COLUMN_VISIBILITY'; payload: { columnId: string; visible: boolean } }
  | { type: 'RESET_FILTERS' };

const initialPostState: PostState = {
  statusFilter: 'all',
  platformFilter: 'all',
  sortBy: 'createdAt-desc',
  selectedItems: [],
  showFilters: false,
  columnVisibility: ['title', 'platform', 'status', 'createdAt', 'scheduledFor', 'characterCount', 'insightTitle'],
};

function postReducer(state: PostState, action: PostAction): PostState {
  switch (action.type) {
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    
    case 'SET_PLATFORM_FILTER':
      return { ...state, platformFilter: action.payload };
    
    case 'SET_SORT':
      return { ...state, sortBy: action.payload };
    
    case 'SET_SELECTED_ITEMS':
      return { ...state, selectedItems: action.payload };
    
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
    
    case 'CLEAR_SELECTION':
      return { ...state, selectedItems: [] };
    
    case 'TOGGLE_FILTERS':
      return { ...state, showFilters: !state.showFilters };
    
    case 'SET_COLUMN_VISIBILITY':
      const { columnId, visible } = action.payload;
      const newColumns = visible 
        ? [...state.columnVisibility, columnId]
        : state.columnVisibility.filter(col => col !== columnId);
      return { ...state, columnVisibility: newColumns };
    
    case 'RESET_FILTERS':
      return { 
        ...state, 
        statusFilter: 'all', 
        platformFilter: 'all',
        sortBy: 'createdAt-desc',
        selectedItems: [] 
      };
    
    default:
      return state;
  }
}

// Hook for post state management
export function usePostState(initialFilters?: Partial<PostState>) {
  const [state, dispatch] = useReducer(
    postReducer,
    { ...initialPostState, ...initialFilters }
  );

  // Memoized action creators
  const actions = useMemo(() => ({
    setStatusFilter: (filter: string) => 
      dispatch({ type: 'SET_STATUS_FILTER', payload: filter }),
    
    setPlatformFilter: (filter: string) => 
      dispatch({ type: 'SET_PLATFORM_FILTER', payload: filter }),
    
    setSort: (sort: string) => 
      dispatch({ type: 'SET_SORT', payload: sort }),
    
    setSelectedItems: (items: string[]) => 
      dispatch({ type: 'SET_SELECTED_ITEMS', payload: items }),
    
    selectItem: (id: string) => 
      dispatch({ type: 'SELECT_ITEM', payload: id }),
    
    deselectItem: (id: string) => 
      dispatch({ type: 'DESELECT_ITEM', payload: id }),
    
    clearSelection: () => 
      dispatch({ type: 'CLEAR_SELECTION' }),
    
    toggleFilters: () => 
      dispatch({ type: 'TOGGLE_FILTERS' }),
    
    setColumnVisibility: (columnId: string, visible: boolean) => 
      dispatch({ type: 'SET_COLUMN_VISIBILITY', payload: { columnId, visible } }),
    
    resetFilters: () => 
      dispatch({ type: 'RESET_FILTERS' }),
  }), []);

  // Selection handlers
  const selectionHandlers = useMemo(() => ({
    handleSelect: (id: string, selected: boolean) => {
      if (selected) {
        actions.selectItem(id);
      } else {
        actions.deselectItem(id);
      }
    },
    
    handleSelectAll: (selected: boolean, allItems: PostView[]) => {
      if (selected) {
        actions.setSelectedItems(allItems.map(item => item.id));
      } else {
        actions.clearSelection();
      }
    },
    
    handleSelectFiltered: (filteredItems: PostView[]) => {
      actions.setSelectedItems(filteredItems.map(item => item.id));
    },
    
    handleSelectByStatus: (status: string, allItems: PostView[]) => {
      const statusItems = allItems.filter(item => item.status === status);
      actions.setSelectedItems(statusItems.map(item => item.id));
    },
    
    handleSelectByPlatform: (platform: string, allItems: PostView[]) => {
      const platformItems = allItems.filter(item => item.platform === platform);
      actions.setSelectedItems(platformItems.map(item => item.id));
    },
    
    handleInvertSelection: (allItems: PostView[]) => {
      const currentSelected = new Set(state.selectedItems);
      const inverted = allItems
        .filter(item => !currentSelected.has(item.id))
        .map(item => item.id);
      actions.setSelectedItems(inverted);
    },
    
    handleSelectDateRange: (start: Date, end: Date, allItems: PostView[]) => {
      const rangeItems = allItems.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= start && itemDate <= end;
      });
      actions.setSelectedItems(rangeItems.map(item => item.id));
    },
  }), [state.selectedItems, actions]);

  // Computed values
  const computedValues = useMemo(() => ({
    // Parse sort components
    sortField: state.sortBy.split('-')[0],
    sortOrder: state.sortBy.split('-')[1] as 'asc' | 'desc',
    
    // Active filter count
    activeFilterCount: [
      state.statusFilter !== 'all',
      state.platformFilter !== 'all',
    ].filter(Boolean).length,
    
    // Has active filters
    hasActiveFilters: function() { return this.activeFilterCount > 0; },
  }), [state.statusFilter, state.platformFilter, state.sortBy]);

  return {
    state,
    actions,
    selectionHandlers,
    computedValues,
    dispatch, // For advanced usage
  };
}

// Context setup (optional - for complex component trees)
export const PostStateContext = createContext<{
  state: PostState;
  actions: ReturnType<typeof usePostState>['actions'];
  selectionHandlers: ReturnType<typeof usePostState>['selectionHandlers'];
  computedValues: ReturnType<typeof usePostState>['computedValues'];
} | null>(null);

export function usePostStateContext() {
  const context = useContext(PostStateContext);
  if (!context) {
    throw new Error('usePostStateContext must be used within PostStateProvider');
  }
  return context;
}