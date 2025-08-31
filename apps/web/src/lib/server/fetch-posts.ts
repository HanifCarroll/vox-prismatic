/**
 * Server-side post fetching utilities
 * Used by Server Components for SSR
 */

import type { PostView, ApiResponse } from '@/types/database';
import { getApiBaseUrl } from '@/lib/api-config';

const API_BASE_URL = getApiBaseUrl();

/**
 * Fetch all posts on the server-side
 */
export async function fetchPosts(): Promise<PostView[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/posts`, {
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