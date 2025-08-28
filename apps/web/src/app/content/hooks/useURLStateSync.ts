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
  };
}