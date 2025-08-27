import { Suspense } from "react";
import ContentClient from "./ContentClient";
import { FullPageSpinner } from "@/components/ui/loading-spinner";

export const metadata = {
  title: "Content Pipeline",
  description: "Manage your content from transcripts to published posts",
};

interface ContentPageProps {
  searchParams: {
    view?: string;
    status?: string;
    search?: string;
  };
}

export default function ContentPage({ searchParams }: ContentPageProps) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ContentClient 
        initialView={searchParams.view || "transcripts"}
        initialStatus={searchParams.status}
        initialSearch={searchParams.search}
      />
    </Suspense>
  );
}