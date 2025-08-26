/**
 * Server-side transcript fetching utilities
 * Used by Server Components for SSR
 */

import type { TranscriptView, ApiResponse } from '@/types/database';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

/**
 * Fetch all transcripts on the server-side
 */
export async function fetchTranscripts(): Promise<TranscriptView[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcripts`, {
      // Enable server-side caching with revalidation
      next: { revalidate: 60 }, // Revalidate every 60 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch transcripts: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<TranscriptView[]> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch transcripts');
    }

    // Convert date strings to Date objects
    return data.data.map(transcript => ({
      ...transcript,
      createdAt: new Date(transcript.createdAt),
      updatedAt: new Date(transcript.updatedAt),
    }));
  } catch (error) {
    console.error('Failed to fetch transcripts from API:', error);
    // Return empty array on error to prevent page from breaking
    return [];
  }
}

/**
 * Fetch single transcript by ID on the server-side
 */
export async function fetchTranscript(id: string): Promise<TranscriptView | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcripts/${id}`, {
      next: { revalidate: 30 }, // Shorter cache for individual items
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch transcript: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<TranscriptView> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch transcript');
    }

    // Convert date strings to Date objects
    return {
      ...data.data,
      createdAt: new Date(data.data.createdAt),
      updatedAt: new Date(data.data.updatedAt),
    };
  } catch (error) {
    console.error(`Failed to fetch transcript ${id} from API:`, error);
    return null;
  }
}