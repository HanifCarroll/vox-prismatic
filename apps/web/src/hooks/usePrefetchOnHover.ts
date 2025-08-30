import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { safePrefetch, debounce } from '@/lib/prefetch-utils';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api';

interface UsePrefetchOnHoverOptions {
  delay?: number;
  respectConnection?: boolean;
  disabled?: boolean;
}

interface PrefetchConfig {
  type: 'transcript' | 'insight' | 'post' | 'dashboard' | 'scheduler';
  id?: string;
  filters?: Record<string, any>;
}

interface UsePrefetchOnHoverReturn {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
}

export function usePrefetchOnHover(
  prefetchConfig: PrefetchConfig,
  options: UsePrefetchOnHoverOptions = {}
): UsePrefetchOnHoverReturn {
  const { delay = 300, respectConnection = true, disabled = false } = options;
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const prefetchedRef = useRef<boolean>(false);

  // Create prefetch function based on config type
  const createPrefetchFn = useCallback(() => {
    return async () => {
      switch (prefetchConfig.type) {
        case 'transcript':
          if (prefetchConfig.id) {
            await queryClient.prefetchQuery({
              queryKey: queryKeys.transcripts.detail(prefetchConfig.id),
              queryFn: () => api.transcripts.getTranscript(prefetchConfig.id!),
              staleTime: 30 * 1000, // 30 seconds
            });
          } else if (prefetchConfig.filters) {
            await queryClient.prefetchQuery({
              queryKey: queryKeys.transcripts.list(prefetchConfig.filters),
              queryFn: () => api.transcripts.getTranscripts(prefetchConfig.filters),
              staleTime: 30 * 1000,
            });
          }
          break;
        
        case 'insight':
          if (prefetchConfig.id) {
            await queryClient.prefetchQuery({
              queryKey: queryKeys.insights.detail(prefetchConfig.id),
              queryFn: () => api.insights.getInsight(prefetchConfig.id!),
              staleTime: 30 * 1000,
            });
          } else if (prefetchConfig.filters) {
            await queryClient.prefetchQuery({
              queryKey: queryKeys.insights.list(prefetchConfig.filters),
              queryFn: () => api.insights.getInsights(prefetchConfig.filters),
              staleTime: 30 * 1000,
            });
          }
          break;
        
        case 'post':
          if (prefetchConfig.id) {
            await queryClient.prefetchQuery({
              queryKey: queryKeys.posts.detail(prefetchConfig.id),
              queryFn: () => api.posts.getPost(prefetchConfig.id!),
              staleTime: 30 * 1000,
            });
          } else if (prefetchConfig.filters) {
            await queryClient.prefetchQuery({
              queryKey: queryKeys.posts.list(prefetchConfig.filters),
              queryFn: () => api.posts.getPosts(prefetchConfig.filters),
              staleTime: 30 * 1000,
            });
          }
          break;
        
        case 'dashboard':
          await queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.data(),
            queryFn: () => api.dashboard.getDashboard(),
            staleTime: 30 * 1000,
          });
          break;
        
        case 'scheduler':
          await queryClient.prefetchQuery({
            queryKey: queryKeys.scheduledEvents.upcoming(),
            queryFn: () => api.scheduler.getSchedulerEvents(),
            staleTime: 30 * 1000,
          });
          break;
      }
    };
  }, [prefetchConfig, queryClient]);

  // Debounced prefetch function
  const debouncedPrefetch = useCallback(
    debounce(async () => {
      if (disabled || prefetchedRef.current) return;
      
      const prefetchFn = createPrefetchFn();
      const cacheKey = `${prefetchConfig.type}-${prefetchConfig.id || JSON.stringify(prefetchConfig.filters)}`;
      
      const success = await safePrefetch(
        () => prefetchFn(),
        cacheKey,
        { respectConnection }
      );
      
      if (success) {
        prefetchedRef.current = true;
      }
    }, delay),
    [prefetchConfig, disabled, respectConnection, delay, createPrefetchFn]
  );

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    
    timeoutRef.current = setTimeout(() => {
      debouncedPrefetch();
    }, delay);
  }, [debouncedPrefetch, delay, disabled]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const handleFocus = useCallback(() => {
    if (disabled) return;
    // Immediate prefetch on focus for accessibility
    debouncedPrefetch();
  }, [debouncedPrefetch, disabled]);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
  };
}