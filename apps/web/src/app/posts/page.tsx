import type { PostView, ApiResponse } from '@/types/database';
import PostsClient from './PostsClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Server-side API call to fetch posts
async function getPosts(): Promise<PostView[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      // Enable server-side caching with revalidation
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<PostView[]> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch posts');
    }

    // Convert date strings back to Date objects
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

// Server Component - fetches data from API and renders the page
export default async function PostsPage() {
  // Fetch posts from the API server
  const posts = await getPosts();

  return <PostsClient initialPosts={posts} />;
}