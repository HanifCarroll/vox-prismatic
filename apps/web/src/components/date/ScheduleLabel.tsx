'use client';

import TimeAgo from 'react-timeago';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';

interface ScheduleLabelProps {
  date: Date | string;
  className?: string;
}

/**
 * Custom formatter for schedule labels
 * Shows "Today at 2:30 PM", "Tomorrow at 3:00 PM", etc.
 */
const scheduleFormatter = (value: number, unit: string, suffix: string, epochMilliseconds: number) => {
  const date = new Date(epochMilliseconds);
  const now = new Date();
  const timeStr = format(date, 'h:mm a');
  
  if (isToday(date)) {
    return `Today at ${timeStr}`;
  }
  
  if (isTomorrow(date)) {
    return `Tomorrow at ${timeStr}`;
  }
  
  const daysDiff = differenceInDays(date, now);
  
  // For dates within a week, show day name
  if (daysDiff > 0 && daysDiff <= 7) {
    return format(date, "EEEE 'at' h:mm a");
  }
  
  // For other dates, show full format
  return format(date, "EEE, MMM d 'at' h:mm a");
};

/**
 * Displays schedule-friendly date labels
 * Perfect for scheduling modals and calendar views
 * SSR-safe component that prevents hydration mismatches
 */
export function ScheduleLabel({ date, className }: ScheduleLabelProps) {
  return (
    <TimeAgo 
      date={date} 
      className={className}
      formatter={scheduleFormatter}
      live={false} // Static label, no updates
    />
  );
}