'use client';

import TimeAgo from 'react-timeago';

interface TimeAgoProps {
  date: Date | string;
  className?: string;
  live?: boolean;
}

/**
 * Displays relative time (e.g., "2 hours ago", "in 3 days")
 * SSR-safe component that prevents hydration mismatches
 */
export function TimeAgoDisplay({ date, className, live = true }: TimeAgoProps) {
  return (
    <TimeAgo 
      date={date} 
      className={className}
      live={live}
      minPeriod={60} // Update every minute
    />
  );
}