import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useQueryClient } from '@tanstack/react-query';
import type { CalendarEvent, PostView, ScheduledPostStatus } from '@/types';
import type { CalendarView, Platform } from '@/types/scheduler';
import { schedulerAPI } from '@/lib/api';
import { getErrorMessage } from '@/hooks/content-utils';

/**
 * Simplified Scheduler Store - Vite Compatible
 * 
 * Principles:
 * 1. Server data is read-only and refreshed via React Query invalidation
 * 2. UI state is minimal and focused on interaction
 * 3. URL handles shareable state (view, date, filters)
 * 
 * Changes from Next.js version:
 * - Removed useRouter dependency
 * - Uses React Query invalidation instead of router.refresh()
 * - Updated import paths for Vite structure
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
  
  // Server mutations (these return promises and trigger React Query invalidation)
  schedulePost: (postId: string, dateTime: Date, platform: Platform, queryClient?: ReturnType<typeof useQueryClient>) => Promise<void>;
  updateEventTime: (eventId: string, newDateTime: Date, queryClient?: ReturnType<typeof useQueryClient>) => Promise<void>;
  deleteEvent: (eventId: string, queryClient?: ReturnType<typeof useQueryClient>) => Promise<void>;
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
      // Instead they trigger React Query invalidation to refetch from server
      schedulePost: async (postId, dateTime, platform, queryClient) => {
        const post = get().posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');
        
        const result = await schedulerAPI.scheduleApprovedPost({
          postId,
          platform,
          content: post.content,
          datetime: dateTime.toISOString()
        });
        
        if (!result.success) {
          throw new Error(getErrorMessage(result.error, 'Failed to schedule post'));
        }
        
        // Invalidate React Query cache to refetch data
        if (queryClient) {
          await queryClient.invalidateQueries({ queryKey: ['scheduler'] });
        }
      },
      
      updateEventTime: async (eventId, newDateTime, queryClient) => {
        const result = await schedulerAPI.updateScheduledEvent(eventId, {
          scheduledTime: newDateTime.toISOString()
        });
        
        if (!result.success) {
          throw new Error(getErrorMessage(result.error, 'Failed to update event'));
        }
        
        // Invalidate React Query cache to refetch data
        if (queryClient) {
          await queryClient.invalidateQueries({ queryKey: ['scheduler'] });
        }
      },
      
      deleteEvent: async (eventId, queryClient) => {
        const result = await schedulerAPI.deleteScheduledEvent(eventId);
        
        if (!result.success) {
          throw new Error(getErrorMessage(result.error, 'Failed to delete event'));
        }
        
        // Invalidate React Query cache to refetch data
        if (queryClient) {
          await queryClient.invalidateQueries({ queryKey: ['scheduler'] });
        }
      },
    }),
    {
      name: 'scheduler-store-v2',
    }
  )
);

// ===== SELECTOR HOOKS =====
// These provide granular subscriptions to prevent unnecessary re-renders
// IMPORTANT: Using shallow equality for object selectors to prevent infinite loops

export const useSchedulerEvents = () => 
  useSchedulerStore(state => state.events);

export const useSchedulerPosts = () => 
  useSchedulerStore(state => state.posts);

// Drag state selectors - separated to avoid object creation
export const useSchedulerIsDragging = () =>
  useSchedulerStore(state => state.isDragging);

export const useSchedulerSetDragging = () =>
  useSchedulerStore(state => state.setDragging);

export const useSchedulerDragState = () => {
  const isDragging = useSchedulerIsDragging();
  const setDragging = useSchedulerSetDragging();
  return { isDragging, setDragging };
};

// Selection selectors - separated to avoid object creation
export const useSchedulerSelectedEventId = () =>
  useSchedulerStore(state => state.selectedEventId);

export const useSchedulerSelectedPostId = () =>
  useSchedulerStore(state => state.selectedPostId);

export const useSchedulerSelectEvent = () =>
  useSchedulerStore(state => state.selectEvent);

export const useSchedulerSelectPost = () =>
  useSchedulerStore(state => state.selectPost);

export const useSchedulerSelection = () => {
  const selectedEventId = useSchedulerSelectedEventId();
  const selectedPostId = useSchedulerSelectedPostId();
  const selectEvent = useSchedulerSelectEvent();
  const selectPost = useSchedulerSelectPost();
  return { selectedEventId, selectedPostId, selectEvent, selectPost };
};

// Modal state selectors - completely separated to avoid any object creation
export const useSchedulerModalState = () =>
  useSchedulerStore(state => state.modalState);

export const useSchedulerOpenModal = () =>
  useSchedulerStore(state => state.openScheduleModal);

export const useSchedulerCloseModal = () =>
  useSchedulerStore(state => state.closeModal);

// Convenience hook for modal actions - now safe since it doesn't use selectors
export const useSchedulerModalActions = () => {
  const openScheduleModal = useSchedulerOpenModal();
  const closeModal = useSchedulerCloseModal();
  return { openScheduleModal, closeModal };
};

// Convenience hook that combines both (use with caution - may cause re-renders)
export const useSchedulerModal = () => {
  const modalState = useSchedulerModalState();
  const openScheduleModal = useSchedulerOpenModal();
  const closeModal = useSchedulerCloseModal();
  return { modalState, openScheduleModal, closeModal };
};

// Mutation selectors - separated to avoid object creation
export const useSchedulerSchedulePost = () =>
  useSchedulerStore(state => state.schedulePost);

export const useSchedulerUpdateEventTime = () =>
  useSchedulerStore(state => state.updateEventTime);

export const useSchedulerDeleteEvent = () =>
  useSchedulerStore(state => state.deleteEvent);

export const useSchedulerMutations = () => {
  const schedulePost = useSchedulerSchedulePost();
  const updateEventTime = useSchedulerUpdateEventTime();
  const deleteEvent = useSchedulerDeleteEvent();
  return { schedulePost, updateEventTime, deleteEvent };
};