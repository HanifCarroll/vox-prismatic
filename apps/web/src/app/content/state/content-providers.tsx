"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useTranscriptState, type TranscriptState } from './transcript-state';
import { useInsightState, type InsightState } from './insight-state';
import { usePostState, type PostState } from './post-state';
import { useModalManager, ModalManagerProvider, type ModalState } from './modal-manager';

// Global content state that includes shared state
interface GlobalContentState {
  searchQuery: string;
  activeView: 'transcripts' | 'insights' | 'posts';
}

type GlobalContentAction = 
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_ACTIVE_VIEW'; payload: 'transcripts' | 'insights' | 'posts' };

function globalContentReducer(state: GlobalContentState, action: GlobalContentAction): GlobalContentState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };
    default:
      return state;
  }
}

// Combined content context that provides access to all state managers
interface ContentContextValue {
  // Global state
  searchQuery: string;
  activeView: 'transcripts' | 'insights' | 'posts';
  setSearchQuery: (query: string) => void;
  setActiveView: (view: 'transcripts' | 'insights' | 'posts') => void;
  
  // Content-specific state managers
  transcripts: ReturnType<typeof useTranscriptState>;
  insights: ReturnType<typeof useInsightState>;
  posts: ReturnType<typeof usePostState>;
  modals: ReturnType<typeof useModalManager>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

// Hook to use the content context
export function useContentContext() {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContentContext must be used within ContentProvider');
  }
  return context;
}

// Hook to get the active content state based on current view
export function useActiveContentState() {
  const { activeView, transcripts, insights, posts } = useContentContext();
  
  switch (activeView) {
    case 'transcripts':
      return {
        type: 'transcripts' as const,
        state: transcripts.state,
        actions: transcripts.actions,
        selectionHandlers: transcripts.selectionHandlers,
      };
    case 'insights':
      return {
        type: 'insights' as const,
        state: insights.state,
        actions: insights.actions,
        selectionHandlers: insights.selectionHandlers,
        computedValues: insights.computedValues,
      };
    case 'posts':
      return {
        type: 'posts' as const,
        state: posts.state,
        actions: posts.actions,
        selectionHandlers: posts.selectionHandlers,
        computedValues: posts.computedValues,
      };
    default:
      throw new Error(`Unknown active view: ${activeView}`);
  }
}

// Main content provider that combines all state managers
interface ContentProviderProps {
  children: React.ReactNode;
  initialView?: 'transcripts' | 'insights' | 'posts';
  initialSearch?: string;
  initialFilters?: {
    transcripts?: Partial<TranscriptState>;
    insights?: Partial<InsightState>;
    posts?: Partial<PostState>;
  };
}

export function ContentProvider({ 
  children, 
  initialView = 'transcripts',
  initialSearch = '',
  initialFilters = {}
}: ContentProviderProps) {
  // Global state
  const [globalState, globalDispatch] = React.useReducer(globalContentReducer, {
    searchQuery: initialSearch,
    activeView: initialView,
  });

  // Individual state managers
  const transcripts = useTranscriptState(initialFilters.transcripts);
  const insights = useInsightState(initialFilters.insights);
  const posts = usePostState(initialFilters.posts);
  const modals = useModalManager();

  // Global actions
  const setSearchQuery = React.useCallback((query: string) => {
    globalDispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const setActiveView = React.useCallback((view: 'transcripts' | 'insights' | 'posts') => {
    globalDispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
    
    // Clear selections when changing views
    transcripts.actions.clearSelection();
    insights.actions.clearSelection();
    posts.actions.clearSelection();
  }, [transcripts.actions, insights.actions, posts.actions]);

  // Handle keyboard shortcuts for modals
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      modals.handleKeyDown(event);
    };

    if (modals.modalState.hasActiveModals) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [modals.modalState.hasActiveModals, modals.handleKeyDown]);

  const contextValue: ContentContextValue = {
    // Global state
    searchQuery: globalState.searchQuery,
    activeView: globalState.activeView,
    setSearchQuery,
    setActiveView,
    
    // State managers
    transcripts,
    insights,
    posts,
    modals,
  };

  return (
    <ContentContext.Provider value={contextValue}>
      {children}
    </ContentContext.Provider>
  );
}

// Specialized providers for individual content types (optional)
// These can be used for testing or isolated component development
export function TranscriptProvider({ 
  children, 
  initialState 
}: { 
  children: (props: ReturnType<typeof useTranscriptState>) => React.ReactElement;
  initialState?: Partial<TranscriptState>;
}) {
  const transcripts = useTranscriptState(initialState);
  
  return (
    <div data-content-type="transcripts">
      {children(transcripts)}
    </div>
  );
}

export function InsightProvider({ 
  children, 
  initialState 
}: { 
  children: (props: ReturnType<typeof useInsightState>) => React.ReactElement;
  initialState?: Partial<InsightState>;
}) {
  const insights = useInsightState(initialState);
  
  return (
    <div data-content-type="insights">
      {children(insights)}
    </div>
  );
}

export function PostProvider({ 
  children, 
  initialState 
}: { 
  children: (props: ReturnType<typeof usePostState>) => React.ReactElement;
  initialState?: Partial<PostState>;
}) {
  const posts = usePostState(initialState);
  
  return (
    <div data-content-type="posts">
      {children(posts)}
    </div>
  );
}

// Higher-order component for easier integration
export function withContentState<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithContentStateComponent(props: P) {
    const contentContext = useContentContext();
    
    return (
      <Component 
        {...props} 
        contentContext={contentContext}
      />
    );
  };
}

// Hook for content-specific operations
export function useContentOperations(contentType: 'transcripts' | 'insights' | 'posts') {
  const { transcripts, insights, posts, searchQuery } = useContentContext();
  
  const contentState = React.useMemo(() => {
    switch (contentType) {
      case 'transcripts': return transcripts;
      case 'insights': return insights;
      case 'posts': return posts;
    }
  }, [contentType, transcripts, insights, posts]);

  // Common operations that work across all content types
  const operations = React.useMemo(() => ({
    // Filter operations
    clearAllFilters: contentState.actions.resetFilters,
    hasActiveFilters: () => {
      if ('computedValues' in contentState) {
        return contentState.computedValues.hasActiveFilters();
      }
      // For transcripts (no computedValues), check manually
      return contentState.state.statusFilter !== 'all' || searchQuery !== '';
    },
    
    // Selection operations
    clearSelection: contentState.actions.clearSelection,
    hasSelection: contentState.state.selectedItems.length > 0,
    selectedCount: contentState.state.selectedItems.length,
    
    // UI operations
    toggleFilters: contentState.actions.toggleFilters,
    isFiltersVisible: contentState.state.showFilters,
  }), [contentState, searchQuery]);

  return {
    state: contentState.state,
    actions: contentState.actions,
    selectionHandlers: contentState.selectionHandlers,
    operations,
  };
}