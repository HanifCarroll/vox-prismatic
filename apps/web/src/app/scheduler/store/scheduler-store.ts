import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { SchedulerStore } from './types';

// Import slices
import { createCalendarSlice } from './slices/calendar-slice';
import { createFiltersSlice } from './slices/filters-slice';
import { createSchedulerModalSlice } from './slices/modal-slice';
import { createSchedulerServerDataSlice } from './slices/server-data-slice';

// Create the scheduler store
export const useSchedulerStore = create<SchedulerStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createCalendarSlice(...args),
        ...createFiltersSlice(...args),
        ...createSchedulerModalSlice(...args),
        ...createSchedulerServerDataSlice(...args),
      }),
      {
        name: 'scheduler-store',
        // Only persist user preferences, not transient state
        partialize: (state) => ({
          // Calendar preferences
          calendar: {
            view: state.calendar.view,
            // Don't persist currentDate or today - these should be fresh on reload
          },
          
          // Filter preferences
          filters: state.filters,
          
          // Don't persist modal state, events data, or loading states
        }),
      }
    ),
    {
      name: 'scheduler-store-devtools',
    }
  )
);

// Computed selectors with memoization
export const getCalendarComputedValues = (state: SchedulerStore) => ({
  hasActiveFilters: 
    state.filters.platforms?.length !== 2 || // Default is 2 platforms
    state.filters.status !== 'all',
  
  activeFilterCount: [
    state.filters.platforms?.length !== 2,
    state.filters.status !== 'all',
  ].filter(Boolean).length,
  
  isLoading: state.eventsLoading || state.approvedPostsLoading,
  hasError: !!state.eventsError || !!state.approvedPostsError,
  
  // Date range helpers
  dateRangeKey: `${state.calendar.view}-${state.calendar.currentDate.toISOString().split('T')[0]}`,
});

// Helper to get current date range based on view
export const getDateRangeForView = (view: string, currentDate: Date) => {
  const {
    startOfDay,
    endOfDay,
    startOfISOWeek,
    endOfISOWeek,
    startOfMonth,
    endOfMonth,
  } = require('date-fns');
  
  switch (view) {
    case 'day':
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate)
      };
    case 'week':
      return {
        start: startOfISOWeek(currentDate),
        end: endOfISOWeek(currentDate)
      };
    case 'month':
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
      };
    default:
      return {
        start: startOfISOWeek(currentDate),
        end: endOfISOWeek(currentDate)
      };
  }
};

// Selector hooks for optimized component subscriptions
export const useSchedulerCalendar = () => 
  useSchedulerStore((state) => ({
    calendar: state.calendar,
    setView: state.setView,
    navigateToDate: state.navigateToDate,
    navigatePrevious: state.navigatePrevious,
    navigateNext: state.navigateNext,
    navigateToday: state.navigateToday,
  }));

export const useSchedulerFilters = () =>
  useSchedulerStore((state) => ({
    filters: state.filters,
    setFilters: state.setFilters,
    setPlatforms: state.setPlatforms,
    setStatus: state.setStatus,
    resetFilters: state.resetFilters,
  }));

export const useSchedulerModal = () =>
  useSchedulerStore((state) => ({
    modal: state.modal,
    setModal: state.setModal,
    openModal: state.openModal,
    closeModal: state.closeModal,
    setPostData: state.setPostData,
    clearModalData: state.clearModalData,
  }));

export const useSchedulerData = () =>
  useSchedulerStore((state) => ({
    events: state.eventsData,
    eventsLoading: state.eventsLoading,
    eventsError: state.eventsError,
    approvedPosts: state.approvedPostsData,
    approvedPostsLoading: state.approvedPostsLoading,
    approvedPostsError: state.approvedPostsError,
    refreshEvents: state.refreshEvents,
    refreshApprovedPosts: state.refreshApprovedPosts,
  }));

// Combined selector for components that need multiple pieces
export const useSchedulerState = () =>
  useSchedulerStore((state) => ({
    // Calendar state
    view: state.calendar.view,
    currentDate: state.calendar.currentDate,
    today: state.calendar.today,
    
    // Data
    events: state.eventsData,
    approvedPosts: state.approvedPostsData,
    
    // Loading states
    isLoading: state.eventsLoading || state.approvedPostsLoading,
    error: state.eventsError || state.approvedPostsError,
    
    // Filters
    filters: state.filters,
    
    // Computed values
    ...getCalendarComputedValues(state),
  }));

// Actions selector
export const useSchedulerActions = () =>
  useSchedulerStore((state) => ({
    // Calendar actions
    setView: state.setView,
    navigateToDate: state.navigateToDate,
    navigatePrevious: state.navigatePrevious,
    navigateNext: state.navigateNext,
    navigateToday: state.navigateToday,
    
    // Filter actions
    setFilters: state.setFilters,
    setPlatforms: state.setPlatforms,
    setStatus: state.setStatus,
    resetFilters: state.resetFilters,
    
    // Modal actions
    setModal: state.setModal,
    openModal: state.openModal,
    closeModal: state.closeModal,
    
    // Data actions
    refreshEvents: state.refreshEvents,
    refreshApprovedPosts: state.refreshApprovedPosts,
  }));