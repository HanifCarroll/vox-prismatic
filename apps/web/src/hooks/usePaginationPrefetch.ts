import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import { safePrefetch, getNextPageUrl, getPreviousPageUrl } from '@/lib/prefetch-utils';

interface UsePaginationPrefetchOptions {
  currentPage: number;
  totalPages: number;
  currentUrl: string;
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
    currentUrl,
    prefetchAdjacent = true,
    prefetchOnView = true,
    respectConnection = true,
    disabled = false,
  } = options;

  const router = useRouter();

  // Set up intersection observer for prefetching when pagination comes into view
  const { ref: paginationRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    skip: !prefetchOnView || disabled,
  });

  // Prefetch a specific page
  const prefetchPage = useCallback(async (page: number): Promise<boolean> => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return false;
    }

    const url = new URL(currentUrl, window.location.origin);
    url.searchParams.set('page', String(page));
    const targetUrl = url.pathname + url.search;

    return safePrefetch(
      (url) => router.prefetch(url),
      targetUrl,
      { respectConnection }
    );
  }, [currentPage, totalPages, currentUrl, router, respectConnection, disabled]);

  // Prefetch next page
  const prefetchNext = useCallback(async (): Promise<boolean> => {
    const nextUrl = getNextPageUrl(currentUrl, currentPage, totalPages);
    if (!nextUrl) return false;

    return safePrefetch(
      (url) => router.prefetch(url),
      nextUrl,
      { respectConnection }
    );
  }, [currentUrl, currentPage, totalPages, router, respectConnection]);

  // Prefetch previous page
  const prefetchPrevious = useCallback(async (): Promise<boolean> => {
    const prevUrl = getPreviousPageUrl(currentUrl, currentPage);
    if (!prevUrl) return false;

    return safePrefetch(
      (url) => router.prefetch(url),
      prevUrl,
      { respectConnection }
    );
  }, [currentUrl, currentPage, router, respectConnection]);

  // Auto-prefetch adjacent pages when pagination comes into view
  useEffect(() => {
    if (!inView || !prefetchAdjacent || disabled) return;

    const prefetchAdjacent = async () => {
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

    prefetchAdjacent();
  }, [inView, prefetchAdjacent, currentPage, totalPages, prefetchNext, prefetchPrevious, disabled]);

  return {
    paginationRef,
    prefetchPage,
    prefetchNext,
    prefetchPrevious,
  };
}