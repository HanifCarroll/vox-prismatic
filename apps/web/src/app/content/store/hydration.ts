'use client';

import { useEffect, useState } from 'react';
import { useContentStore } from './content-store';
import type { ContentStore } from './types';

/**
 * Hook to safely access Zustand store with SSR/hydration support
 * Returns fallback value during SSR and actual value after hydration
 */
export function useHydratedStore<T>(
  selector: (state: ContentStore) => T,
  fallback: T
): T {
  const [hydrated, setHydrated] = useState(false);
  const value = useContentStore(selector);
  
  useEffect(() => {
    setHydrated(true);
  }, []);
  
  return hydrated ? value : fallback;
}

/**
 * Hook to check if the store has been hydrated
 * Useful for conditional rendering based on hydration state
 */
export function useIsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    setHydrated(true);
  }, []);
  
  return hydrated;
}

/**
 * Component wrapper that only renders children after hydration
 * Prevents hydration mismatches for components that use persisted state
 */
export function HydrationBoundary({ 
  children,
  fallback = null 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hydrated = useIsHydrated();
  
  if (!hydrated) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Initialize store with server-side data
 * Call this in server components to set initial state
 */
export function initializeStore(initialData?: Partial<ContentStore>) {
  if (initialData) {
    useContentStore.setState(initialData);
  }
}

/**
 * Hook to manually trigger store hydration
 * Useful when you need fine-grained control over when hydration occurs
 */
export function useManualHydration() {
  const [isHydrated, setIsHydrated] = useState(false);
  
  const hydrate = () => {
    useContentStore.persist.rehydrate();
    setIsHydrated(true);
  };
  
  return { isHydrated, hydrate };
}

/**
 * Hook that provides hydration-safe default values
 * Useful for components that need to render immediately with defaults
 */
export function useHydratedDefaults() {
  const isHydrated = useIsHydrated();
  
  return {
    isHydrated,
    // Default values for SSR
    defaults: {
      searchQuery: '',
      activeView: 'transcripts' as const,
      transcripts: {
        statusFilter: 'all',
        sortBy: 'createdAt-desc',
        selectedItems: [],
        showFilters: false,
        columnVisibility: ['title', 'source', 'wordCount', 'status', 'createdAt'],
      },
      insights: {
        statusFilter: 'all',
        categoryFilter: 'all',
        postTypeFilter: 'all',
        scoreRange: [0, 20] as [number, number],
        sortBy: 'totalScore',
        sortOrder: 'desc' as 'asc' | 'desc',
        selectedItems: [],
        showFilters: false,
        columnVisibility: ['title', 'type', 'category', 'totalScore', 'status', 'createdAt'],
      },
      posts: {
        statusFilter: 'all',
        platformFilter: 'all',
        sortBy: 'createdAt-desc',
        selectedItems: [],
        showFilters: false,
        columnVisibility: ['title', 'platform', 'status', 'createdAt', 'scheduledFor', 'characterCount', 'insightTitle'],
      },
      modals: {
        activeModals: new Set(),
        selectedTranscript: null,
        selectedInsight: null,
        selectedPost: null,
        postToSchedule: null,
        transcriptModalMode: 'view' as 'view' | 'edit',
      },
    },
  };
}