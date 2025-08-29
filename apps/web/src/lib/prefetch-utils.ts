/**
 * Prefetch Utilities
 * 
 * Shared utilities for intelligent data prefetching across the application.
 * Handles connection awareness, request deduplication, and error resilience.
 */

// Track active prefetch requests to prevent duplicates
const activePrefetches = new Set<string>();

// Track recently prefetched URLs to avoid repeated requests
const recentPrefetches = new Map<string, number>();
const PREFETCH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if the user has a slow connection or data saver enabled
 */
export function isSlowConnection(): boolean {
  // Check for data saver preference
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      // Respect data saver preference
      if (connection.saveData) {
        return true;
      }
      
      // Consider 2G/slow-2g as slow connections
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        return true;
      }
      
      // Consider very low bandwidth as slow (< 1Mbps)
      if (connection.downlink && connection.downlink < 1) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a URL was recently prefetched
 */
export function wasRecentlyPrefetched(url: string): boolean {
  const lastPrefetch = recentPrefetches.get(url);
  if (!lastPrefetch) return false;
  
  const now = Date.now();
  if (now - lastPrefetch > PREFETCH_CACHE_DURATION) {
    recentPrefetches.delete(url);
    return false;
  }
  
  return true;
}

/**
 * Mark a URL as prefetched
 */
export function markAsPrefetched(url: string): void {
  recentPrefetches.set(url, Date.now());
}

/**
 * Check if a prefetch request is currently active
 */
export function isPrefetchActive(url: string): boolean {
  return activePrefetches.has(url);
}

/**
 * Safe prefetch function with deduplication and error handling
 */
export async function safePrefetch(
  prefetchFn: (url: string) => void,
  url: string,
  options: {
    respectConnection?: boolean;
    force?: boolean;
  } = {}
): Promise<boolean> {
  const { respectConnection = true, force = false } = options;
  
  // Respect slow connections unless forced
  if (respectConnection && !force && isSlowConnection()) {
    return false;
  }
  
  // Check if already prefetched recently
  if (!force && wasRecentlyPrefetched(url)) {
    return false;
  }
  
  // Check if currently prefetching
  if (isPrefetchActive(url)) {
    return false;
  }
  
  try {
    // Mark as active
    activePrefetches.add(url);
    
    // Execute prefetch
    prefetchFn(url);
    
    // Mark as recently prefetched
    markAsPrefetched(url);
    
    return true;
  } catch (error) {
    // Log error but don't throw - prefetching should be invisible to users
    console.warn('Prefetch failed for:', url, error);
    return false;
  } finally {
    // Remove from active set
    activePrefetches.delete(url);
  }
}

/**
 * Build URL with search params
 */
export function buildUrlWithParams(
  pathname: string,
  params: Record<string, string | number | null | undefined>
): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/**
 * Get content view adjacent URLs for tab navigation
 */
export function getAdjacentContentViews(
  currentView: 'transcripts' | 'insights' | 'posts',
  searchParams: Record<string, string | undefined> = {}
): string[] {
  const views = ['transcripts', 'insights', 'posts'] as const;
  const currentIndex = views.indexOf(currentView);
  
  const adjacentViews = [
    views[currentIndex - 1],
    views[currentIndex + 1]
  ].filter(Boolean);
  
  return adjacentViews.map(view => 
    buildUrlWithParams('/content', {
      ...searchParams,
      view,
      page: '1' // Reset to first page for new view
    })
  );
}

/**
 * Get next page URL for pagination
 */
export function getNextPageUrl(
  currentUrl: string,
  currentPage: number,
  totalPages: number
): string | null {
  if (currentPage >= totalPages) return null;
  
  const url = new URL(currentUrl, window.location.origin);
  url.searchParams.set('page', String(currentPage + 1));
  
  return url.pathname + url.search;
}

/**
 * Get previous page URL for pagination
 */
export function getPreviousPageUrl(
  currentUrl: string,
  currentPage: number
): string | null {
  if (currentPage <= 1) return null;
  
  const url = new URL(currentUrl, window.location.origin);
  url.searchParams.set('page', String(currentPage - 1));
  
  return url.pathname + url.search;
}

/**
 * Get dashboard action URLs with filters
 */
export function getDashboardActionUrls(
  counts: Record<string, number>
): Record<string, string> {
  const urls: Record<string, string> = {};
  
  // Insights that need review
  if (counts.insights > 0) {
    urls.insights_review = buildUrlWithParams('/content', {
      view: 'insights',
      status: 'needs_review'
    });
  }
  
  // Draft posts
  if (counts.posts > 0) {
    urls.posts_draft = buildUrlWithParams('/content', {
      view: 'posts',
      status: 'draft'
    });
  }
  
  // Raw transcripts
  if (counts.transcripts > 0) {
    urls.transcripts_raw = buildUrlWithParams('/content', {
      view: 'transcripts',
      status: 'raw'
    });
  }
  
  // Approved posts (for scheduling)
  urls.scheduler = '/scheduler';
  
  return urls;
}

/**
 * Get related data URLs based on entity relationships
 */
export function getRelatedDataUrls(
  entityType: 'transcript' | 'insight' | 'post',
  entityId: string,
  searchParams: Record<string, string | undefined> = {}
): string[] {
  const urls: string[] = [];
  
  switch (entityType) {
    case 'transcript':
      // When viewing transcript, user might check generated insights
      urls.push(buildUrlWithParams('/content', {
        ...searchParams,
        view: 'insights',
        // Could add transcriptId filter if supported
      }));
      break;
      
    case 'insight':
      // When viewing insight, user might check generated posts
      urls.push(buildUrlWithParams('/content', {
        ...searchParams,
        view: 'posts',
        insightId: entityId
      }));
      break;
      
    case 'post':
      // When viewing post, user might check scheduler
      urls.push('/scheduler');
      break;
  }
  
  return urls;
}

/**
 * Debounce function for hover events
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined;
  
  return (...args: Parameters<T>) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Clean up prefetch cache periodically
 */
export function cleanupPrefetchCache(): void {
  const now = Date.now();
  
  for (const [url, timestamp] of recentPrefetches.entries()) {
    if (now - timestamp > PREFETCH_CACHE_DURATION) {
      recentPrefetches.delete(url);
    }
  }
}

// Clean up cache every 5 minutes
setInterval(cleanupPrefetchCache, PREFETCH_CACHE_DURATION);