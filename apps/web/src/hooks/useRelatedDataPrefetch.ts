import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EntityType, ContentView } from '@content-creation/types';
import { safePrefetch, getAdjacentContentViews, getRelatedDataUrls, getDashboardActionUrls } from '@/lib/prefetch-utils';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api';

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

  const queryClient = useQueryClient();

  // Prefetch adjacent content views (for tab navigation)
  const prefetchAdjacentViews = useCallback(async () => {
    if (disabled || !currentView) return;

    const currentViewString = contentViewToString(currentView);
    const adjacentViews = ['transcripts', 'insights', 'posts'].filter(view => view !== currentViewString);
    
    // Prefetch adjacent views with a slight delay between them
    for (let i = 0; i < adjacentViews.length; i++) {
      setTimeout(async () => {
        const view = adjacentViews[i];
        const cacheKey = `adjacent-view-${view}-${JSON.stringify(searchParams)}`;
        
        await safePrefetch(
          async () => {
            const filters = { ...searchParams, page: 1 }; // Reset to first page for new view
            
            switch (view) {
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
            }
          },
          cacheKey,
          { respectConnection }
        );
      }, i * 50); // Stagger by 50ms
    }
  }, [currentView, searchParams, queryClient, respectConnection, disabled]);

  // Prefetch related data based on entity relationships
  const prefetchRelatedData = useCallback(async () => {
    if (disabled || !entityType || !entityId) return;

    const cacheKey = `related-data-${entityType}-${entityId}`;
    
    await safePrefetch(
      async () => {
        switch (entityType) {
          case EntityType.TRANSCRIPT:
            // When viewing transcript, prefetch generated insights
            await queryClient.prefetchQuery({
              queryKey: queryKeys.insights.byTranscript(entityId),
              queryFn: () => api.insights.getInsights({ transcriptId: entityId }),
              staleTime: 30 * 1000,
            });
            break;
            
          case EntityType.INSIGHT:
            // When viewing insight, prefetch generated posts
            await queryClient.prefetchQuery({
              queryKey: queryKeys.posts.byInsight(entityId),
              queryFn: () => api.posts.getPosts({ insightId: entityId }),
              staleTime: 30 * 1000,
            });
            break;
            
          case EntityType.POST:
            // When viewing post, prefetch scheduled events
            await queryClient.prefetchQuery({
              queryKey: queryKeys.scheduledEvents.byPost(entityId),
              queryFn: () => api.scheduler.getSchedulerEvents({ postId: entityId }),
              staleTime: 30 * 1000,
            });
            break;
        }
      },
      cacheKey,
      { respectConnection }
    );
  }, [entityType, entityId, queryClient, respectConnection, disabled]);

  // Prefetch dashboard action URLs
  const prefetchDashboardActions = useCallback(async () => {
    if (disabled || !counts || Object.keys(counts).length === 0) return;

    const cacheKey = `dashboard-actions-${JSON.stringify(counts)}`;
    
    await safePrefetch(
      async () => {
        // Prefetch data for actionable items based on counts
        
        // If there are insights needing review
        if (counts.insights > 0) {
          await queryClient.prefetchQuery({
            queryKey: queryKeys.insights.list({ status: 'needs_review' }),
            queryFn: () => api.insights.getInsights({ status: 'needs_review' }),
            staleTime: 30 * 1000,
          });
        }
        
        // If there are draft posts
        if (counts.posts > 0) {
          await queryClient.prefetchQuery({
            queryKey: queryKeys.posts.list({ status: 'draft' }),
            queryFn: () => api.posts.getPosts({ status: 'draft' }),
            staleTime: 30 * 1000,
          });
        }
        
        // If there are raw transcripts
        if (counts.transcripts > 0) {
          await queryClient.prefetchQuery({
            queryKey: queryKeys.transcripts.list({ status: 'raw' }),
            queryFn: () => api.transcripts.getTranscripts({ status: 'raw' }),
            staleTime: 30 * 1000,
          });
        }
        
        // Always prefetch scheduler data as it's the final step
        await queryClient.prefetchQuery({
          queryKey: queryKeys.scheduledEvents.upcoming(),
          queryFn: () => api.scheduler.getSchedulerEvents({ upcoming: true }),
          staleTime: 30 * 1000,
        });
      },
      cacheKey,
      { respectConnection }
    );
  }, [counts, queryClient, respectConnection, disabled]);

  // Prefetch likely next steps in the workflow
  const prefetchWorkflowNext = useCallback(async () => {
    if (disabled || !currentView) return;

    const cacheKey = `workflow-next-${currentView}`;
    
    await safePrefetch(
      async () => {
        switch (currentView) {
          case ContentView.TRANSCRIPTS:
            // Next step: check insights
            await queryClient.prefetchQuery({
              queryKey: queryKeys.insights.list({ page: 1 }),
              queryFn: () => api.insights.getInsights({ page: 1 }),
              staleTime: 30 * 1000,
            });
            break;
          case ContentView.INSIGHTS:
            // Next step: check posts
            await queryClient.prefetchQuery({
              queryKey: queryKeys.posts.list({ page: 1 }),
              queryFn: () => api.posts.getPosts({ page: 1 }),
              staleTime: 30 * 1000,
            });
            break;
          case ContentView.POSTS:
            // Next step: go to scheduler
            await queryClient.prefetchQuery({
              queryKey: queryKeys.scheduledEvents.upcoming(),
              queryFn: () => api.scheduler.getSchedulerEvents({ upcoming: true }),
              staleTime: 30 * 1000,
            });
            break;
        }
      },
      cacheKey,
      { respectConnection }
    );
  }, [currentView, queryClient, respectConnection, disabled]);

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