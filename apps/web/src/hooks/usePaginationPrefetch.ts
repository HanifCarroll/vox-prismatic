import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { safePrefetch, getNextPageUrl, getPreviousPageUrl } from '@/lib/prefetch-utils';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api';

interface UsePaginationPrefetchOptions {
  currentPage: number;
  totalPages: number;
  contentType: 'transcripts' | 'insights' | 'posts' | 'scheduledEvents';
  currentFilters: Record<string, any>;
  prefetchAdjacent?: boolean;
  prefetchOnView?: boolean;
  respectConnection?: boolean;
  disabled?: boolean;
}

interface UsePaginationPrefetchReturn {
  paginationRef: (node?: Element | null) => void;
  prefetchPage: (page: number) => Promise<boolean>;
  prefetchNext: () => Promise<boolean>;
  prefetchPrevious: () => Promise<boolean>;
}

export function usePaginationPrefetch(
  options: UsePaginationPrefetchOptions
): UsePaginationPrefetchReturn {
  const {
    currentPage,
    totalPages,
    contentType,
    currentFilters,
    prefetchAdjacent = true,
    prefetchOnView = true,
    respectConnection = true,
    disabled = false,
  } = options;

  const queryClient = useQueryClient();

  // Set up intersection observer for prefetching when pagination comes into view
  const { ref: paginationRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    skip: !prefetchOnView || disabled,
  });

  // Create prefetch function for specific content type
  const createPrefetchFn = useCallback((filters: Record<string, any>) => {
    return async () => {
      switch (contentType) {
        case 'transcripts':
          await queryClient.prefetchQuery({
            queryKey: queryKeys.transcripts.list(filters),
            queryFn: () => api.transcripts.getTranscripts(filters),
            staleTime: 30 * 1000,
          });
          break;
        case 'insights':
          await queryClient.prefetchQuery({
            queryKey: queryKeys.insights.list(filters),
            queryFn: () => api.insights.getInsights(filters),
            staleTime: 30 * 1000,
          });
          break;
        case 'posts':
          await queryClient.prefetchQuery({
            queryKey: queryKeys.posts.list(filters),
            queryFn: () => api.posts.getPosts(filters),
            staleTime: 30 * 1000,
          });
          break;
        case 'scheduledEvents':
          await queryClient.prefetchQuery({
            queryKey: queryKeys.scheduledEvents.list(filters),
            queryFn: () => api.scheduler.getSchedulerEvents(filters),
            staleTime: 30 * 1000,
          });
          break;
      }
    };
  }, [contentType, queryClient]);

  // Prefetch a specific page
  const prefetchPage = useCallback(async (page: number): Promise<boolean> => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return false;
    }

    const pageFilters = { ...currentFilters, page };
    const prefetchFn = createPrefetchFn(pageFilters);
    const cacheKey = `${contentType}-page-${page}-${JSON.stringify(currentFilters)}`;

    return safePrefetch(
      () => prefetchFn(),
      cacheKey,
      { respectConnection }
    );
  }, [currentPage, totalPages, currentFilters, contentType, createPrefetchFn, respectConnection, disabled]);

  // Prefetch next page
  const prefetchNext = useCallback(async (): Promise<boolean> => {
    if (currentPage >= totalPages) return false;
    return prefetchPage(currentPage + 1);
  }, [currentPage, totalPages, prefetchPage]);

  // Prefetch previous page
  const prefetchPrevious = useCallback(async (): Promise<boolean> => {
    if (currentPage <= 1) return false;
    return prefetchPage(currentPage - 1);
  }, [currentPage, prefetchPage]);

  // Auto-prefetch adjacent pages when pagination comes into view
  useEffect(() => {
    if (!inView || !prefetchAdjacent || disabled) return;

    const prefetchAdjacentPages = async () => {
      // Prefetch next page (higher priority)
      if (currentPage < totalPages) {
        await prefetchNext();
      }
      
      // Prefetch previous page (lower priority)
      if (currentPage > 1) {
        // Small delay to prioritize next page
        setTimeout(() => {
          prefetchPrevious();
        }, 100);
      }
    };

    prefetchAdjacentPages();
  }, [inView, prefetchAdjacent, currentPage, totalPages, prefetchNext, prefetchPrevious, disabled]);

  return {
    paginationRef,
    prefetchPage,
    prefetchNext,
    prefetchPrevious,
  };
}