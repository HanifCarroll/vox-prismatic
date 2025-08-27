'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  useEffect,
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
  CalendarFilters,
  PostModalState,
  DateRange,
  ApprovedPost
} from '@/types/scheduler';
import type { CalendarEvent } from '@/types';
import type { Platform } from '@/types';
import { 
  useCalendarEvents, 
  useDeleteScheduledEvent, 
  useUpdateScheduledEvent,
  useSchedulePost 
} from '../hooks/useSchedulerQueries';
import { usePosts } from '@/app/content/hooks/usePostQueries';
import { apiClient } from '@/lib/api-client';

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
  initialEvents?: CalendarEvent[];
  initialApprovedPosts?: ApprovedPost[];
  preselectedPostId?: string;
}

// Calendar provider component
export function CalendarProvider({
  children,
  initialView = 'week',
  initialEvents = [],
  initialApprovedPosts = [],
  preselectedPostId
}: CalendarProviderProps) {
  // Since the calendar is now client-only, we can safely use Date objects
  const [view, setView] = useState<CalendarView>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const date = new Date();
    date.setMinutes(0, 0, 0);
    return date;
  });
  // Use TanStack Query to fetch approved posts reactively
  const { data: approvedPostsData = [] } = usePosts({ status: 'approved' });
  
  // Transform PostView[] to ApprovedPost[] format expected by the scheduler
  const approvedPosts = useMemo(() => 
    approvedPostsData.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      platform: post.platform, // PostView already has platform field
      insightId: post.insightId,
      status: post.status,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    })), 
    [approvedPostsData]
  );
  const [today] = useState<Date>(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  
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
  const schedulePostMutation = useSchedulePost();

  // Get date range for current view
  const { start: startDate, end: endDate } = useMemo(
    () => getDateRangeForView(view, currentDate),
    [view, currentDate]
  );

  // Use TanStack Query for calendar events with initial data
  const {
    data: events = [],
    isLoading,
    error,
    refetch
  } = useCalendarEvents({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    platforms: filters.platforms,
    status: filters.status !== 'all' ? filters.status : undefined,
  }, initialEvents);

  // Create a wrapper for refreshEvents that matches the expected signature
  const refreshEvents = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Handle preselected post
  useEffect(() => {
    if (preselectedPostId && approvedPosts.length > 0) {
      const preselectedPost = approvedPosts.find(post => post.id === preselectedPostId);
      if (preselectedPost) {
        setModal({
          isOpen: true,
          mode: 'create',
          postId: preselectedPost.id,
          postData: {
            id: preselectedPost.id,
            title: preselectedPost.title,
            content: preselectedPost.content,
            platform: preselectedPost.platform,
          },
          initialPlatform: preselectedPost.platform,
          onSave: async (data: any) => {
            // Use the TanStack Query mutation to schedule the post
            await schedulePostMutation.mutateAsync({
              postId: preselectedPost.id,
              platform: data.platform,
              content: data.content,
              datetime: data.scheduledTime,
            });

            setModal({ isOpen: false, mode: 'create' });
          },
          onClose: () => setModal({ isOpen: false, mode: 'create' }),
        });
      }
    }
  }, [preselectedPostId, approvedPosts, schedulePostMutation]);

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

  // Schedule approved post action
  const scheduleApprovedPost = useCallback(async (postId: string, scheduledTime: Date, platform: Platform) => {
    try {
      // Find the post to get its content
      const post = approvedPosts.find(p => p.id === postId);
      if (!post) {
        throw new Error('Post not found in approved posts list');
      }

      // Use the TanStack Query mutation which handles all the cache invalidation
      await schedulePostMutation.mutateAsync({
        postId,
        platform,
        content: post.content,
        datetime: scheduledTime.toISOString(),
      });
    } catch (error) {
      console.error('Failed to schedule post:', error);
      throw error;
    }
  }, [approvedPosts, schedulePostMutation]);

  // Unschedule post action (same as deleteEvent but with different semantics)
  const unschedulePost = useCallback(async (eventId: string) => {
    await deleteEvent(eventId);
  }, [deleteEvent]);

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
    scheduleApprovedPost,
    unschedulePost,
  };

  // State object
  const state = {
    view,
    currentDate,
    today,
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