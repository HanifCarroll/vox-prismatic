import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSchedulerStore } from '@/lib/stores/scheduler-store';
import type { CalendarEvent, PostView } from '@/types';

interface SchedulerHydrationProps {
  children: ReactNode;
  initialEvents: CalendarEvent[];
  initialPosts: PostView[];
  preselectedPostId?: string;
}

/**
 * Scheduler Hydration - Vite Compatible
 * 
 * - Hydrates store with server data once on mount
 * - No client-side data fetching
 * - Handles preselected post from URL
 * - Refreshes via React Query invalidation after mutations
 * 
 * Changes from Next.js version:
 * - Removed useRouter dependency
 * - Uses React Query's queryClient for cache invalidation
 * - Updated store import path for Vite structure
 */
export function SchedulerHydration({
  children,
  initialEvents,
  initialPosts,
  preselectedPostId
}: SchedulerHydrationProps) {
  const queryClient = useQueryClient();
  const { setServerData, openScheduleModal, schedulePost, updateEventTime, deleteEvent } = useSchedulerStore();

  // Hydrate store with server data on mount
  useEffect(() => {
    setServerData(initialEvents, initialPosts);
  }, []); // Only on mount, not on every prop change

  // Handle preselected post from URL
  useEffect(() => {
    if (preselectedPostId) {
      const post = initialPosts.find(p => p.id === preselectedPostId);
      if (post) {
        openScheduleModal({
          postId: post.id,
          platform: post.platform,
          mode: 'create'
        });
      }
    }
  }, [preselectedPostId, initialPosts, openScheduleModal]); // Only when URL param changes

  // Wrap mutations to inject queryClient for cache invalidation
  useEffect(() => {
    const store = useSchedulerStore.getState();
    
    // Override mutations to add React Query cache invalidation
    const originalSchedule = store.schedulePost;
    const originalUpdate = store.updateEventTime;
    const originalDelete = store.deleteEvent;
    
    store.schedulePost = async (...args) => {
      await originalSchedule(...args, queryClient);
    };
    
    store.updateEventTime = async (...args) => {
      await originalUpdate(...args, queryClient);
    };
    
    store.deleteEvent = async (...args) => {
      await originalDelete(...args, queryClient);
    };
  }, [queryClient]);

  return <>{children}</>;
}