'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useEffect,
  ReactNode
} from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
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

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

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
  startDate: dayjs().startOf('isoWeek').toDate(),
  endDate: dayjs().endOf('isoWeek').toDate(),
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
      const { startDate, endDate } = getDateRangeForView(newView, state.currentDate);
      return {
        ...state,
        view: newView,
        startDate,
        endDate
      };
    }
    case 'SET_DATE': {
      const newDate = action.payload;
      const { startDate, endDate } = getDateRangeForView(state.view, newDate);
      return {
        ...state,
        currentDate: newDate,
        startDate,
        endDate
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
  const day = dayjs(date);
  
  switch (view) {
    case 'day':
      return {
        start: day.startOf('day').toDate(),
        end: day.endOf('day').toDate()
      };
    case 'week':
      return {
        start: day.startOf('isoWeek').toDate(),
        end: day.endOf('isoWeek').toDate()
      };
    case 'month':
      return {
        start: day.startOf('month').toDate(),
        end: day.endOf('month').toDate()
      };
    default:
      return {
        start: day.startOf('isoWeek').toDate(),
        end: day.endOf('isoWeek').toDate()
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
}

// Calendar provider component
export function CalendarProvider({
  children,
  initialView = 'week',
  initialDate = new Date()
}: CalendarProviderProps) {
  // Calendar state management
  const [state, dispatch] = useReducer(calendarReducer, {
    ...initialCalendarState,
    view: initialView,
    currentDate: initialDate,
    ...getDateRangeForView(initialView, initialDate)
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

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: undefined });

    try {
      // Ensure we have valid dates
      const startDate = state.startDate || getDateRangeForView(state.view, state.currentDate).start;
      const endDate = state.endDate || getDateRangeForView(state.view, state.currentDate).end;

      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        ...(filters.platforms && filters.platforms.length > 0 && {
          platforms: filters.platforms.join(',')
        }),
        ...(filters.status && filters.status !== 'all' && {
          status: filters.status
        })
      });

      const response = await fetch(`/api/scheduler/events?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      // Convert string dates to Date objects
      const events: CalendarEvent[] = data.data?.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
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
  }, [state.startDate, state.endDate, state.view, state.currentDate, filters]);

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

  // Refresh events when date range or filters change
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch approved posts on mount
  useEffect(() => {
    fetchApprovedPosts();
  }, [fetchApprovedPosts]);

  // Calendar actions
  const actions: CalendarActions = {
    setView: useCallback((view: CalendarView) => {
      dispatch({ type: 'SET_VIEW', payload: view });
    }, []),

    navigateToDate: useCallback((date: Date) => {
      dispatch({ type: 'SET_DATE', payload: date });
    }, []),

    navigatePrevious: useCallback(() => {
      const newDate = dayjs(state.currentDate);
      let prevDate: dayjs.Dayjs;

      switch (state.view) {
        case 'day':
          prevDate = newDate.subtract(1, 'day');
          break;
        case 'week':
          prevDate = newDate.subtract(1, 'week');
          break;
        case 'month':
          prevDate = newDate.subtract(1, 'month');
          break;
        default:
          prevDate = newDate.subtract(1, 'week');
      }

      dispatch({ type: 'SET_DATE', payload: prevDate.toDate() });
    }, [state.currentDate, state.view]),

    navigateNext: useCallback(() => {
      const newDate = dayjs(state.currentDate);
      let nextDate: dayjs.Dayjs;

      switch (state.view) {
        case 'day':
          nextDate = newDate.add(1, 'day');
          break;
        case 'week':
          nextDate = newDate.add(1, 'week');
          break;
        case 'month':
          nextDate = newDate.add(1, 'month');
          break;
        default:
          nextDate = newDate.add(1, 'week');
      }

      dispatch({ type: 'SET_DATE', payload: nextDate.toDate() });
    }, [state.currentDate, state.view]),

    navigateToday: useCallback(() => {
      dispatch({ type: 'SET_DATE', payload: new Date() });
    }, []),

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
          start: new Date(data.data.start),
          end: new Date(data.data.end),
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

  const contextValue: CalendarContextValue = {
    state,
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