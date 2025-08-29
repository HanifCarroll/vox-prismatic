'use server';

import { apiClient } from '@/lib/api-client';
import type { DashboardData } from '@/types';
import {
  withErrorHandling,
  createResponse,
  createErrorResponse,
} from './lib/action-utils';

/**
 * Dashboard Server Actions
 * Server actions for fetching dashboard data
 */

/**
 * Fetch comprehensive dashboard data
 */
export const getDashboard = withErrorHandling(async () => {
  const response = await apiClient.get<DashboardData>('/api/dashboard');
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch dashboard data');
  }

  if (!response.data) {
    return createErrorResponse('No dashboard data available', 'NOT_FOUND', 404);
  }
  
  // Transform activity timestamps to Date objects
  if (response.data.activity) {
    response.data.activity = response.data.activity.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp).toISOString(),
    }));
  }
  
  return createResponse(response.data);
});

/**
 * Fetch dashboard counts only (lighter endpoint for counts)
 */
export const getDashboardCounts = withErrorHandling(async () => {
  const response = await apiClient.get('/api/dashboard');
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch dashboard counts');
  }

  if (!response.data) {
    return createErrorResponse('No dashboard data available', 'NOT_FOUND', 404);
  }
  
  // Return only the counts portion
  const counts = (response.data as any)?.counts;
  
  if (!counts) {
    return createErrorResponse('No counts data available', 'NOT_FOUND', 404);
  }

  return createResponse(counts);
});