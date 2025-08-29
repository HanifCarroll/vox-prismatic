'use server';

import { apiClient } from '@/lib/api-client';
import type { DashboardData, Result } from '@/types';
import {
  createResponse
} from './lib/action-utils';

/**
 * Dashboard Server Actions
 * Server actions for fetching dashboard data
 */

/**
 * Fetch comprehensive dashboard data
 */
export async function getDashboard(): Promise<Result<DashboardData>> {
  try {
    const response = await apiClient.get<DashboardData>('/api/dashboard');
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to fetch dashboard data'
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: 'No dashboard data available'
      };
    }
  
    // Transform activity timestamps to Date objects
    if (response.data.activity) {
      response.data.activity = response.data.activity.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp).toISOString(),
      }));
    }
    
    return createResponse(response.data);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to fetch dashboard data:', error);
    throw new Error('Unable to load dashboard. Please try again.');
  }
}

/**
 * Fetch dashboard counts only (lighter endpoint for counts)
 */
export async function getDashboardCounts(): Promise<Result<any>> {
  try {
    const response = await apiClient.get('/api/dashboard');
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to fetch dashboard counts'
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: 'No dashboard data available'
      };
    }
  
    // Return only the counts portion
    const counts = (response.data as any)?.counts;
    
    if (!counts) {
      return {
        success: false,
        error: 'No counts data available'
      };
    }

    return createResponse(counts);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to fetch dashboard counts:', error);
    throw new Error('Unable to load dashboard counts. Please try again.');
  }
}