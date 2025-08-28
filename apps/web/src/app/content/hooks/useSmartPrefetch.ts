/**
 * Smart prefetching hook for adjacent pages
 * Preloads data when user approaches page boundaries
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePerformanceMonitor } from '@/lib/performance-monitor';

interface SmartPrefetchOptions {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  strategy: 'client' | 'server' | 'hybrid';
  shouldPaginate: boolean;
  enabled: boolean;
  queryKeyFactory: (page: number, offset: number) => any[];
  prefetchFn: (page: number, offset: number) => Promise<any>;
  prefetchDistance?: number; // How many pages ahead to prefetch
  prefetchDelayMs?: number; // Delay before prefetching
}

/**
 * Hook to intelligently prefetch adjacent pages based on user behavior
 * and pagination state. Only active when server-side pagination is used.
 */
export function useSmartPrefetch({
  currentPage,
  totalPages,
  pageSize,
  strategy,
  shouldPaginate,
  enabled,
  queryKeyFactory,
  prefetchFn,
  prefetchDistance = 2,
  prefetchDelayMs = 300,
}: SmartPrefetchOptions) {
  const queryClient = useQueryClient();
  const { trackDataLoad } = usePerformanceMonitor();
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPrefetchedPages = useRef<Set<number>>(new Set());
  
  useEffect(() => {
    // Only prefetch for server-side pagination
    if (!enabled || !shouldPaginate || strategy === 'client') {
      return;
    }

    // Clear any existing timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    prefetchTimeoutRef.current = setTimeout(async () => {
      const pagesToPrefetch: number[] = [];
      
      // Calculate which pages to prefetch
      for (let i = 1; i <= prefetchDistance; i++) {
        // Prefetch next pages
        const nextPage = currentPage + i;
        if (nextPage <= totalPages && !lastPrefetchedPages.current.has(nextPage)) {
          pagesToPrefetch.push(nextPage);
        }
        
        // Prefetch previous pages (but with lower priority)
        if (i <= 1) { // Only prefetch 1 page behind
          const prevPage = currentPage - i;
          if (prevPage >= 1 && !lastPrefetchedPages.current.has(prevPage)) {
            pagesToPrefetch.push(prevPage);
          }
        }
      }

      // Prefetch pages in parallel
      const prefetchPromises = pagesToPrefetch.map(async (page) => {
        const offset = (page - 1) * pageSize;
        const queryKey = queryKeyFactory(page, offset);
        
        try {
          // Check if data is already cached
          const existingData = queryClient.getQueryData(queryKey);
          if (existingData) {
            return;
          }

          // Prefetch the data
          const startTime = performance.now();
          await queryClient.prefetchQuery({
            queryKey,
            queryFn: () => prefetchFn(page, offset),
            staleTime: 2 * 60 * 1000, // 2 minutes - shorter for prefetched data
            gcTime: 5 * 60 * 1000, // 5 minutes
          });
          
          const duration = performance.now() - startTime;
          
          // Track prefetch performance
          trackDataLoad({
            strategy: 'server',
            itemCount: pageSize,
            filteredCount: pageSize,
            pageSize,
            duration,
          });

          // Mark as prefetched
          lastPrefetchedPages.current.add(page);
          
          console.log(`[SmartPrefetch] Prefetched page ${page} in ${duration.toFixed(2)}ms`);
        } catch (error) {
          console.warn(`[SmartPrefetch] Failed to prefetch page ${page}:`, error);
        }
      });

      await Promise.all(prefetchPromises);
    }, prefetchDelayMs);

    // Cleanup timeout on unmount
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [
    currentPage,
    totalPages,
    pageSize,
    strategy,
    shouldPaginate,
    enabled,
    prefetchDistance,
    prefetchDelayMs,
    queryClient,
    queryKeyFactory,
    prefetchFn,
    trackDataLoad,
  ]);

  // Clean up prefetch cache when page changes significantly
  useEffect(() => {
    const maxCacheSize = prefetchDistance * 4; // Keep more pages in memory
    
    if (lastPrefetchedPages.current.size > maxCacheSize) {
      // Remove pages that are far from current page
      const pagesToRemove = Array.from(lastPrefetchedPages.current).filter(
        page => Math.abs(page - currentPage) > prefetchDistance * 2
      );
      
      pagesToRemove.forEach(page => {
        lastPrefetchedPages.current.delete(page);
        
        // Optionally remove from query cache to free memory
        const offset = (page - 1) * pageSize;
        const queryKey = queryKeyFactory(page, offset);
        queryClient.removeQueries({ queryKey, exact: true });
      });
      
      if (pagesToRemove.length > 0) {
        console.log(`[SmartPrefetch] Cleaned up ${pagesToRemove.length} prefetched pages`);
      }
    }
  }, [currentPage, prefetchDistance, pageSize, queryClient, queryKeyFactory]);

  // Return prefetch stats for debugging
  return {
    prefetchedPages: Array.from(lastPrefetchedPages.current),
    isActive: enabled && shouldPaginate && strategy !== 'client',
  };
}

/**
 * Utility function to create query key factories for different content types
 */
export const createPrefetchKeyFactory = {
  transcripts: (baseFilters: any) => (page: number, offset: number) => [
    'transcripts', 
    'list', 
    { 
      ...baseFilters, 
      limit: baseFilters.limit || 20,
      offset,
      page // Include page for cache key uniqueness
    }
  ],
  
  insights: (baseFilters: any) => (page: number, offset: number) => [
    'insights', 
    'list', 
    { 
      ...baseFilters, 
      limit: baseFilters.limit || 20,
      offset,
      page
    }
  ],
  
  posts: (baseFilters: any) => (page: number, offset: number) => [
    'posts', 
    'list', 
    { 
      ...baseFilters, 
      limit: baseFilters.limit || 20,
      offset,
      page
    }
  ],
};