'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import type { CalendarView } from '@/types/scheduler';

/**
 * URL State Manager for Scheduler
 * 
 * Manages calendar view state in the URL for:
 * - Shareable calendar views
 * - Browser back/forward navigation  
 * - Bookmarkable calendar states
 */

interface URLState {
  view: CalendarView;
  date: Date;
  filters: {
    platforms?: string[];
    status?: string;
  };
}

interface URLStateContext extends URLState {
  updateView: (view: CalendarView) => void;
  updateDate: (date: Date) => void;
  updateFilters: (filters: Partial<URLState['filters']>) => void;
  navigateToDate: (date: Date) => void;
  resetFilters: () => void;
}

const URLStateContext = createContext<URLStateContext | null>(null);

interface URLStateManagerProps {
  children: ReactNode;
  initialView: CalendarView;
  initialDate: Date;
  initialFilters: {
    platforms?: string[];
    status?: string;
  };
}

export function URLStateManager({
  children,
  initialView,
  initialDate,
  initialFilters
}: URLStateManagerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [searchParams] = useSearchParams();
  
  const [state, setState] = useState<URLState>({
    view: initialView,
    date: initialDate,
    filters: initialFilters
  });

  // Update URL when state changes
  const updateURL = useCallback((updates: Partial<URLState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    
    const params = new URLSearchParams(searchParams.toString());
    
    // Update URL params
    if (newState.view !== 'week') {
      params.set('view', newState.view);
    } else {
      params.delete('view'); // week is default
    }
    
    const today = new Date();
    const isToday = newState.date.toDateString() === today.toDateString();
    if (!isToday) {
      params.set('date', newState.date.toISOString().split('T')[0]);
    } else {
      params.delete('date'); // today is default
    }
    
    if (newState.filters.platforms && newState.filters.platforms.length > 0) {
      params.set('platforms', newState.filters.platforms.join(','));
    } else {
      params.delete('platforms');
    }
    
    if (newState.filters.status && newState.filters.status !== 'all') {
      params.set('status', newState.filters.status);
    } else {
      params.delete('status');
    }
    
    // Navigate to new URL
    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    navigate(newURL, { replace: true });
  }, [state, searchParams, pathname, navigate]);

  const updateView = useCallback((view: CalendarView) => {
    updateURL({ view });
  }, [updateURL]);

  const updateDate = useCallback((date: Date) => {
    updateURL({ date });
  }, [updateURL]);

  const updateFilters = useCallback((filters: Partial<URLState['filters']>) => {
    updateURL({ filters: { ...state.filters, ...filters } });
  }, [updateURL, state.filters]);

  const navigateToDate = useCallback((date: Date) => {
    updateURL({ date });
  }, [updateURL]);

  const resetFilters = useCallback(() => {
    updateURL({ filters: { platforms: [], status: 'all' } });
  }, [updateURL]);

  const contextValue: URLStateContext = {
    ...state,
    updateView,
    updateDate,
    updateFilters,
    navigateToDate,
    resetFilters
  };

  return (
    <URLStateContext.Provider value={contextValue}>
      {children}
    </URLStateContext.Provider>
  );
}

export function useURLState() {
  const context = useContext(URLStateContext);
  if (!context) {
    throw new Error('useURLState must be used within URLStateManager');
  }
  return context;
}

// Convenience hooks for granular subscriptions
export function useURLView() {
  const { view, updateView } = useURLState();
  return { view, updateView };
}

export function useURLDate() {
  const { date, updateDate, navigateToDate } = useURLState();
  return { date, updateDate, navigateToDate };
}

export function useURLFilters() {
  const { filters, updateFilters, resetFilters } = useURLState();
  return { filters, updateFilters, resetFilters };
}