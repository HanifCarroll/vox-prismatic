import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { InsightView } from '@/types';

// Insight-specific state
export interface InsightState {
  // Filters
  statusFilter: string;
  categoryFilter: string;
  postTypeFilter: string;
  scoreRange: [number, number];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // Selection
  selectedItems: string[];
  
  // UI State
  showFilters: boolean;
  columnVisibility: string[];
}

// Insight-specific actions
export type InsightAction =
  | { type: 'SET_STATUS_FILTER'; payload: string }
  | { type: 'SET_CATEGORY_FILTER'; payload: string }
  | { type: 'SET_POST_TYPE_FILTER'; payload: string }
  | { type: 'SET_SCORE_RANGE'; payload: [number, number] }
  | { type: 'SET_SORT'; payload: { field: string; order: 'asc' | 'desc' } }
  | { type: 'SET_SELECTED_ITEMS'; payload: string[] }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'DESELECT_ITEM'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_FILTERS' }
  | { type: 'SET_COLUMN_VISIBILITY'; payload: { columnId: string; visible: boolean } }
  | { type: 'RESET_FILTERS' };

const initialInsightState: InsightState = {
  statusFilter: 'all',
  categoryFilter: 'all',
  postTypeFilter: 'all',
  scoreRange: [0, 20],
  sortBy: 'totalScore',
  sortOrder: 'desc',
  selectedItems: [],
  showFilters: false,
  columnVisibility: ['title', 'type', 'category', 'totalScore', 'status', 'createdAt'],
};

function insightReducer(state: InsightState, action: InsightAction): InsightState {
  switch (action.type) {
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    
    case 'SET_CATEGORY_FILTER':
      return { ...state, categoryFilter: action.payload };
    
    case 'SET_POST_TYPE_FILTER':
      return { ...state, postTypeFilter: action.payload };
    
    case 'SET_SCORE_RANGE':
      return { ...state, scoreRange: action.payload };
    
    case 'SET_SORT':
      return { 
        ...state, 
        sortBy: action.payload.field,
        sortOrder: action.payload.order 
      };
    
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
        categoryFilter: 'all', 
        postTypeFilter: 'all',
        scoreRange: [0, 20],
        sortBy: 'totalScore',
        sortOrder: 'desc',
        selectedItems: [] 
      };
    
    default:
      return state;
  }
}

// Hook for insight state management
export function useInsightState(initialFilters?: Partial<InsightState>) {
  const [state, dispatch] = useReducer(
    insightReducer,
    { ...initialInsightState, ...initialFilters }
  );

  // Memoized action creators
  const actions = useMemo(() => ({
    setStatusFilter: (filter: string) => 
      dispatch({ type: 'SET_STATUS_FILTER', payload: filter }),
    
    setCategoryFilter: (filter: string) => 
      dispatch({ type: 'SET_CATEGORY_FILTER', payload: filter }),
    
    setPostTypeFilter: (filter: string) => 
      dispatch({ type: 'SET_POST_TYPE_FILTER', payload: filter }),
    
    setScoreRange: (range: [number, number]) => 
      dispatch({ type: 'SET_SCORE_RANGE', payload: range }),
    
    setSort: (field: string, order: 'asc' | 'desc') => 
      dispatch({ type: 'SET_SORT', payload: { field, order } }),
    
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
    
    handleSelectAll: (selected: boolean, allItems: InsightView[]) => {
      if (selected) {
        actions.setSelectedItems(allItems.map(item => item.id));
      } else {
        actions.clearSelection();
      }
    },
    
    handleSelectFiltered: (filteredItems: InsightView[]) => {
      actions.setSelectedItems(filteredItems.map(item => item.id));
    },
    
    handleSelectByStatus: (status: string, allItems: InsightView[]) => {
      const statusItems = allItems.filter(item => item.status === status);
      actions.setSelectedItems(statusItems.map(item => item.id));
    },
    
    handleSelectByCategory: (category: string, allItems: InsightView[]) => {
      const categoryItems = allItems.filter(item => item.category === category);
      actions.setSelectedItems(categoryItems.map(item => item.id));
    },
    
    handleInvertSelection: (allItems: InsightView[]) => {
      const currentSelected = new Set(state.selectedItems);
      const inverted = allItems
        .filter(item => !currentSelected.has(item.id))
        .map(item => item.id);
      actions.setSelectedItems(inverted);
    },
  }), [state.selectedItems, actions]);

  // Computed values
  const computedValues = useMemo(() => ({
    // Combined sort string for compatibility with existing components
    sortString: `${state.sortBy}-${state.sortOrder}`,
    
    // Active filter count
    activeFilterCount: [
      state.statusFilter !== 'all',
      state.categoryFilter !== 'all', 
      state.postTypeFilter !== 'all',
      state.scoreRange[0] !== 0 || state.scoreRange[1] !== 20,
    ].filter(Boolean).length,
    
    // Has active filters
    hasActiveFilters: function() { return this.activeFilterCount > 0; },
  }), [state.statusFilter, state.categoryFilter, state.postTypeFilter, state.scoreRange, state.sortBy, state.sortOrder]);

  return {
    state,
    actions,
    selectionHandlers,
    computedValues,
    dispatch, // For advanced usage
  };
}

// Context setup (optional - for complex component trees)
export const InsightStateContext = createContext<{
  state: InsightState;
  actions: ReturnType<typeof useInsightState>['actions'];
  selectionHandlers: ReturnType<typeof useInsightState>['selectionHandlers'];
  computedValues: ReturnType<typeof useInsightState>['computedValues'];
} | null>(null);

export function useInsightStateContext() {
  const context = useContext(InsightStateContext);
  if (!context) {
    throw new Error('useInsightStateContext must be used within InsightStateProvider');
  }
  return context;
}