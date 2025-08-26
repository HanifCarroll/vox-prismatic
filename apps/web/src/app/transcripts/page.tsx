import type { TranscriptView, ApiResponse } from '@/types/database';
import TranscriptsClient from './TranscriptsClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Server-side API call to fetch transcripts
async function getTranscripts(): Promise<TranscriptView[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcripts`, {
      // Enable server-side caching with revalidation
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch transcripts: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<TranscriptView[]> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch transcripts');
    }

    // Convert date strings back to Date objects
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

// Server Component - fetches data from API and renders the page
export default async function TranscriptsPage() {
  // Fetch transcripts from the API server
  const transcripts = await getTranscripts();

  return <TranscriptsClient initialTranscripts={transcripts} />;
}