'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useReducer,
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
  CalendarState,
  CalendarActions,
  CalendarView,
  CalendarEvent,
  CalendarFilters,
  PostModalState,
  DateRange,
  ApprovedPost
} from '@/types/scheduler';
import type { Platform } from '@/types';

// Calendar reducer actions
type CalendarAction =
  | { type: 'SET_VIEW'; payload: CalendarView }
  | { type: 'SET_DATE'; payload: Date }
  | { type: 'SET_EVENTS'; payload: CalendarEvent[] }
  | { type: 'SET_APPROVED_POSTS'; payload: ApprovedPost[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: { id: string; event: CalendarEvent } }
  | { type: 'REMOVE_EVENT'; payload: string }
  | { type: 'SET_FILTERS'; payload: CalendarFilters };

// Initial calendar state
const initialCalendarState: CalendarState = {
  view: 'week',
  currentDate: new Date(),
  events: [],
  approvedPosts: [],
  selectedPlatforms: ['linkedin', 'x'],
  isLoading: false,
  error: undefined
};

// Calendar state reducer
function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case 'SET_VIEW': {
      const newView = action.payload;
      return {
        ...state,
        view: newView
      };
    }
    case 'SET_DATE': {
      const newDate = action.payload;
      return {
        ...state,
        currentDate: newDate
      };
    }
    case 'SET_EVENTS':
      return {
        ...state,
        events: action.payload
      };
    case 'SET_APPROVED_POSTS':
      return {
        ...state,
        approvedPosts: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    case 'ADD_EVENT':
      return {
        ...state,
        events: [...state.events, action.payload]
      };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(event =>
          event.id === action.payload.id ? action.payload.event : event
        )
      };
    case 'REMOVE_EVENT':
      return {
        ...state,
        events: state.events.filter(event => event.id !== action.payload)
      };
    default:
      return state;
  }
}

// Helper function to get date range for view
function getDateRangeForView(view: CalendarView, date: Date): DateRange {
  switch (view) {
    case 'day':
      return {
        start: startOfDay(date),
        end: endOfDay(date)
      };
    case 'week':
      return {
        start: startOfISOWeek(date),
        end: endOfISOWeek(date)
      };
    case 'month':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
    default:
      return {
        start: startOfISOWeek(date),
        end: endOfISOWeek(date)
      };
  }
}

// Calendar context
const CalendarContext = createContext<CalendarContextValue | null>(null);

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
  initialEvents = [],
  initialApprovedPosts = []
}: CalendarProviderProps) {
  // Calendar state management
  const [state, dispatch] = useReducer(calendarReducer, {
    ...initialCalendarState,
    view: initialView,
    currentDate: initialDate,
    events: initialEvents,
    approvedPosts: initialApprovedPosts
  });

  // Modal state
  const [modal, setModal] = React.useState<PostModalState>({
    isOpen: false,
    mode: 'create'
  });

  // Filters state
  const [filters, setFilters] = React.useState<CalendarFilters>({
    platforms: ['linkedin', 'x'],
    status: 'all'
  });


  // Fetch calendar events (without filters - we'll filter client-side)
  const fetchEvents = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: undefined });

    try {
      // Get date range for current view
      const { start: startDate, end: endDate } = getDateRangeForView(state.view, state.currentDate);

      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: endDate.toISOString()
        // Removed server-side filtering to avoid refetching on filter changes
      });

      const response = await fetch(`/api/scheduler/events?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      // Convert string dates to Date objects
      const events: CalendarEvent[] = data.data?.map((event: any) => ({
        ...event,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt)
      })) || [];

      dispatch({ type: 'SET_EVENTS', payload: events });
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to fetch events' });
      dispatch({ type: 'SET_EVENTS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.view, state.currentDate]);

  // Fetch approved posts
  const fetchApprovedPosts = useCallback(async () => {
    try {
      const response = await fetch('/api/posts?status=approved');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch approved posts');
      }

      // Convert to ApprovedPost format
      const approvedPosts: ApprovedPost[] = data.data?.map((post: any) => ({
        id: post.id,
        insightId: post.insightId,
        title: post.title,
        content: post.content,
        platform: post.platform,
        status: post.status,
        characterCount: post.characterCount,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt),
        insightTitle: post.insightTitle,
        transcriptTitle: post.transcriptTitle
      })) || [];

      dispatch({ type: 'SET_APPROVED_POSTS', payload: approvedPosts });
    } catch (error) {
      console.error('Failed to fetch approved posts:', error);
    }
  }, []);


  // Fetch approved posts on mount (only if not initially loaded)
  useEffect(() => {
    if (initialApprovedPosts.length === 0) {
      fetchApprovedPosts();
    }
  }, [fetchApprovedPosts, initialApprovedPosts.length]);

  // Calendar actions
  const actions: CalendarActions = {
    setView: useCallback((view: CalendarView) => {
      dispatch({ type: 'SET_VIEW', payload: view });
      // Fetch events after changing view since date range may have changed
      setTimeout(() => fetchEvents(), 0);
    }, [fetchEvents]),

    navigateToDate: useCallback((date: Date) => {
      dispatch({ type: 'SET_DATE', payload: date });
      // Fetch events after changing date
      setTimeout(() => fetchEvents(), 0);
    }, [fetchEvents]),

    navigatePrevious: useCallback(() => {
      let prevDate: Date;

      switch (state.view) {
        case 'day':
          prevDate = subDays(state.currentDate, 1);
          break;
        case 'week':
          prevDate = subWeeks(state.currentDate, 1);
          break;
        case 'month':
          prevDate = subMonths(state.currentDate, 1);
          break;
        default:
          prevDate = subWeeks(state.currentDate, 1);
      }

      dispatch({ type: 'SET_DATE', payload: prevDate });
      // Fetch events after changing date
      setTimeout(() => fetchEvents(), 0);
    }, [state.currentDate, state.view, fetchEvents]),

    navigateNext: useCallback(() => {
      let nextDate: Date;

      switch (state.view) {
        case 'day':
          nextDate = addDays(state.currentDate, 1);
          break;
        case 'week':
          nextDate = addWeeks(state.currentDate, 1);
          break;
        case 'month':
          nextDate = addMonths(state.currentDate, 1);
          break;
        default:
          nextDate = addWeeks(state.currentDate, 1);
      }

      dispatch({ type: 'SET_DATE', payload: nextDate });
      // Fetch events after changing date
      setTimeout(() => fetchEvents(), 0);
    }, [state.currentDate, state.view, fetchEvents]),

    navigateToday: useCallback(() => {
      dispatch({ type: 'SET_DATE', payload: new Date() });
      // Fetch events after changing to today
      setTimeout(() => fetchEvents(), 0);
    }, [fetchEvents]),

    refreshEvents: useCallback(async () => {
      await fetchEvents();
    }, [fetchEvents]),

    updateEventDateTime: useCallback(async (eventId: string, newDateTime: Date) => {
      try {
        const response = await fetch(`/api/scheduler/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            scheduledTime: newDateTime.toISOString()
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to reschedule event');
        }

        // Update event in local state
        const updatedEvent: CalendarEvent = {
          ...data.data,
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt)
        };

        dispatch({ type: 'UPDATE_EVENT', payload: { id: eventId, event: updatedEvent } });
      } catch (error) {
        console.error('Failed to update event:', error);
        throw error;
      }
    }, []),

    deleteEvent: useCallback(async (eventId: string) => {
      try {
        const response = await fetch(`/api/scheduler/events/${eventId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete event');
        }

        dispatch({ type: 'REMOVE_EVENT', payload: eventId });
      } catch (error) {
        console.error('Failed to delete event:', error);
        throw error;
      }
    }, []),

    createEvent: useCallback((timeSlot: Date, platform?: Platform) => {
      // Instead of creating a free-form event, open post selection modal
      setModal({
        isOpen: true,
        mode: 'create',
        initialDateTime: timeSlot,
        initialPlatform: platform,
        onSave: async (data) => {
          // Require postId - this will be handled by the updated modal
          if (!data.postId) {
            throw new Error('You must select a post to schedule');
          }

          const response = await fetch('/api/scheduler/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              postId: data.postId,
              platform: data.platform,
              content: data.content,
              datetime: data.scheduledTime
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to schedule post');
          }

          // Refresh events after creation
          await fetchEvents();
          setModal({ isOpen: false, mode: 'create' });
        },
        onClose: () => setModal({ isOpen: false, mode: 'create' })
      });
    }, [fetchEvents])
  };

  // Client-side filtering to avoid unnecessary refetching
  const filteredEvents = React.useMemo(() => {
    return state.events.filter(event => {
      // Platform filter
      if (filters.platforms && filters.platforms.length > 0) {
        if (!filters.platforms.includes(event.platform)) {
          return false;
        }
      }
      
      // Status filter
      if (filters.status && filters.status !== 'all') {
        if (event.status !== filters.status) {
          return false;
        }
      }
      
      return true;
    });
  }, [state.events, filters.platforms, filters.status]);

  // Client-side filtering for approved posts (by platform)
  const filteredApprovedPosts = React.useMemo(() => {
    return state.approvedPosts.filter(post => {
      // Platform filter
      if (filters.platforms && filters.platforms.length > 0) {
        if (!filters.platforms.includes(post.platform)) {
          return false;
        }
      }
      
      return true;
    });
  }, [state.approvedPosts, filters.platforms]);

  const contextValue: CalendarContextValue = {
    state: {
      ...state,
      events: filteredEvents,
      approvedPosts: filteredApprovedPosts
    },
    actions,
    modal,
    setModal,
    filters,
    setFilters
  };

  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  );
}

// Hook to use calendar context
export function useCalendar(): CalendarContextValue {
  const context = useContext(CalendarContext);
  
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  
  return context;
}