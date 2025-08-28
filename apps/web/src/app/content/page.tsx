import { Suspense } from "react";
import ContentClient from "./ContentClient";
import { FullPageSpinner } from "@/components/ui/loading-spinner";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Content Pipeline",
  description: "Manage your content from transcripts to published posts",
};

interface ContentPageProps {
  searchParams: Promise<{
    // Common parameters
    view?: string;
    search?: string;
    
    // Filter parameters
    status?: string;
    category?: string;
    postType?: string;
    platform?: string;
    
    // Sorting parameters
    sort?: string;
    order?: string;
    
    // Score range for insights
    scoreMin?: string;
    scoreMax?: string;
  }>;
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const params = await searchParams;
  
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ContentClient 
        initialView={params.view || "transcripts"}
        initialSearch={params.search}
        initialFilters={{
          status: params.status,
          category: params.category,
          postType: params.postType,
          platform: params.platform,
          scoreMin: params.scoreMin,
          scoreMax: params.scoreMax,
        }}
        initialSort={{
          field: params.sort,
          order: params.order,
        }}
      />
    </Suspense>
  );
}