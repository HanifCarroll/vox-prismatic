'use client';

import dynamic from 'next/dynamic';
import { CalendarSkeleton } from './CalendarSkeleton';
import { useState, useEffect } from 'react';

/**
 * CalendarClientWrapper - Client-only wrapper for the Calendar component
 * Uses Next.js dynamic import with ssr: false to prevent server-side rendering
 * This completely eliminates hydration mismatches by ensuring the calendar
 * only renders on the client side
 */
const CalendarClient = dynamic(
  () => import('./Calendar').then((mod) => mod.Calendar),
  { 
    ssr: false,
    loading: () => <CalendarSkeleton />
  }
);

export function CalendarClientWrapper() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Add a small delay to ensure smooth transition
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className={`h-full flex flex-col transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <CalendarClient />
    </div>
  );
}