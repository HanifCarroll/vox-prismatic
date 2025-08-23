import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Utility functions for common operations
 */

/**
 * Creates debug directory if it doesn't exist
 */
export const ensureDebugDir = (): void => {
  try {
    mkdirSync(join('debug'), { recursive: true });
  } catch (error) {
    // Directory already exists, ignore
  }
};

/**
 * Saves data to debug file with timestamp
 */
export const saveToDebugFile = (filename: string, data: any): void => {
  ensureDebugDir();
  const timestamp = Date.now();
  const fullPath = join('debug', `${filename}-${timestamp}.json`);
  writeFileSync(fullPath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved debug data to ${fullPath}`);
};

/**
 * Formats duration for display
 */
export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  return `${(milliseconds / 1000).toFixed(1)}s`;
};

/**
 * Formats cost for display
 */
export const formatCost = (cost: number): string => 
  `$${cost.toFixed(4)}`;

/**
 * Formats number with locale
 */
export const formatNumber = (num: number): string => 
  num.toLocaleString();

/**
 * Creates a summary object for metrics
 */
export const createMetricsSummary = (metrics: any[]): any => ({
  timestamp: new Date().toISOString(),
  totalItems: metrics.length,
  successful: metrics.filter(m => m.success).length,
  failed: metrics.filter(m => !m.success).length,
  totalDuration: metrics.reduce((sum, m) => sum + (m.duration || 0), 0),
  totalCost: metrics.reduce((sum, m) => sum + (m.estimatedCost || 0), 0),
  totalTokens: metrics.reduce((sum, m) => sum + (m.estimatedTokensUsed || 0), 0),
  metrics
});

/**
 * Validates selection input
 */
export const parseSelection = (input: string, maxItems: number): number[] => {
  if (input.toLowerCase() === 'a') {
    return Array.from({ length: maxItems }, (_, i) => i + 1);
  }
  
  const numbers = input.split(',')
    .map(n => parseInt(n.trim()))
    .filter(n => !isNaN(n) && n >= 1 && n <= maxItems);
    
  return Array.from(new Set(numbers)); // Remove duplicates
};

/**
 * Suggests simple time slots across the next few days
 * No platform-specific optimizations since audiences may be in different timezones
 */
export const suggestTimeSlots = (
  platform: string,
  scheduledPosts: Array<{ platform: string; scheduledDate?: string }>,
  daysAhead: number = 7
): string[] => {
  const now = new Date();
  const suggestions: string[] = [];
  
  // Simple hourly suggestions from 9 AM to 6 PM
  const hours = [9, 12, 15, 18]; // 9 AM, 12 PM, 3 PM, 6 PM
  
  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + dayOffset);
    
    for (const hour of hours) {
      const slotDateTime = new Date(checkDate);
      slotDateTime.setHours(hour, 0, 0, 0);
      
      // Skip past times
      if (slotDateTime <= now) {
        continue;
      }
      
      // Check if this slot is available (1 hour buffer)
      const isSlotTaken = scheduledPosts.some(post => {
        if (!post.scheduledDate) return false;
        
        const postDate = new Date(post.scheduledDate);
        const timeDiff = Math.abs(postDate.getTime() - slotDateTime.getTime());
        
        // Case-insensitive platform comparison to handle API differences
        const platformsMatch = post.platform?.toLowerCase() === platform.toLowerCase();
        const isConflict = platformsMatch && timeDiff < 60 * 60 * 1000;
        
        return isConflict;
      });
      
      if (!isSlotTaken) {
        suggestions.push(slotDateTime.toISOString());
        if (suggestions.length >= 4) return suggestions;
      }
    }
  }
  
  return suggestions;
};

/**
 * Validates and parses custom date/time input
 */
export const parseCustomDateTime = (dateStr: string, timeStr: string): Date | null => {
  let targetDate: Date;
  const today = new Date();
  
  switch (dateStr.toLowerCase()) {
    case 'today':
      targetDate = new Date(today);
      break;
    case 'tomorrow':
      targetDate = new Date(today);
      targetDate.setDate(today.getDate() + 1);
      break;
    default:
      targetDate = new Date(dateStr + 'T00:00:00');
      if (isNaN(targetDate.getTime())) {
        return null;
      }
  }
  
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return null;
  
  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);
  
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  
  targetDate.setHours(hour, minute, 0, 0);
  
  // Check if the time is in the past
  if (targetDate <= new Date()) {
    return null;
  }
  
  return targetDate;
};

/**
 * Retry function with exponential backoff
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

