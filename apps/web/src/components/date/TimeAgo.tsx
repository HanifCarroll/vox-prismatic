
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

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
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // On server and initial client render, show simple format
  if (!mounted) {
    return (
      <span className={className}>
        {dateObj.toISOString().split('T')[0]}
      </span>
    );
  }

  // After hydration, show relative time
  const relativeTime = formatDistanceToNow(dateObj, { addSuffix: true });
  
  return (
    <span className={className}>
      {relativeTime.charAt(0).toUpperCase() + relativeTime.slice(1)}
    </span>
  );
}