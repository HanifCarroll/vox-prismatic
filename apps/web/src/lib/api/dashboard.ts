/**
 * Dashboard API Client
 * Client-side API calls for dashboard operations
 */

import { getApiBaseUrl } from '../api-config';
import type { DashboardData, Result } from '@/types';

const API_BASE_URL = getApiBaseUrl();

/**
 * Helper function for making API requests
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Dashboard API methods
 */
export const dashboardAPI = {
  /**
   * Fetch comprehensive dashboard data
   */
  async getDashboard(): Promise<Result<DashboardData>> {
    try {
      const response = await fetchAPI<DashboardData>('/api/dashboard');

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
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      throw new Error('Unable to load dashboard. Please try again.');
    }
  },

  /**
   * Fetch dashboard counts only (lighter endpoint for counts)
   */
  async getDashboardCounts(): Promise<Result<any>> {
    try {
      const response = await fetchAPI('/api/dashboard');
      
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

      return {
        success: true,
        data: counts
      };
    } catch (error) {
      console.error('Failed to fetch dashboard counts:', error);
      throw new Error('Unable to load dashboard counts. Please try again.');
    }
  },

  /**
   * Get actionable items for the dashboard
   */
  async getActionableItems(): Promise<Result<any>> {
    try {
      const response = await fetchAPI<any>('/api/dashboard/actionable');
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch actionable items'
        };
      }

      if (!response.data) {
        return {
          success: false,
          error: 'No actionable items available'
        };
      }

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch actionable items:', error);
      throw new Error('Unable to load actionable items. Please try again.');
    }
  }
};