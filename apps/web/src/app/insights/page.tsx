import type { InsightView, ApiResponse } from '@/types/database';
import InsightsClient from './InsightsClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Server-side API call to fetch insights
async function getInsights(): Promise<InsightView[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/insights`, {
      // Enable server-side caching with revalidation
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch insights: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<InsightView[]> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch insights');
    }

    // Convert date strings back to Date objects
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

// Server Component - fetches data from API and renders the page
export default async function InsightsPage() {
  // Fetch insights from the API server
  const insights = await getInsights();

  return <InsightsClient initialInsights={insights} />;
}