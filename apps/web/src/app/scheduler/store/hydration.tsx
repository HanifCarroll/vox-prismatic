
import { useEffect, type ReactNode } from 'react';
import { useSchedulerStore } from './scheduler-store';
import { useRouter } from 'next/navigation';
import type { CalendarEvent, PostView } from '@/types';

interface SchedulerHydrationProps {
  children: ReactNode;
  initialEvents: CalendarEvent[];
  initialPosts: PostView[];
  preselectedPostId?: string;
}

/**
 * Simplified SchedulerHydration
 * 
 * - Hydrates store with server data once on mount
 * - No client-side data fetching
 * - Handles preselected post from URL
 * - Refreshes via router.refresh() after mutations
 */
export function SchedulerHydration({
  children,
  initialEvents,
  initialPosts,
  preselectedPostId
}: SchedulerHydrationProps) {
  const router = useRouter();
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
  }, [preselectedPostId]); // Only when URL param changes

  // Wrap mutations to trigger router refresh
  useEffect(() => {
    const store = useSchedulerStore.getState();
    
    // Override mutations to add router.refresh()
    const originalSchedule = store.schedulePost;
    const originalUpdate = store.updateEventTime;
    const originalDelete = store.deleteEvent;
    
    store.schedulePost = async (...args) => {
      await originalSchedule(...args);
      router.refresh(); // Refetch server data
    };
    
    store.updateEventTime = async (...args) => {
      await originalUpdate(...args);
      router.refresh();
    };
    
    store.deleteEvent = async (...args) => {
      await originalDelete(...args);
      router.refresh();
    };
  }, [router]);

  return <>{children}</>;
}