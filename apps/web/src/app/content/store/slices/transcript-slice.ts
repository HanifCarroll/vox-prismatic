import { StateCreator } from 'zustand';
import type { TranscriptSlice, ContentStore } from '../types';
import type { TranscriptView } from '@/types';

const initialTranscriptState = {
  statusFilter: 'all',
  sortBy: 'createdAt-desc',
  selectedItems: [],
  showFilters: false,
  columnVisibility: ['title', 'source', 'wordCount', 'status', 'createdAt'],
};

export const createTranscriptSlice: StateCreator<
  ContentStore,
  [],
  [],
  TranscriptSlice
> = (set, get) => ({
  // State
  transcripts: initialTranscriptState,
  
  // Actions
  setTranscriptStatusFilter: (filter) =>
    set((state) => ({
      transcripts: { ...state.transcripts, statusFilter: filter }
    })),
  
  setTranscriptSort: (sort) =>
    set((state) => ({
      transcripts: { ...state.transcripts, sortBy: sort }
    })),
  
  setTranscriptSelectedItems: (items) =>
    set((state) => ({
      transcripts: { ...state.transcripts, selectedItems: items }
    })),
  
  selectTranscriptItem: (id) =>
    set((state) => ({
      transcripts: {
        ...state.transcripts,
        selectedItems: [...state.transcripts.selectedItems, id]
      }
    })),
  
  deselectTranscriptItem: (id) =>
    set((state) => ({
      transcripts: {
        ...state.transcripts,
        selectedItems: state.transcripts.selectedItems.filter(item => item !== id)
      }
    })),
  
  clearTranscriptSelection: () =>
    set((state) => ({
      transcripts: { ...state.transcripts, selectedItems: [] }
    })),
  
  toggleTranscriptFilters: () =>
    set((state) => ({
      transcripts: { ...state.transcripts, showFilters: !state.transcripts.showFilters }
    })),
  
  setTranscriptColumnVisibility: (columnId, visible) =>
    set((state) => {
      const newColumns = visible
        ? [...state.transcripts.columnVisibility, columnId]
        : state.transcripts.columnVisibility.filter(col => col !== columnId);
      return {
        transcripts: { ...state.transcripts, columnVisibility: newColumns }
      };
    }),
  
  resetTranscriptFilters: () =>
    set((state) => ({
      transcripts: {
        ...state.transcripts,
        statusFilter: 'all',
        sortBy: 'createdAt-desc',
        selectedItems: []
      }
    })),
  
  // Selection handlers
  handleTranscriptSelect: (id, selected) => {
    const { selectTranscriptItem, deselectTranscriptItem } = get();
    if (selected) {
      selectTranscriptItem(id);
    } else {
      deselectTranscriptItem(id);
    }
  },
  
  handleTranscriptSelectAll: (selected, allItems) => {
    const { setTranscriptSelectedItems, clearTranscriptSelection } = get();
    if (selected) {
      setTranscriptSelectedItems(allItems.map(item => item.id));
    } else {
      clearTranscriptSelection();
    }
  },
  
  handleTranscriptSelectFiltered: (filteredItems) => {
    const { setTranscriptSelectedItems } = get();
    setTranscriptSelectedItems(filteredItems.map(item => item.id));
  },
  
  handleTranscriptSelectByStatus: (status, allItems) => {
    const { setTranscriptSelectedItems } = get();
    const statusItems = allItems.filter(item => item.status === status);
    setTranscriptSelectedItems(statusItems.map(item => item.id));
  },
  
  handleTranscriptInvertSelection: (allItems) => {
    const { transcripts, setTranscriptSelectedItems } = get();
    const currentSelected = new Set(transcripts.selectedItems);
    const inverted = allItems
      .filter(item => !currentSelected.has(item.id))
      .map(item => item.id);
    setTranscriptSelectedItems(inverted);
  },
});