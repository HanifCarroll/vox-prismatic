import ContentClient from "./ContentClient";
import { getTranscripts } from "@/app/actions/transcripts";
import { getInsights } from "@/app/actions/insights";
import { getPosts } from "@/app/actions/posts";
import type { TranscriptView, InsightView, PostView } from "@/types/database";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Content Pipeline",
  description: "Manage your content from transcripts to published posts",
};

interface ContentPageProps {
  searchParams: Promise<{
    // Navigation
    view?: string;
    page?: string;
    limit?: string;
    
    // Common filters
    search?: string;
    sort?: string;
    order?: string;
    status?: string;
    
    // Transcript specific
    // (no additional filters)
    
    // Insight specific
    category?: string;
    postType?: string;
    scoreMin?: string;
    scoreMax?: string;
    
    // Post specific  
    platform?: string;
    
    // Modal state (for shareable URLs)
    modal?: string;
    modalId?: string;
  }>;
}

async function fetchContentData(searchParams: Record<string, string | undefined>) {
  const view = searchParams.view || 'transcripts';
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const limit = searchParams.limit ? parseInt(searchParams.limit) : 20;
  
  // Only fetch data for the active view
  let data: {
    transcripts: TranscriptView[];
    insights: InsightView[];
    posts: PostView[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } = {
    transcripts: [],
    insights: [],
    posts: [],
    pagination: { page, limit, total: 0, totalPages: 0 }
  };

  try {
    switch (view) {
      case 'transcripts': {
        const result = await getTranscripts({
          status: searchParams.status,
          search: searchParams.search,
          sortBy: searchParams.sort,
          sortOrder: searchParams.order as 'asc' | 'desc',
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
        const result = await getInsights({
          status: searchParams.status,
          category: searchParams.category,
          postType: searchParams.postType,
          scoreMin: searchParams.scoreMin ? parseInt(searchParams.scoreMin) : undefined,
          scoreMax: searchParams.scoreMax ? parseInt(searchParams.scoreMax) : undefined,
          search: searchParams.search,
          sortBy: searchParams.sort,
          sortOrder: searchParams.order as 'asc' | 'desc',
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
        const result = await getPosts({
          status: searchParams.status,
          platform: searchParams.platform,
          search: searchParams.search,
          sortBy: searchParams.sort,
          sortOrder: searchParams.order as 'asc' | 'desc',
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
  }
  
  return data;
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const params = await searchParams;
  const data = await fetchContentData(params);
  
  return (
    <ContentClient 
      view={params.view || 'transcripts'}
      initialData={data}
      searchParams={params}
    />
  );
}