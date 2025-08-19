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
 * Generates optimal time slots for social media posting
 */
export const getOptimalTimeSlots = (platform: string): Array<{ hour: number; minute: number }> => {
  const slots = {
    linkedin: [
      { hour: 8, minute: 0 },   // 8:00 AM
      { hour: 12, minute: 0 },  // 12:00 PM
      { hour: 17, minute: 0 },  // 5:00 PM
      { hour: 9, minute: 30 },  // 9:30 AM
      { hour: 14, minute: 30 }  // 2:30 PM
    ],
    x: [
      { hour: 9, minute: 0 },   // 9:00 AM
      { hour: 15, minute: 0 },  // 3:00 PM
      { hour: 18, minute: 0 },  // 6:00 PM
      { hour: 11, minute: 30 }, // 11:30 AM
      { hour: 20, minute: 0 }   // 8:00 PM
    ]
  };

  return slots[platform.toLowerCase() as keyof typeof slots] || slots.linkedin;
};

/**
 * Suggests available time slots avoiding conflicts
 */
export const suggestTimeSlots = (
  platform: string,
  scheduledPosts: Array<{ platform: string; scheduledDate?: string }>,
  daysAhead: number = 14
): string[] => {
  const today = new Date();
  const suggestions: string[] = [];
  const optimalTimes = getOptimalTimeSlots(platform);
  
  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + dayOffset);
    checkDate.setHours(0, 0, 0, 0);
    
    for (const time of optimalTimes) {
      const slotDateTime = new Date(checkDate);
      slotDateTime.setHours(time.hour, time.minute);
      
      // Skip past times
      if (slotDateTime <= new Date()) continue;
      
      // Check if this slot is available (30 minute buffer)
      const isSlotTaken = scheduledPosts.some(post => {
        if (post.platform !== platform || !post.scheduledDate) return false;
        const postDate = new Date(post.scheduledDate);
        return Math.abs(postDate.getTime() - slotDateTime.getTime()) < 30 * 60 * 1000;
      });
      
      if (!isSlotTaken) {
        suggestions.push(slotDateTime.toISOString());
        if (suggestions.length >= 5) return suggestions;
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