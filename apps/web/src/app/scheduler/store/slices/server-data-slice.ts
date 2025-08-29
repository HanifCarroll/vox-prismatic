import { StateCreator } from 'zustand';
import type { SchedulerServerDataSlice, SchedulerStore } from '../types';
import type { CalendarEvent } from '@/types';
import type { ApprovedPost } from '@/types/scheduler';
import { 
  getSchedulerEvents, 
  deleteScheduledEvent, 
  updateScheduledEvent, 
  scheduleApprovedPost 
} from '@/app/actions/scheduler.actions';
import { getDateRangeForView } from '../scheduler-store';
import { getErrorMessage } from '@/app/content/hooks/utils';

export const createSchedulerServerDataSlice: StateCreator<
  SchedulerStore,
  [],
  [],
  SchedulerServerDataSlice
> = (set, get) => ({
  // Events data state
  eventsData: [],
  eventsLoading: false,
  eventsError: null,
  
  // Approved posts data state
  approvedPostsData: [],
  approvedPostsLoading: false,
  approvedPostsError: null,
  
  // Events data actions
  setEventsData: (events) =>
    set({ eventsData: events }),
  
  setEventsLoading: (loading) =>
    set({ eventsLoading: loading }),
  
  setEventsError: (error) =>
    set({ eventsError: error }),
  
  // Approved posts data actions
  setApprovedPostsData: (posts) =>
    set({ approvedPostsData: posts }),
  
  setApprovedPostsLoading: (loading) =>
    set({ approvedPostsLoading: loading }),
  
  setApprovedPostsError: (error) =>
    set({ approvedPostsError: error }),
  
  // Data refresh actions
  refreshEvents: async () => {
    const { calendar, filters } = get();
    
    set({ eventsLoading: true, eventsError: null });
    
    try {
      // Get date range for current view
      const { start, end } = getDateRangeForView(calendar.view, calendar.currentDate);
      
      // Call server action
      const result = await getSchedulerEvents({
        start: start.toISOString(),
        end: end.toISOString(),
        platforms: filters.platforms?.join(','),
        status: filters.status !== 'all' ? filters.status : undefined
      });
      
      if (result.success) {
        set({ eventsData: result.data || [], eventsLoading: false });
      } else {
        set({ 
          eventsError: getErrorMessage(result.error, 'Failed to fetch events'), 
          eventsLoading: false 
        });
      }
    } catch (error) {
      set({ 
        eventsError: error instanceof Error ? error.message : 'Failed to fetch events',
        eventsLoading: false 
      });
    }
  },
  
  refreshApprovedPosts: async () => {
    set({ approvedPostsLoading: true, approvedPostsError: null });
    
    try {
      // This is primarily handled by the hydration component
      // which syncs with server actions. This method is available
      // for manual refresh if needed, but the data flow is:
      // hydration.tsx -> usePostsData() -> setApprovedPostsData()
      set({ approvedPostsLoading: false });
    } catch (error) {
      set({ 
        approvedPostsError: error instanceof Error ? error.message : 'Failed to fetch approved posts',
        approvedPostsLoading: false 
      });
    }
  },

  // Individual event operations
  deleteEvent: async (eventId: string) => {
    try {
      const result = await deleteScheduledEvent(eventId);
      
      if (result.success) {
        // Remove the deleted event from the store
        const { eventsData } = get();
        set({ 
          eventsData: eventsData.filter(event => event.id !== eventId) 
        });
      } else {
        throw new Error(getErrorMessage(result.error, 'Failed to delete event'));
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to delete event'));
    }
  },

  updateEventDateTime: async (eventId: string, newDate: Date) => {
    try {
      const result = await updateScheduledEvent(eventId, {
        scheduledTime: newDate.toISOString()
      });
      
      if (result.success && result.data) {
        // Update the event in the store
        const { eventsData } = get();
        const updatedEvents = eventsData.map(event => 
          event.id === eventId 
            ? { ...event, scheduledTime: result.data!.scheduledTime }
            : event
        );
        set({ eventsData: updatedEvents });
      } else {
        // On non-success results, we can access the error property
        const errorMessage = !result.success && 'error' in result 
          ? getErrorMessage(result.error, 'Failed to update event')
          : 'Failed to update event';
        throw new Error(errorMessage);
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update event'));
    }
  },

  scheduleApprovedPost: async (postId: string, date: Date, platform: string) => {
    try {
      // Find the post content from approved posts
      const { approvedPostsData } = get();
      const post = approvedPostsData.find(p => p.id === postId);
      
      if (!post) {
        throw new Error('Post not found in approved posts');
      }

      const result = await scheduleApprovedPost({
        postId,
        platform,
        content: post.content,
        datetime: date.toISOString()
      });
      
      if (result.success) {
        // Refresh events to include the new scheduled post
        await get().refreshEvents();
      } else {
        throw new Error(getErrorMessage(result.error, 'Failed to schedule post'));
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to schedule post'));
    }
  },

  unschedulePost: async (eventId: string) => {
    try {
      const result = await deleteScheduledEvent(eventId);
      
      if (result.success) {
        // Remove the event from the store
        const { eventsData } = get();
        set({ 
          eventsData: eventsData.filter(event => event.id !== eventId) 
        });
      } else {
        throw new Error(getErrorMessage(result.error, 'Failed to unschedule post'));
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to unschedule post'));
    }
  },
});