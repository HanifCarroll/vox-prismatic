import { useState, useMemo, useCallback } from 'react';

interface PaginationState {
  currentPage: number;
  pageSize: number;
}

interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
  pageSizeOptions?: number[];
}

interface PaginationResult {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  offset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  pageRange: number[];
  pageSizeOptions: number[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

/**
 * Hook for managing pagination state with comprehensive controls
 * Supports both traditional pagination and infinite scroll patterns
 */
export function usePagination({
  initialPage = 1,
  initialPageSize = 20,
  totalItems = 0,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationOptions): PaginationResult {
  const [state, setState] = useState<PaginationState>({
    currentPage: initialPage,
    pageSize: initialPageSize,
  });

  // Calculate derived values
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / state.pageSize)),
    [totalItems, state.pageSize]
  );

  const offset = useMemo(
    () => (state.currentPage - 1) * state.pageSize,
    [state.currentPage, state.pageSize]
  );

  const hasNextPage = state.currentPage < totalPages;
  const hasPreviousPage = state.currentPage > 1;
  const isFirstPage = state.currentPage === 1;
  const isLastPage = state.currentPage === totalPages;

  // Generate page range for pagination controls (max 7 pages shown)
  const pageRange = useMemo(() => {
    const range: number[] = [];
    const maxVisible = 7;
    const halfVisible = Math.floor(maxVisible / 2);
    
    let start = Math.max(1, state.currentPage - halfVisible);
    let end = Math.min(totalPages, state.currentPage + halfVisible);
    
    // Adjust range if at boundaries
    if (state.currentPage <= halfVisible) {
      end = Math.min(totalPages, maxVisible);
    } else if (state.currentPage >= totalPages - halfVisible) {
      start = Math.max(1, totalPages - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    
    return range;
  }, [state.currentPage, totalPages]);

  // Navigation functions
  const goToPage = useCallback((page: number) => {
    if (page < 1 || page > totalPages) return;
    setState(prev => ({ ...prev, currentPage: page }));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
    }
  }, [hasPreviousPage]);

  const setPageSize = useCallback((size: number) => {
    if (!pageSizeOptions.includes(size)) return;
    
    setState(prev => {
      // Calculate new page to maintain scroll position
      const firstItemIndex = (prev.currentPage - 1) * prev.pageSize;
      const newPage = Math.floor(firstItemIndex / size) + 1;
      
      return {
        pageSize: size,
        currentPage: Math.max(1, newPage),
      };
    });
  }, [pageSizeOptions]);

  const reset = useCallback(() => {
    setState({
      currentPage: initialPage,
      pageSize: initialPageSize,
    });
  }, [initialPage, initialPageSize]);

  return {
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    totalPages,
    totalItems,
    offset,
    hasNextPage,
    hasPreviousPage,
    isFirstPage,
    isLastPage,
    pageRange,
    pageSizeOptions,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    reset,
  };
}

/**
 * Hook for infinite scroll pagination
 * Manages cumulative page loading for continuous scrolling
 */
export function useInfiniteScroll({
  pageSize = 20,
  totalItems = 0,
}: {
  pageSize?: number;
  totalItems?: number;
}) {
  const [loadedPages, setLoadedPages] = useState(1);
  
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasMore = loadedPages < totalPages;
  const itemsLoaded = Math.min(loadedPages * pageSize, totalItems);
  
  const loadMore = useCallback(() => {
    if (hasMore) {
      setLoadedPages(prev => prev + 1);
    }
  }, [hasMore]);
  
  const reset = useCallback(() => {
    setLoadedPages(1);
  }, []);
  
  return {
    loadedPages,
    pageSize,
    totalPages,
    hasMore,
    itemsLoaded,
    loadMore,
    reset,
  };
}