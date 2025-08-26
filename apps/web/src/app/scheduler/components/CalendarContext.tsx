'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  ReactNode
} from 'react';
import {
  startOfISOWeek,
  endOfISOWeek,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths
} from 'date-fns';
import type {
  CalendarContextValue,
  CalendarActions,
  CalendarView,
  CalendarEvent,
  CalendarFilters,
  PostModalState,
  DateRange,
  ApprovedPost
} from '@/types/scheduler';
import type { Platform } from '@/types';
import { 
  useCalendarEvents, 
  useDeleteScheduledEvent, 
  useUpdateScheduledEvent 
} from '../hooks/useSchedulerQueries';

// Context creation
const CalendarContext = createContext<CalendarContextValue | undefined>(undefined);

// Helper function to get date range for view
function getDateRangeForView(view: CalendarView, currentDate: Date): DateRange {
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
}

// Calendar provider props
interface CalendarProviderProps {
  children: ReactNode;
  initialView?: CalendarView;
  initialDate?: Date;
  initialEvents?: CalendarEvent[];
  initialApprovedPosts?: ApprovedPost[];
}

// Calendar provider component
export function CalendarProvider({
  children,
  initialView = 'week',
  initialDate = new Date(),
  initialApprovedPosts = []
}: CalendarProviderProps) {
  // Local state management
  const [view, setView] = useState<CalendarView>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [approvedPosts, setApprovedPosts] = useState<ApprovedPost[]>(initialApprovedPosts);
  
  // Modal state
  const [modal, setModal] = useState<PostModalState>({
    isOpen: false,
    mode: 'create'
  });

  // Filters state
  const [filters, setFilters] = useState<CalendarFilters>({
    platforms: ['linkedin', 'x'],
    status: 'all'
  });

  // TanStack Query mutations
  const deleteEventMutation = useDeleteScheduledEvent();
  const updateEventMutation = useUpdateScheduledEvent();

  // Get date range for current view
  const { start: startDate, end: endDate } = useMemo(
    () => getDateRangeForView(view, currentDate),
    [view, currentDate]
  );

  // Use TanStack Query for calendar events
  const {
    data: events = [],
    isLoading,
    error,
    refetch: refreshEvents
  } = useCalendarEvents({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    platforms: filters.platforms,
    status: filters.status !== 'all' ? filters.status : undefined,
  });

  // Navigation actions
  const navigateToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const navigatePrevious = useCallback(() => {
    setCurrentDate(prev => {
      switch (view) {
        case 'day':
          return subDays(prev, 1);
        case 'week':
          return subWeeks(prev, 1);
        case 'month':
          return subMonths(prev, 1);
        default:
          return subWeeks(prev, 1);
      }
    });
  }, [view]);

  const navigateNext = useCallback(() => {
    setCurrentDate(prev => {
      switch (view) {
        case 'day':
          return addDays(prev, 1);
        case 'week':
          return addWeeks(prev, 1);
        case 'month':
          return addMonths(prev, 1);
        default:
          return addWeeks(prev, 1);
      }
    });
  }, [view]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Event management actions using TanStack Query
  const updateEventDateTime = useCallback(async (eventId: string, newDateTime: Date) => {
    await updateEventMutation.mutateAsync({
      eventId,
      updateData: { scheduledTime: newDateTime.toISOString() }
    });
  }, [updateEventMutation]);

  const deleteEvent = useCallback(async (eventId: string) => {
    await deleteEventMutation.mutateAsync(eventId);
  }, [deleteEventMutation]);

  const createEvent = useCallback((timeSlot: Date, platform?: Platform) => {
    setModal({
      isOpen: true,
      mode: 'create',
      initialDateTime: timeSlot,
      initialPlatform: platform,
    });
  }, []);

  // Actions object
  const actions: CalendarActions = {
    setView,
    navigateToDate,
    navigatePrevious,
    navigateNext,
    navigateToday,
    refreshEvents,
    updateEventDateTime,
    deleteEvent,
    createEvent,
  };

  // State object
  const state = {
    view,
    currentDate,
    events,
    approvedPosts,
    selectedPlatforms: filters.platforms || [],
    isLoading,
    error: error?.message,
  };

  const value: CalendarContextValue = {
    state,
    actions,
    modal,
    setModal,
    filters,
    setFilters,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

// Hook to use calendar context
export function useCalendar(): CalendarContextValue {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}