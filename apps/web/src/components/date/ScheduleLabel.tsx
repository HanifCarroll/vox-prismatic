
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { useEffect, useState } from 'react';

interface ScheduleLabelProps {
  date: Date | string;
  className?: string;
}

/**
 * Displays schedule-friendly date labels
 * Perfect for scheduling modals and calendar views
 * SSR-safe component that prevents hydration mismatches
 */
export function ScheduleLabel({ date, className }: ScheduleLabelProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // On server and initial client render, show simple format
  if (!mounted) {
    return (
      <span className={className}>
        {format(dateObj, "MMM d, yyyy")}
      </span>
    );
  }

  // After hydration, show schedule-friendly format
  const now = new Date();
  const timeStr = format(dateObj, 'h:mm a');
  
  if (isToday(dateObj)) {
    return (
      <span className={className}>
        Today at {timeStr}
      </span>
    );
  }
  
  if (isTomorrow(dateObj)) {
    return (
      <span className={className}>
        Tomorrow at {timeStr}
      </span>
    );
  }
  
  const daysDiff = differenceInDays(dateObj, now);
  
  // For dates within a week, show day name
  if (daysDiff > 0 && daysDiff <= 7) {
    return (
      <span className={className}>
        {format(dateObj, "EEEE 'at' h:mm a")}
      </span>
    );
  }
  
  // For other dates, show full format
  return (
    <span className={className}>
      {format(dateObj, "EEE, MMM d 'at' h:mm a")}
    </span>
  );
}