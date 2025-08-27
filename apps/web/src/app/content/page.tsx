import { Suspense } from "react";
import ContentClient from "./ContentClient";
import { FullPageSpinner } from "@/components/ui/loading-spinner";

export const metadata = {
  title: "Content Pipeline",
  description: "Manage your content from transcripts to published posts",
};

interface ContentPageProps {
  searchParams: Promise<{
    view?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const params = await searchParams;
  
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ContentClient 
        initialView={params.view || "transcripts"}
        initialStatus={params.status}
        initialSearch={params.search}
      />
    </Suspense>
  );
}