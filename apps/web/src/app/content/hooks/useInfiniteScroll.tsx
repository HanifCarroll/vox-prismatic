/**
 * Infinite scroll hook for mobile-optimized data loading
 * Uses Intersection Observer for performance
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePerformanceMonitor } from '@/lib/performance-monitor';

interface InfiniteScrollOptions {
  enabled: boolean;
  hasMore: boolean;
  isLoading: boolean;
  isMobile: boolean;
  threshold?: number;
  rootMargin?: string;
  onLoadMore: () => Promise<void> | void;
  loadMoreThreshold?: number;
}

interface InfiniteScrollState {
  isNearBottom: boolean;
  isLoadingMore: boolean;
  totalLoaded: number;
}

/**
 * Hook to handle infinite scroll behavior with intersection observer
 * Optimized for mobile performance and user experience
 */
export function useInfiniteScroll({
  enabled,
  hasMore,
  isLoading,
  isMobile,
  threshold = 0.1,
  rootMargin = '100px',
  onLoadMore,
  loadMoreThreshold = 200,
}: InfiniteScrollOptions) {
  const { trackDataLoad } = usePerformanceMonitor();
  const [state, setState] = useState<InfiniteScrollState>({
    isNearBottom: false,
    isLoadingMore: false,
    totalLoaded: 0,
  });
  
  const loadingRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastLoadTime = useRef<number>(0);
  const loadCount = useRef<number>(0);
  
  // Debounced load more function
  const debouncedLoadMore = useCallback(async () => {
    if (!enabled || !hasMore || isLoading || state.isLoadingMore) {
      return;
    }

    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTime.current;
    if (timeSinceLastLoad < 1000) {
      return;
    }

    setState(prev => ({ ...prev, isLoadingMore: true }));
    lastLoadTime.current = now;
    loadCount.current += 1;

    const startTime = performance.now();
    
    try {
      await onLoadMore();
      
      const duration = performance.now() - startTime;
      
      trackDataLoad({
        strategy: 'client',
        itemCount: 20,
        filteredCount: 20,
        pageSize: 20,
        duration,
      });

      setState(prev => ({ 
        ...prev, 
        isLoadingMore: false,
        totalLoaded: prev.totalLoaded + 20,
      }));
    } catch (error) {
      console.error('[InfiniteScroll] Failed to load more data:', error);
      setState(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [enabled, hasMore, isLoading, state.isLoadingMore, onLoadMore, trackDataLoad]);

  // Set up intersection observer
  useEffect(() => {
    if (!enabled || !isMobile || !loadingRef.current) {
      return;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isIntersecting = entry.isIntersecting;
        
        setState(prev => ({ ...prev, isNearBottom: isIntersecting }));
        
        if (isIntersecting && hasMore && !isLoading && !state.isLoadingMore) {
          debouncedLoadMore();
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observerRef.current.observe(loadingRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, isMobile, hasMore, isLoading, state.isLoadingMore, threshold, rootMargin, debouncedLoadMore]);

  // Loading indicator component
  const LoadingTrigger = useCallback((props: { className?: string }) => {
    const className = props.className || '';
    
    if (!enabled || !isMobile) {
      return null;
    }

    return (
      <div 
        ref={loadingRef}
        className={`flex items-center justify-center py-4 ${className}`}
        role="status"
        aria-label={state.isLoadingMore ? "Loading more content" : "End of content"}
      >
        {hasMore ? (
          state.isLoadingMore ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Loading more...</span>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Scroll for more
            </div>
          )
        ) : (
          <div className="text-sm text-gray-400">
            No more items
          </div>
        )}
      </div>
    );
  }, [enabled, isMobile, hasMore, state.isLoadingMore]);

  return {
    ...state,
    LoadingTrigger,
    isActive: enabled && isMobile,
    stats: {
      totalLoaded: state.totalLoaded,
      loadCount: loadCount.current,
    },
  };
}

/**
 * Higher-order component to add infinite scroll capability to content views
 */
export interface InfiniteScrollWrapperProps {
  children: React.ReactNode;
  enabled: boolean;
  hasMore: boolean;
  isLoading: boolean;
  isMobile: boolean;
  onLoadMore: () => Promise<void> | void;
  className?: string;
}

export function InfiniteScrollWrapper({
  children,
  enabled,
  hasMore,
  isLoading,
  isMobile,
  onLoadMore,
  className = '',
}: InfiniteScrollWrapperProps) {
  const { LoadingTrigger, isActive } = useInfiniteScroll({
    enabled,
    hasMore,
    isLoading,
    isMobile,
    onLoadMore,
  });

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div className={className}>
      {children}
      <LoadingTrigger />
    </div>
  );
}