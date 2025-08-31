/**
 * Action Helper Utilities
 * Shared utilities for server actions (synchronous functions)
 */

import type { Result } from '@/types';
import { ActionError } from './action-errors';

/**
 * Wrap server action with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  action: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await action(...args);
    } catch (error) {
      console.error('Server action error:', error);
      
      if (error instanceof ActionError) {
        return {
          success: false,
          error: error.message,
          code: error.code,
          statusCode: error.statusCode
        };
      }
      
      // Generic error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        statusCode: 500
      };
    }
  }) as T;
}

/**
 * Parse and validate FormData
 */
export function parseFormData<T extends Record<string, any>>(
  formData: FormData,
  fields: Array<keyof T>
): T {
  const result = {} as T;
  
  for (const field of fields) {
    const value = formData.get(field as string);
    if (value !== null) {
      result[field] = value as T[keyof T];
    }
  }
  
  return result;
}



/**
 * Cache tags for granular invalidation
 */
export const CACHE_TAGS = {
  transcripts: {
    all: 'transcripts',
    list: 'transcripts:list',
    detail: (id: string) => `transcripts:${id}`,
    byStatus: (status: string) => `transcripts:status:${status}`
  },
  insights: {
    all: 'insights',
    list: 'insights:list',
    detail: (id: string) => `insights:${id}`,
    byTranscript: (transcriptId: string) => `insights:transcript:${transcriptId}`,
    byStatus: (status: string) => `insights:status:${status}`
  },
  posts: {
    all: 'posts',
    list: 'posts:list',
    detail: (id: string) => `posts:${id}`,
    byInsight: (insightId: string) => `posts:insight:${insightId}`,
    byStatus: (status: string) => `posts:status:${status}`,
    byPlatform: (platform: string) => `posts:platform:${platform}`
  },
  dashboard: 'dashboard',
  sidebar: 'sidebar'
} as const;

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: {
  page?: string | number;
  limit?: string | number;
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}