import { useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type ContentView = 'transcripts' | 'insights' | 'posts';

interface URLStateSyncOptions {
  activeView: ContentView;
  filters: {
    transcripts: {
      statusFilter: string;
      sortBy: string;
    };
    insights: {
      statusFilter: string;
      categoryFilter: string;
      postTypeFilter: string;
      scoreRange: [number, number];
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    };
    posts: {
      statusFilter: string;
      platformFilter: string;
      sortBy: string;
    };
  };
  searchQuery: string;
  currentPage?: number;
  pageSize?: number;
  onStateChange?: () => void;
  onURLStateRestore?: (state: ParsedURLState) => void;
}

interface ParsedURLState {
  view: ContentView;
  searchQuery: string;
  currentPage: number;
  pageSize: number;
  filters: {
    transcripts: {
      statusFilter: string;
      sortBy: string;
    };
    insights: {
      statusFilter: string;
      categoryFilter: string;
      postTypeFilter: string;
      scoreRange: [number, number];
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    };
    posts: {
      statusFilter: string;
      platformFilter: string;
      sortBy: string;
    };
  };
}

/**
 * Default state values for different content views
 */
const DEFAULT_STATE: ParsedURLState = {
  view: 'transcripts',
  searchQuery: '',
  currentPage: 1,
  pageSize: 20,
  filters: {
    transcripts: {
      statusFilter: 'all',
      sortBy: 'createdAt-desc',
    },
    insights: {
      statusFilter: 'all',
      categoryFilter: 'all',
      postTypeFilter: 'all',
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
};

/**
 * Parse URL search parameters into state structure
 */
function parseURLToState(searchParams: URLSearchParams): ParsedURLState {
  const view = (searchParams.get('view') as ContentView) || DEFAULT_STATE.view;
  const searchQuery = searchParams.get('search') || DEFAULT_STATE.searchQuery;
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  // Create base state with defaults
  const state: ParsedURLState = {
    view,
    searchQuery,
    currentPage: Math.max(1, currentPage),
    pageSize: Math.max(1, Math.min(100, pageSize)), // Clamp between 1-100
    filters: JSON.parse(JSON.stringify(DEFAULT_STATE.filters)), // Deep clone defaults
  };

  // Parse view-specific filters
  switch (view) {
    case 'transcripts': {
      state.filters.transcripts.statusFilter = searchParams.get('status') || DEFAULT_STATE.filters.transcripts.statusFilter;
      
      // Handle sort parameter
      const sort = searchParams.get('sort');
      const order = searchParams.get('order') || 'desc';
      if (sort) {
        state.filters.transcripts.sortBy = `${sort}-${order}`;
      }
      break;
    }
    
    case 'insights': {
      state.filters.insights.statusFilter = searchParams.get('status') || DEFAULT_STATE.filters.insights.statusFilter;
      state.filters.insights.categoryFilter = searchParams.get('category') || DEFAULT_STATE.filters.insights.categoryFilter;
      state.filters.insights.postTypeFilter = searchParams.get('postType') || DEFAULT_STATE.filters.insights.postTypeFilter;
      
      // Parse score range
      const scoreMin = parseInt(searchParams.get('scoreMin') || '0', 10);
      const scoreMax = parseInt(searchParams.get('scoreMax') || '20', 10);
      state.filters.insights.scoreRange = [
        Math.max(0, Math.min(20, scoreMin)),
        Math.max(0, Math.min(20, scoreMax))
      ];
      
      // Handle sort parameters
      const sort = searchParams.get('sort') || DEFAULT_STATE.filters.insights.sortBy;
      const order = searchParams.get('order') || DEFAULT_STATE.filters.insights.sortOrder;
      state.filters.insights.sortBy = sort;
      state.filters.insights.sortOrder = order as 'asc' | 'desc';
      break;
    }
    
    case 'posts': {
      state.filters.posts.statusFilter = searchParams.get('status') || DEFAULT_STATE.filters.posts.statusFilter;
      state.filters.posts.platformFilter = searchParams.get('platform') || DEFAULT_STATE.filters.posts.platformFilter;
      
      // Handle sort parameter
      const sort = searchParams.get('sort');
      const order = searchParams.get('order') || 'desc';
      if (sort) {
        state.filters.posts.sortBy = `${sort}-${order}`;
      }
      break;
    }
  }

  return state;
}

/**
 * Hook to synchronize content filters and sorting with URL state
 * Provides bidirectional sync between React state and URL parameters
 */
export function useURLStateSync({
  activeView,
  filters,
  searchQuery,
  currentPage = 1,
  pageSize = 20,
  onStateChange,
  onURLStateRestore,
}: URLStateSyncOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  /**
   * Build URL parameters from current state
   */
  const buildURLParams = useCallback(() => {
    const params = new URLSearchParams();

    // Always include view
    params.set('view', activeView);

    // Add search if present
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    // Add pagination parameters
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }
    if (pageSize !== 20) {
      params.set('pageSize', pageSize.toString());
    }

    // Add view-specific filters
    switch (activeView) {
      case 'transcripts': {
        const { statusFilter, sortBy } = filters.transcripts;
        
        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        
        if (sortBy !== 'createdAt-desc') {
          const [field, order] = sortBy.split('-');
          params.set('sort', field);
          if (order && order !== 'desc') {
            params.set('order', order);
          }
        }
        break;
      }
      
      case 'insights': {
        const { 
          statusFilter, 
          categoryFilter, 
          postTypeFilter,
          scoreRange,
          sortBy, 
          sortOrder 
        } = filters.insights;
        
        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        
        if (categoryFilter !== 'all') {
          params.set('category', categoryFilter);
        }
        
        if (postTypeFilter !== 'all') {
          params.set('postType', postTypeFilter);
        }
        
        // Only add score range if different from defaults
        if (scoreRange[0] !== 0) {
          params.set('scoreMin', scoreRange[0].toString());
        }
        if (scoreRange[1] !== 20) {
          params.set('scoreMax', scoreRange[1].toString());
        }
        
        if (sortBy !== 'totalScore' || sortOrder !== 'desc') {
          params.set('sort', sortBy);
          if (sortOrder !== 'desc') {
            params.set('order', sortOrder);
          }
        }
        break;
      }
      
      case 'posts': {
        const { statusFilter, platformFilter, sortBy } = filters.posts;
        
        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        
        if (platformFilter !== 'all') {
          params.set('platform', platformFilter);
        }
        
        if (sortBy !== 'createdAt-desc') {
          const [field, order] = sortBy.split('-');
          params.set('sort', field);
          if (order && order !== 'desc') {
            params.set('order', order);
          }
        }
        break;
      }
    }

    return params;
  }, [activeView, filters, searchQuery, currentPage, pageSize]);

  /**
   * Update URL with current state
   */
  const updateURL = useCallback((immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const updateFn = () => {
      const params = buildURLParams();
      const newURL = params.toString() ? `?${params.toString()}` : '/content';
      
      // Use shallow routing to avoid full page refresh
      router.push(newURL, { scroll: false });
      
      if (onStateChange) {
        onStateChange();
      }
    };

    if (immediate) {
      updateFn();
    } else {
      // Debounce URL updates for search queries
      debounceTimerRef.current = setTimeout(updateFn, searchQuery ? 300 : 0);
    }
  }, [buildURLParams, router, onStateChange, searchQuery]);

  /**
   * Restore state from URL on initial mount (bidirectional sync)
   */
  useEffect(() => {
    if (isInitialMount.current && onURLStateRestore) {
      const parsedState = parseURLToState(searchParams);
      
      // Only restore if URL contains meaningful state (not just defaults)
      const hasURLState = searchParams.toString().length > 0;
      
      if (hasURLState) {
        onURLStateRestore(parsedState);
      }
      
      isInitialMount.current = false;
      return;
    }
  }, [searchParams, onURLStateRestore]);

  /**
   * Sync state to URL when filters change
   */
  useEffect(() => {
    // Skip the initial mount to avoid unnecessary URL update
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    updateURL();
  }, [activeView, filters, searchQuery, currentPage, pageSize, updateURL]);

  /**
   * Cleanup debounce timer
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Parse URL params to determine if filters are active
   */
  const hasActiveFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Check for any filter params beyond view
    const filterParams = ['status', 'category', 'postType', 'platform', 'sort', 'order', 'scoreMin', 'scoreMax', 'search', 'page', 'pageSize'];
    return filterParams.some(param => params.has(param));
  }, [searchParams]);

  /**
   * Clear all filters and reset URL
   */
  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set('view', activeView);
    // Keep pagination settings when clearing filters
    if (pageSize !== 20) {
      params.set('pageSize', pageSize.toString());
    }
    router.push(`/content?${params.toString()}`, { scroll: false });
  }, [activeView, pageSize, router]);

  return {
    updateURL,
    hasActiveFilters: hasActiveFilters(),
    clearAllFilters,
    parseURLToState: useCallback(() => parseURLToState(searchParams), [searchParams]),
  };
}

// Export types and utilities for external use
export type { ContentView, URLStateSyncOptions, ParsedURLState };
export { parseURLToState, DEFAULT_STATE };