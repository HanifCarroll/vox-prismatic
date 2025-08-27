/**
 * Server-side post fetching utilities
 * Used by Server Components for SSR
 */

import type { PostView, ApiResponse } from '@/types/database';
import { getApiBaseUrl } from '@/lib/api-config';

const API_BASE_URL = getApiBaseUrl();

export interface ServerPostFilters {
  status?: string;
  platform?: string;
  insightId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fetch posts with filters on the server-side
 */
export async function fetchPosts(filters: ServerPostFilters = {}): Promise<PostView[]> {
  try {
    const searchParams = new URLSearchParams();
    
    // Add filters to search params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    
    const queryString = searchParams.toString();
    const endpoint = `/api/posts${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      // Enable server-side caching with revalidation
      next: { revalidate: 60 }, // Revalidate every 60 seconds
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json; charset=utf-8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<PostView[]> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch posts');
    }

    // Convert date strings to Date objects
    return data.data.map(post => ({
      ...post,
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt),
    }));
  } catch (error) {
    console.error('Failed to fetch posts from API:', error);
    // Return empty array on error to prevent page from breaking
    return [];
  }
}

/**
 * Fetch single post by ID on the server-side
 */
export async function fetchPost(id: string): Promise<PostView | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
      next: { revalidate: 30 }, // Shorter cache for individual items
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json; charset=utf-8',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch post: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<PostView> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch post');
    }

    // Convert date strings to Date objects
    return {
      ...data.data,
      createdAt: new Date(data.data.createdAt),
      updatedAt: new Date(data.data.updatedAt),
    };
  } catch (error) {
    console.error(`Failed to fetch post ${id} from API:`, error);
    return null;
  }
}