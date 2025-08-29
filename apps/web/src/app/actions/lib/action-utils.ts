'use server';

import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Result } from '@/types';

/**
 * Server Action Utilities
 * Shared utilities for authentication, validation, and error handling
 */

// Error types for better error handling
export class ActionError extends Error {
  constructor(
    message: string,
    public code: string = 'ACTION_ERROR',
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ActionError';
  }
}

export class AuthenticationError extends ActionError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_REQUIRED', 401);
  }
}

export class AuthorizationError extends ActionError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ValidationError extends ActionError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

/**
 * Verify user authentication
 * TODO: Implement actual auth check based on your auth system
 */
export const verifyAuth = cache(async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session');
  
  if (!sessionToken) {
    throw new AuthenticationError();
  }
  
  // TODO: Verify session token with your auth provider
  // For now, return a mock user
  return {
    id: 'user-1',
    email: 'user@example.com',
    role: 'user'
  };
});

/**
 * Check if user has required role
 */
export async function requireRole(requiredRole: string) {
  const user = await verifyAuth();
  
  if (user.role !== requiredRole && user.role !== 'admin') {
    throw new AuthorizationError();
  }
  
  return user;
}

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
 * Create a typed server action response
 */
export function createResponse<T>(
  data: T,
  meta?: Record<string, any>
): Result<T> & { meta?: Record<string, any> } {
  return {
    success: true,
    data,
    ...(meta && { meta })
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: string,
  code?: string,
  statusCode?: number
): Result<never> {
  return {
    success: false,
    error: {
      message: error,
      code,
      statusCode
    } as any
  };
}

/**
 * Rate limiting helper
 * TODO: Implement actual rate limiting with Redis or similar
 */
export async function rateLimit(
  identifier: string,
  limit: number = 10,
  window: number = 60000
): Promise<void> {
  // Placeholder for rate limiting logic
  // In production, use Redis or similar to track requests
  return;
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