/**
 * Server-side insight fetching utilities
 * Used by Server Components for SSR
 */

import type { InsightView, ApiResponse } from '@/types/database';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface ServerInsightFilters {
  status?: string;
  postType?: string;
  category?: string;
  minScore?: number;
  maxScore?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fetch insights with filters on the server-side
 */
export async function fetchInsights(filters: ServerInsightFilters = {}): Promise<InsightView[]> {
  try {
    const searchParams = new URLSearchParams();
    
    // Add filters to search params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    
    const queryString = searchParams.toString();
    const endpoint = `/api/insights${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      // Enable server-side caching with revalidation
      next: { revalidate: 60 }, // Revalidate every 60 seconds
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
      next: { revalidate: 30 }, // Shorter cache for individual items
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