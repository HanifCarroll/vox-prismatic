/**
 * Server-side insight fetching utilities
 * Used by Server Components for SSR
 */

import type { InsightView, ApiResponse } from '@/types/database';
import { getApiBaseUrl } from '@/lib/api-config';

const API_BASE_URL = getApiBaseUrl();

/**
 * Fetch all insights on the server-side
 */
export async function fetchInsights(): Promise<InsightView[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/insights`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch insights: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<InsightView[]> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch insights');
    }

    // Convert date strings to Date objects
    return data.data.map(insight => ({
      ...insight,
      createdAt: new Date(insight.createdAt),
      updatedAt: new Date(insight.updatedAt),
    }));
  } catch (error) {
    console.error('Failed to fetch insights from API:', error);
    // Return empty array on error to prevent page from breaking
    return [];
  }
}

/**
 * Fetch single insight by ID on the server-side
 */
export async function fetchInsight(id: string): Promise<InsightView | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/insights/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch insight: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<InsightView> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch insight');
    }

    // Convert date strings to Date objects
    return {
      ...data.data,
      createdAt: new Date(data.data.createdAt),
      updatedAt: new Date(data.data.updatedAt),
    };
  } catch (error) {
    console.error(`Failed to fetch insight ${id} from API:`, error);
    return null;
  }
}