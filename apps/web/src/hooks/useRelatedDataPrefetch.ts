import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EntityType, ContentView } from '@content-creation/types';
import { safePrefetch, getAdjacentContentViews, getRelatedDataUrls, getDashboardActionUrls } from '@/lib/prefetch-utils';

// Helper to convert EntityType enum to string for URL building
function entityTypeToString(entityType: EntityType): 'transcript' | 'insight' | 'post' {
  switch (entityType) {
    case EntityType.TRANSCRIPT:
      return 'transcript';
    case EntityType.INSIGHT:
      return 'insight';
    case EntityType.POST:
      return 'post';
    default:
      return 'post';
  }
}

// Helper to convert ContentView enum to string for URL building
function contentViewToString(contentView: ContentView): 'transcripts' | 'insights' | 'posts' {
  switch (contentView) {
    case ContentView.TRANSCRIPTS:
      return 'transcripts';
    case ContentView.INSIGHTS:
      return 'insights';
    case ContentView.POSTS:
      return 'posts';
    default:
      return 'transcripts';
  }
}

interface UseRelatedDataPrefetchOptions {
  currentView?: ContentView;
  entityType?: EntityType;
  entityId?: string;
  searchParams?: Record<string, string | undefined>;
  counts?: Record<string, number>;
  autoMode?: boolean;
  respectConnection?: boolean;
  disabled?: boolean;
}

interface UseRelatedDataPrefetchReturn {
  prefetchAdjacentViews: () => Promise<void>;
  prefetchRelatedData: () => Promise<void>;
  prefetchDashboardActions: () => Promise<void>;
  prefetchWorkflowNext: () => Promise<void>;
}

export function useRelatedDataPrefetch(
  options: UseRelatedDataPrefetchOptions = {}
): UseRelatedDataPrefetchReturn {
  const {
    currentView,
    entityType,
    entityId,
    searchParams = {},
    counts = {},
    autoMode = true,
    respectConnection = true,
    disabled = false,
  } = options;

  const router = useRouter();

  // Prefetch adjacent content views (for tab navigation)
  const prefetchAdjacentViews = useCallback(async () => {
    if (disabled || !currentView) return;

    const currentViewString = contentViewToString(currentView);
    const adjacentUrls = getAdjacentContentViews(currentViewString, searchParams);
    
    // Prefetch adjacent views with a slight delay between them
    for (let i = 0; i < adjacentUrls.length; i++) {
      setTimeout(() => {
        safePrefetch(
          (url) => router.prefetch(url),
          adjacentUrls[i],
          { respectConnection }
        );
      }, i * 50); // Stagger by 50ms
    }
  }, [currentView, searchParams, router, respectConnection, disabled]);

  // Prefetch related data based on entity relationships
  const prefetchRelatedData = useCallback(async () => {
    if (disabled || !entityType || !entityId) return;

    const entityTypeString = entityTypeToString(entityType);
    const relatedUrls = getRelatedDataUrls(entityTypeString, entityId, searchParams);
    
    // Prefetch related URLs with priority ordering
    for (let i = 0; i < relatedUrls.length; i++) {
      setTimeout(() => {
        safePrefetch(
          (url) => router.prefetch(url),
          relatedUrls[i],
          { respectConnection }
        );
      }, i * 100); // Stagger by 100ms
    }
  }, [entityType, entityId, searchParams, router, respectConnection, disabled]);

  // Prefetch dashboard action URLs
  const prefetchDashboardActions = useCallback(async () => {
    if (disabled || !counts || Object.keys(counts).length === 0) return;

    const actionUrls = getDashboardActionUrls(counts);
    const urls = Object.values(actionUrls);
    
    // Prefetch action URLs with priority ordering
    for (let i = 0; i < urls.length; i++) {
      setTimeout(() => {
        safePrefetch(
          (url) => router.prefetch(url),
          urls[i],
          { respectConnection }
        );
      }, i * 150); // Stagger by 150ms for lower priority
    }
  }, [counts, router, respectConnection, disabled]);

  // Prefetch likely next steps in the workflow
  const prefetchWorkflowNext = useCallback(async () => {
    if (disabled || !currentView) return;

    let nextStepUrls: string[] = [];

    switch (currentView) {
      case ContentView.TRANSCRIPTS:
        // Next step: check insights
        nextStepUrls.push('/content?view=insights');
        break;
      case ContentView.INSIGHTS:
        // Next step: check posts
        nextStepUrls.push('/content?view=posts');
        break;
      case ContentView.POSTS:
        // Next step: go to scheduler
        nextStepUrls.push('/scheduler');
        break;
    }

    // Prefetch workflow next steps
    for (let i = 0; i < nextStepUrls.length; i++) {
      setTimeout(() => {
        safePrefetch(
          (url) => router.prefetch(url),
          nextStepUrls[i],
          { respectConnection }
        );
      }, (i + 1) * 200); // Lower priority, more delay
    }
  }, [currentView, router, respectConnection, disabled]);

  // Auto-mode: intelligently prefetch based on context
  useEffect(() => {
    if (!autoMode || disabled) return;

    // Prefetch adjacent views (high priority)
    if (currentView) {
      setTimeout(() => prefetchAdjacentViews(), 500);
    }

    // Prefetch related data (medium priority)
    if (entityType && entityId) {
      setTimeout(() => prefetchRelatedData(), 1000);
    }

    // Prefetch dashboard actions (lower priority)
    if (counts && Object.keys(counts).length > 0) {
      setTimeout(() => prefetchDashboardActions(), 1500);
    }

    // Prefetch workflow next steps (lowest priority)
    if (currentView) {
      setTimeout(() => prefetchWorkflowNext(), 2000);
    }
  }, [
    autoMode,
    currentView,
    entityType,
    entityId,
    counts,
    prefetchAdjacentViews,
    prefetchRelatedData,
    prefetchDashboardActions,
    prefetchWorkflowNext,
    disabled,
  ]);

  return {
    prefetchAdjacentViews,
    prefetchRelatedData,
    prefetchDashboardActions,
    prefetchWorkflowNext,
  };
}