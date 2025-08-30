
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns";
import { useEffect, useState } from "react";

interface DateDisplayProps {
  date: Date | string;
  className?: string;
  showTime?: boolean;
}

/**
 * SSR-safe date component that prevents hydration mismatches
 * Shows consistent format on server and client
 */
export function DateDisplay({
  date,
  className,
  showTime = false,
}: DateDisplayProps) {
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

  // After hydration, show enhanced format
  const formatString = showTime ? "MMM d, yyyy h:mm a" : "MMM d, yyyy";
  
  return (
    <span className={className}>
      {format(dateObj, formatString)}
    </span>
  );
}

/**
 * Displays date with time
 * Alias for DateDisplay with showTime=true
 */
export function DateTimeDisplay({
  date,
  className,
}: Omit<DateDisplayProps, "showTime">) {
  return <DateDisplay date={date} className={className} showTime={true} />;
}
