import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { TranscriptView } from '@/types';

// Transcript-specific state
export interface TranscriptState {
  // Filters
  statusFilter: string;
  sortBy: string;
  
  // Selection
  selectedItems: string[];
  
  // UI State
  showFilters: boolean;
  columnVisibility: string[];
}

// Transcript-specific actions
export type TranscriptAction =
  | { type: 'SET_STATUS_FILTER'; payload: string }
  | { type: 'SET_SORT'; payload: string }
  | { type: 'SET_SELECTED_ITEMS'; payload: string[] }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'DESELECT_ITEM'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_FILTERS' }
  | { type: 'SET_COLUMN_VISIBILITY'; payload: { columnId: string; visible: boolean } }
  | { type: 'RESET_FILTERS' };

const initialTranscriptState: TranscriptState = {
  statusFilter: 'all',
  sortBy: 'createdAt-desc',
  selectedItems: [],
  showFilters: false,
  columnVisibility: ['title', 'source', 'wordCount', 'status', 'createdAt'],
};

function transcriptReducer(state: TranscriptState, action: TranscriptAction): TranscriptState {
  switch (action.type) {
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    
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
        sortBy: 'createdAt-desc',
        selectedItems: [] 
      };
    
    default:
      return state;
  }
}

// Hook for transcript state management
export function useTranscriptState(initialFilters?: Partial<TranscriptState>) {
  const [state, dispatch] = useReducer(
    transcriptReducer,
    { ...initialTranscriptState, ...initialFilters }
  );

  // Memoized action creators
  const actions = useMemo(() => ({
    setStatusFilter: (filter: string) => 
      dispatch({ type: 'SET_STATUS_FILTER', payload: filter }),
    
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
    
    handleSelectAll: (selected: boolean, allItems: TranscriptView[]) => {
      if (selected) {
        actions.setSelectedItems(allItems.map(item => item.id));
      } else {
        actions.clearSelection();
      }
    },
    
    handleSelectFiltered: (filteredItems: TranscriptView[]) => {
      actions.setSelectedItems(filteredItems.map(item => item.id));
    },
    
    handleSelectByStatus: (status: string, allItems: TranscriptView[]) => {
      const statusItems = allItems.filter(item => item.status === status);
      actions.setSelectedItems(statusItems.map(item => item.id));
    },
    
    handleInvertSelection: (allItems: TranscriptView[]) => {
      const currentSelected = new Set(state.selectedItems);
      const inverted = allItems
        .filter(item => !currentSelected.has(item.id))
        .map(item => item.id);
      actions.setSelectedItems(inverted);
    },
  }), [state.selectedItems, actions]);

  return {
    state,
    actions,
    selectionHandlers,
    dispatch, // For advanced usage
  };
}

// Context setup (optional - for complex component trees)
export const TranscriptStateContext = createContext<{
  state: TranscriptState;
  actions: ReturnType<typeof useTranscriptState>['actions'];
  selectionHandlers: ReturnType<typeof useTranscriptState>['selectionHandlers'];
} | null>(null);

export function useTranscriptStateContext() {
  const context = useContext(TranscriptStateContext);
  if (!context) {
    throw new Error('useTranscriptStateContext must be used within TranscriptStateProvider');
  }
  return context;
}