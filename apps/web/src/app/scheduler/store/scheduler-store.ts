import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CalendarEvent, PostView, ScheduledPostStatus } from '@/types';
import type { CalendarView, Platform } from '@/types/scheduler';
import { 
  deleteScheduledEvent, 
  updateScheduledEvent, 
  scheduleApprovedPost 
} from '@/app/actions/scheduler.actions';
import { getErrorMessage } from '@/app/content/hooks/utils';
import { useRouter } from 'next/navigation';
import { useOptimisticStore } from '@/lib/optimistic-store';

/**
 * Simplified Scheduler Store
 * 
 * Principles:
 * 1. Server data is read-only and refreshed via router.refresh()
 * 2. UI state is minimal and focused on interaction
 * 3. URL handles shareable state (view, date, filters)
 */

interface SchedulerStore {
  // ===== SERVER DATA (Read-only) =====
  events: CalendarEvent[];
  posts: PostView[]; // Approved posts from server
  
  // ===== UI STATE =====
  isDragging: boolean;
  selectedEventId: string | null;
  selectedPostId: string | null;
  
  // ===== MODAL STATE =====
  modalState: {
    isOpen: boolean;
    mode: 'create' | 'edit';
    postId?: string;
    eventId?: string;
    initialDateTime?: Date;
    initialPlatform?: Platform;
  };
  
  // ===== ACTIONS =====
  // Data setters (called by hydration)
  setServerData: (events: CalendarEvent[], posts: PostView[]) => void;
  
  // UI actions
  setDragging: (isDragging: boolean) => void;
  selectEvent: (eventId: string | null) => void;
  selectPost: (postId: string | null) => void;
  
  // Modal actions
  openScheduleModal: (params: {
    postId?: string;
    eventId?: string;
    dateTime?: Date;
    platform?: Platform;
    mode?: 'create' | 'edit';
  }) => void;
  closeModal: () => void;
  
  // Server mutations (these return promises and trigger router.refresh)
  schedulePost: (postId: string, dateTime: Date, platform: Platform) => Promise<void>;
  updateEventTime: (eventId: string, newDateTime: Date) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
}

export const useSchedulerStore = create<SchedulerStore>()(
  devtools(
    (set, get) => ({
      // ===== INITIAL STATE =====
      events: [],
      posts: [],
      isDragging: false,
      selectedEventId: null,
      selectedPostId: null,
      modalState: {
        isOpen: false,
        mode: 'create',
      },
      
      // ===== ACTIONS =====
      setServerData: (events, posts) => set({ 
        events, 
        posts: posts.filter(p => p.status === 'approved') 
      }),
      
      setDragging: (isDragging) => set({ isDragging }),
      selectEvent: (selectedEventId) => set({ selectedEventId }),
      selectPost: (selectedPostId) => set({ selectedPostId }),
      
      openScheduleModal: (params) => set({
        modalState: {
          isOpen: true,
          mode: params.mode || 'create',
          postId: params.postId,
          eventId: params.eventId,
          initialDateTime: params.dateTime,
          initialPlatform: params.platform,
        }
      }),
      
      closeModal: () => set({
        modalState: {
          isOpen: false,
          mode: 'create',
        }
      }),
      
      // Server mutations - these don't update local state directly
      // Instead they trigger router.refresh() to refetch from server
      schedulePost: async (postId, dateTime, platform) => {
        const post = get().posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');
        
        const result = await scheduleApprovedPost({
          postId,
          platform,
          content: post.content,
          datetime: dateTime.toISOString()
        });
        
        if (!result.success) {
          throw new Error(getErrorMessage(result.error, 'Failed to schedule post'));
        }
        
        // Don't update local state - let router.refresh() handle it
      },
      
      updateEventTime: async (eventId, newDateTime) => {
        const result = await updateScheduledEvent(eventId, {
          scheduledTime: newDateTime.toISOString()
        });
        
        if (!result.success) {
          throw new Error(getErrorMessage(result.error, 'Failed to update event'));
        }
        
        // Don't update local state - let router.refresh() handle it
      },
      
      deleteEvent: async (eventId) => {
        const result = await deleteScheduledEvent(eventId);
        
        if (!result.success) {
          throw new Error(getErrorMessage(result.error, 'Failed to delete event'));
        }
        
        // Don't update local state - let router.refresh() handle it
      },
    }),
    {
      name: 'scheduler-store-v2',
    }
  )
);

// ===== SELECTOR HOOKS =====
// These provide granular subscriptions to prevent unnecessary re-renders

export const useSchedulerEvents = () => 
  useSchedulerStore(state => state.events);

export const useSchedulerPosts = () => 
  useSchedulerStore(state => state.posts);

export const useSchedulerDragState = () =>
  useSchedulerStore(state => ({
    isDragging: state.isDragging,
    setDragging: state.setDragging
  }));

export const useSchedulerSelection = () =>
  useSchedulerStore(state => ({
    selectedEventId: state.selectedEventId,
    selectedPostId: state.selectedPostId,
    selectEvent: state.selectEvent,
    selectPost: state.selectPost
  }));

export const useSchedulerModal = () =>
  useSchedulerStore(state => ({
    modalState: state.modalState,
    openScheduleModal: state.openScheduleModal,
    closeModal: state.closeModal
  }));

export const useSchedulerMutations = () =>
  useSchedulerStore(state => ({
    schedulePost: state.schedulePost,
    updateEventTime: state.updateEventTime,
    deleteEvent: state.deleteEvent
  }));