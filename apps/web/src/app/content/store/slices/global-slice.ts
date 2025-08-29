import { StateCreator } from 'zustand';
import type { GlobalSlice, ContentStore } from '../types';

export const createGlobalSlice: StateCreator<
  ContentStore,
  [],
  [],
  GlobalSlice
> = (set, get) => ({
  // State
  searchQuery: '',
  activeView: 'transcripts',
  
  // Actions
  setSearchQuery: (query) => 
    set({ searchQuery: query }),
  
  setActiveView: (view) => 
    set((state) => {
      // Clear selections when changing views
      const newState: Partial<ContentStore> = { activeView: view };
      
      // Clear all selections
      newState.transcripts = { ...state.transcripts, selectedItems: [] };
      newState.insights = { ...state.insights, selectedItems: [] };
      newState.posts = { ...state.posts, selectedItems: [] };
      
      return newState;
    }),
});