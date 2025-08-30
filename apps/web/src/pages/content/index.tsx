
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import ContentClient from "@/components/content/ContentClient";
import { api } from "@/lib/api";
import type { TranscriptView, InsightView, PostView } from "@/types/database";

/**
 * Content page - Manage content from transcripts to published posts
 * Uses React Query for data fetching with URL-based filtering
 */

interface ContentData {
  transcripts: TranscriptView[];
  insights: InsightView[];
  posts: PostView[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchContentData(searchParams: URLSearchParams): Promise<ContentData> {
  const view = searchParams.get('view') || 'transcripts';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
  
  // Build params object from URL search params
  const params = Object.fromEntries(searchParams.entries());
  
  // Only fetch data for the active view
  let data: ContentData = {
    transcripts: [],
    insights: [],
    posts: [],
    pagination: { page, limit, total: 0, totalPages: 0 }
  };

  try {
    switch (view) {
      case 'transcripts': {
        const result = await api.transcripts.getTranscripts({
          status: params.status,
          search: params.search,
          sortBy: params.sort,
          sortOrder: params.order as 'asc' | 'desc',
          page,
          limit
        });
        
        if (result.success && result.data) {
          data.transcripts = result.data;
          if (result.meta?.pagination) {
            data.pagination = result.meta.pagination;
          }
        }
        break;
      }
      
      case 'insights': {
        const result = await api.insights.getInsights({
          status: params.status,
          category: params.category,
          postType: params.postType,
          scoreMin: params.scoreMin ? parseInt(params.scoreMin) : undefined,
          scoreMax: params.scoreMax ? parseInt(params.scoreMax) : undefined,
          search: params.search,
          sortBy: params.sort,
          sortOrder: params.order as 'asc' | 'desc',
          page,
          limit
        });
        
        if (result.success && result.data) {
          data.insights = result.data;
          if (result.meta?.pagination) {
            data.pagination = result.meta.pagination;
          }
        }
        break;
      }
      
      case 'posts': {
        const result = await api.posts.getPosts({
          status: params.status,
          platform: params.platform,
          search: params.search,
          sortBy: params.sort,
          sortOrder: params.order as 'asc' | 'desc',
          page,
          limit
        });
        
        if (result.success && result.data) {
          data.posts = result.data;
          if (result.meta?.pagination) {
            data.pagination = result.meta.pagination;
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Failed to fetch ${view} data:`, error);
    throw error;
  }
  
  return data;
}

export function ContentPage() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'transcripts';
  
  // Create a stable query key that includes all search params
  const queryKey = ['content', view, Object.fromEntries(searchParams.entries())];
  
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchContentData(searchParams),
    staleTime: 30000, // Consider data stale after 30 seconds
    placeholderData: keepPreviousData, // Keep previous data while fetching new data (for pagination)
  });

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">
          Failed to load content: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <ContentClient 
      view={view}
      initialData={data || {
        transcripts: [],
        insights: [],
        posts: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      }}
    />
  );
}

export default ContentPage;