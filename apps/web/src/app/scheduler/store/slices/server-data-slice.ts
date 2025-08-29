import { StateCreator } from 'zustand';
import type { SchedulerServerDataSlice, SchedulerStore } from '../types';
import type { CalendarEvent } from '@/types';
import type { ApprovedPost } from '@/types/scheduler';
import { getSchedulerEvents } from '@/app/actions/scheduler.actions';
import { getDateRangeForView } from '../scheduler-store';

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
          eventsError: result.error || 'Failed to fetch events', 
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
});