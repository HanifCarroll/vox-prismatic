
import dynamic from 'next/dynamic';
import { CalendarSkeleton } from './CalendarSkeleton';
import { useState, useEffect } from 'react';
import { URLStateManager } from './URLStateManager';

/**
 * CalendarClientWrapper - Client-only wrapper for the Calendar component
 * Now manages URL state for shareable calendar views
 */
const CalendarClient = dynamic(
  () => import('./Calendar').then((mod) => mod.Calendar),
  { 
    ssr: false,
    loading: () => <CalendarSkeleton />
  }
);

interface CalendarClientWrapperProps {
  initialView: 'day' | 'week' | 'month';
  initialDate: Date;
  initialFilters: {
    platforms?: string[];
    status?: string;
  };
}

export function CalendarClientWrapper({
  initialView,
  initialDate,
  initialFilters
}: CalendarClientWrapperProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Add a small delay to ensure smooth transition
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <URLStateManager
      initialView={initialView}
      initialDate={initialDate}
      initialFilters={initialFilters}
    >
      <div className={`h-full flex flex-col transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <CalendarClient />
      </div>
    </URLStateManager>
  );
}