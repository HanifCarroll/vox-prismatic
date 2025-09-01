/**
 * Date and Time Utilities
 * Provides consistent date/time formatting and manipulation across the application
 */

export class DateUtils {
  /**
   * Format a date to a relative time string (e.g., "2 hours ago")
   */
  static formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  }
  
  /**
   * Format date to display string
   */
  static formatDate(date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string {
    const d = new Date(date);
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case 'long':
        return d.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'medium':
      default:
        return d.toLocaleDateString('en-US', { 
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
    }
  }
  
  /**
   * Format time to display string
   */
  static formatTime(date: Date | string, includeSeconds = false): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined
    });
  }
  
  /**
   * Format date and time together
   */
  static formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return `${this.formatDate(d)} at ${this.formatTime(d)}`;
  }
  
  /**
   * Get time until a future date
   */
  static getTimeUntil(date: Date | string): string {
    const now = new Date();
    const future = new Date(date);
    const diff = future.getTime() - now.getTime();
    
    if (diff < 0) return 'Past';
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'Soon';
  }
  
  /**
   * Format duration in milliseconds to human-readable string
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
  
  /**
   * Check if date is today
   */
  static isToday(date: Date | string): boolean {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }
  
  /**
   * Check if date is yesterday
   */
  static isYesterday(date: Date | string): boolean {
    const d = new Date(date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  }
  
  /**
   * Check if date is within the last N days
   */
  static isWithinDays(date: Date | string, days: number): boolean {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));
    return daysDiff <= days;
  }
  
  /**
   * Get start of day
   */
  static startOfDay(date: Date | string = new Date()): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  
  /**
   * Get end of day
   */
  static endOfDay(date: Date | string = new Date()): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  
  /**
   * Get start of week (Monday)
   */
  static startOfWeek(date: Date | string = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return this.startOfDay(monday);
  }
  
  /**
   * Get end of week (Sunday)
   */
  static endOfWeek(date: Date | string = new Date()): Date {
    const start = this.startOfWeek(date);
    const sunday = new Date(start);
    sunday.setDate(sunday.getDate() + 6);
    return this.endOfDay(sunday);
  }
  
  /**
   * Get start of month
   */
  static startOfMonth(date: Date | string = new Date()): Date {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  
  /**
   * Get end of month
   */
  static endOfMonth(date: Date | string = new Date()): Date {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  
  /**
   * Add days to a date
   */
  static addDays(date: Date | string, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
  
  /**
   * Add hours to a date
   */
  static addHours(date: Date | string, hours: number): Date {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
  }
  
  /**
   * Add minutes to a date
   */
  static addMinutes(date: Date | string, minutes: number): Date {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  }
  
  /**
   * Get optimal posting times for social media
   */
  static getOptimalPostingTimes(platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram'): Date[] {
    const times: Date[] = [];
    const today = new Date();
    
    // Platform-specific optimal times (simplified)
    const optimalHours: Record<string, number[]> = {
      linkedin: [7, 12, 17], // 7am, 12pm, 5pm
      twitter: [9, 12, 15, 19], // 9am, 12pm, 3pm, 7pm
      facebook: [9, 13, 16, 19], // 9am, 1pm, 4pm, 7pm
      instagram: [6, 11, 13, 19] // 6am, 11am, 1pm, 7pm
    };
    
    const hours = optimalHours[platform] || [9, 12, 17];
    
    // Generate times for next 7 days
    for (let day = 0; day < 7; day++) {
      const date = this.addDays(today, day);
      for (const hour of hours) {
        const time = new Date(date);
        time.setHours(hour, 0, 0, 0);
        if (time > today) {
          times.push(time);
        }
      }
    }
    
    return times;
  }
  
  /**
   * Format date for API
   */
  static toApiFormat(date: Date | string): string {
    return new Date(date).toISOString();
  }
  
  /**
   * Parse date from API
   */
  static fromApiFormat(dateString: string): Date {
    return new Date(dateString);
  }
  
  /**
   * Get calendar week number
   */
  static getWeekNumber(date: Date | string = new Date()): number {
    const d = new Date(date);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }
}