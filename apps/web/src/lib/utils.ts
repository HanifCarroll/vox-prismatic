import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities that prevent hydration mismatches
export const dateUtils = {
  /**
   * Safe date formatter that prevents hydration mismatches
   * Returns a placeholder on server, actual formatted date on client
   */
  formatSafe: (date: Date, formatString: string = 'MMM d, yyyy'): string => {
    if (typeof window === 'undefined') {
      // Server-side: return ISO string as fallback to prevent hydration mismatch
      return date.toISOString().split('T')[0] // Just the date part: YYYY-MM-DD
    }
    // Client-side: return properly formatted date
    return format(date, formatString)
  },

  /**
   * Format date with time, safe for SSR
   */
  formatDateTime: (date: Date): string => {
    if (typeof window === 'undefined') {
      return date.toISOString().split('T')[0] // Server fallback
    }
    return format(date, 'MMM d, yyyy h:mm a')
  },

  /**
   * Format date for compact display (cards, lists)
   */
  formatCompact: (date: Date): string => {
    if (typeof window === 'undefined') {
      return date.toISOString().split('T')[0]
    }
    return format(date, 'MMM d, yyyy')
  },

  /**
   * Format date for detailed display (modals, full views)
   */
  formatDetailed: (date: Date): string => {
    if (typeof window === 'undefined') {
      return date.toISOString()
    }
    return format(date, 'EEEE, MMMM d, yyyy \'at\' h:mm a')
  },

  /**
   * Format relative time (e.g., "2 hours ago", "in 3 days")
   * Falls back to absolute date on server
   */
  formatRelative: (date: Date): string => {
    if (typeof window === 'undefined') {
      return date.toISOString().split('T')[0]
    }
    
    try {
      if (isToday(date)) {
        return `Today at ${format(date, 'h:mm a')}`
      }
      if (isTomorrow(date)) {
        return `Tomorrow at ${format(date, 'h:mm a')}`
      }
      if (isYesterday(date)) {
        return `Yesterday at ${format(date, 'h:mm a')}`
      }
      
      // For dates within a week, show relative time
      const now = new Date()
      const diffInDays = Math.abs((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffInDays < 7) {
        const distance = formatDistanceToNow(date, { addSuffix: true })
        return distance.charAt(0).toUpperCase() + distance.slice(1)
      }
      
      // For older dates, show absolute date
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      // Fallback to safe format if anything goes wrong
      return dateUtils.formatCompact(date)
    }
  },

  /**
   * Format time only (for schedule inputs, time displays)
   */
  formatTime: (date: Date): string => {
    if (typeof window === 'undefined') {
      return date.toISOString().split('T')[1]?.split('.')[0] || '00:00:00'
    }
    return format(date, 'h:mm a')
  },

  /**
   * Format for schedule labels (combines relative + absolute as needed)
   */
  formatScheduleLabel: (date: Date): string => {
    if (typeof window === 'undefined') {
      return date.toISOString().split('T')[0]
    }

    const now = new Date()
    const timeStr = format(date, 'h:mm a')

    if (isToday(date)) {
      return `Today at ${timeStr}`
    }
    if (isTomorrow(date)) {
      return `Tomorrow at ${timeStr}`
    }
    
    // For dates within this week, show day name
    const diffInDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (diffInDays > 0 && diffInDays <= 7) {
      return format(date, 'EEEE \'at\' h:mm a')
    }
    
    // For other dates, show full format
    return format(date, 'EEE, MMM d \'at\' h:mm a')
  }
}

/**
 * Hook-like function for components that need to re-render when hydration completes
 * This ensures the correct date format shows up after client-side hydration
 */
export function useSafeDate() {
  if (typeof window === 'undefined') {
    return { isClient: false }
  }
  return { isClient: true }
}