"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, Edit3 } from "lucide-react";
import { useToast } from "@/lib/toast";

// Import table components (to be created)
import TranscriptsView from "./components/transcripts/TranscriptsView";
import InsightsView from "./components/insights/InsightsView";
import PostsView from "./components/posts/PostsView";

// Import queries
import { useTranscripts } from "./hooks/useTranscriptQueries";
import { useInsights } from "./hooks/useInsightQueries";
import { usePosts } from "./hooks/usePostQueries";

type ContentView = "transcripts" | "insights" | "posts";

interface ContentClientProps {
  initialView?: string;
  initialStatus?: string;
  initialSearch?: string;
}

export default function ContentClient({
  initialView = "transcripts",
  initialStatus,
  initialSearch,
}: ContentClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Get the current view from URL params, fallback to initialView
  const currentView = searchParams.get("view") || initialView;

  // Active view state - sync with URL params
  const [activeView, setActiveView] = useState<ContentView>(
    currentView as ContentView
  );

  // Keep activeView in sync with URL changes
  useEffect(() => {
    const view = searchParams.get("view") || initialView;
    setActiveView(view as ContentView);
  }, [searchParams, initialView]);

  // Fetch all data
  const { data: transcripts = [], isLoading: transcriptsLoading } = useTranscripts();
  const { data: insights = [], isLoading: insightsLoading } = useInsights({});
  const { data: posts = [], isLoading: postsLoading } = usePosts({});

  // Calculate counts for badges
  const counts = useMemo(() => {
    const transcriptCounts = {
      total: transcripts.length,
      raw: transcripts.filter(t => t.status === "raw").length,
      processing: transcripts.filter(t => t.status === "processing").length,
      completed: transcripts.filter(t => 
        ["insights_generated", "posts_created"].includes(t.status)
      ).length,
    };

    const insightCounts = {
      total: insights.length,
      needsReview: insights.filter(i => i.status === "needs_review").length,
      approved: insights.filter(i => i.status === "approved").length,
      rejected: insights.filter(i => i.status === "rejected").length,
    };

    const postCounts = {
      total: posts.length,
      needsReview: posts.filter(p => p.status === "needs_review").length,
      approved: posts.filter(p => p.status === "approved").length,
      scheduled: posts.filter(p => p.status === "scheduled").length,
      published: posts.filter(p => p.status === "published").length,
    };

    return { transcripts: transcriptCounts, insights: insightCounts, posts: postCounts };
  }, [transcripts, insights, posts]);

  // Handle view change
  const handleViewChange = useCallback((value: string) => {
    const newView = value as ContentView;
    setActiveView(newView);
    
    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    router.push(`/content?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Get page title and description based on active view
  const getPageInfo = () => {
    switch (activeView) {
      case "transcripts":
        return {
          title: "Content Pipeline",
          description: "Process your transcripts through the content creation pipeline",
          icon: FileText,
        };
      case "insights":
        return {
          title: "Content Pipeline",
          description: "Review and approve AI-generated insights from your content",
          icon: Lightbulb,
        };
      case "posts":
        return {
          title: "Content Pipeline", 
          description: "Manage and schedule your social media posts",
          icon: Edit3,
        };
    }
  };

  const pageInfo = getPageInfo();
  const isLoading = transcriptsLoading || insightsLoading || postsLoading;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Page Header */}
      <PageHeader
        title={pageInfo.title}
        description={pageInfo.description}
        icon={pageInfo.icon}
      />

      {/* Content Tabs */}
      <Tabs value={activeView} onValueChange={handleViewChange} className="mt-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-3">
          <TabsTrigger value="transcripts" className="gap-2">
            <FileText className="h-4 w-4" />
            <span>Transcripts</span>
            <Badge variant="secondary" className="ml-2">
              {counts.transcripts.total}
            </Badge>
            {counts.transcripts.raw > 0 && (
              <Badge variant="outline" className="ml-1 bg-yellow-100 text-yellow-800">
                {counts.transcripts.raw} new
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="insights" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            <span>Insights</span>
            <Badge variant="secondary" className="ml-2">
              {counts.insights.total}
            </Badge>
            {counts.insights.needsReview > 0 && (
              <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-800">
                {counts.insights.needsReview} review
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="posts" className="gap-2">
            <Edit3 className="h-4 w-4" />
            <span>Posts</span>
            <Badge variant="secondary" className="ml-2">
              {counts.posts.total}
            </Badge>
            {counts.posts.needsReview > 0 && (
              <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-800">
                {counts.posts.needsReview} review
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Content Views */}
        <div className="mt-6">
          <TabsContent value="transcripts" className="mt-0">
            <TranscriptsView 
              transcripts={transcripts}
              isLoading={transcriptsLoading}
            />
          </TabsContent>
          
          <TabsContent value="insights" className="mt-0">
            <InsightsView 
              insights={insights}
              isLoading={insightsLoading}
            />
          </TabsContent>
          
          <TabsContent value="posts" className="mt-0">
            <PostsView 
              posts={posts}
              isLoading={postsLoading}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}