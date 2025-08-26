'use client';

import TimeAgo from 'react-timeago';
import { format } from 'date-fns';

interface DateDisplayProps {
  date: Date | string;
  className?: string;
  showTime?: boolean;
}

/**
 * Custom formatter for absolute dates
 * Shows "Jan 15, 2024" format
 */
const dateFormatter = (value: number, unit: string, suffix: string, epochMilliseconds: number) => {
  const date = new Date(epochMilliseconds);
  return format(date, 'MMM d, yyyy');
};

/**
 * Custom formatter for dates with time
 * Shows "Jan 15, 2024 2:30 PM" format
 */
const dateTimeFormatter = (value: number, unit: string, suffix: string, epochMilliseconds: number) => {
  const date = new Date(epochMilliseconds);
  return format(date, 'MMM d, yyyy h:mm a');
};

/**
 * Displays absolute date in a consistent format
 * SSR-safe component that prevents hydration mismatches
 */
export function DateDisplay({ date, className, showTime = false }: DateDisplayProps) {
  return (
    <TimeAgo 
      date={date} 
      className={className}
      formatter={showTime ? dateTimeFormatter : dateFormatter}
      live={false} // Static date, no updates
    />
  );
}

/**
 * Displays date with time
 * Alias for DateDisplay with showTime=true
 */
export function DateTimeDisplay({ date, className }: Omit<DateDisplayProps, 'showTime'>) {
  return <DateDisplay date={date} className={className} showTime={true} />;
}