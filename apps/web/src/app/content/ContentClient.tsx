"use client";

import { useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, Edit3 } from "lucide-react";
import { useToast } from "@/lib/toast";

// Import table components
import TranscriptsView from "./components/transcripts/TranscriptsView";
import InsightsView from "./components/insights/InsightsView";
import PostsView from "./components/posts/PostsView";
import { UnifiedActionBar } from "./components/UnifiedActionBar";

// Import state management hook
import { useContentViewState } from "./hooks/useContentViewState";

// Import modals
import TranscriptInputModal from "./components/modals/TranscriptInputModal";
import TranscriptModal from "./components/modals/TranscriptModal";
import InsightModal from "./components/modals/InsightModal";
import PostModal from "./components/modals/PostModal";
import { SchedulePostModal } from "./components/modals/SchedulePostModal";
import { BulkScheduleModal } from "@/components/BulkScheduleModal";

// Import queries
import { useTranscripts, useCreateTranscript, useUpdateTranscript } from "./hooks/useTranscriptQueries";
import { useInsights, useUpdateInsight } from "./hooks/useInsightQueries";
import { usePosts, useUpdatePost } from "./hooks/usePostQueries";

import { apiClient } from "@/lib/api-client";
import type { TranscriptView, InsightView, PostView } from "@/types";
import { format } from "date-fns";

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

  // Use our centralized state management
  const { state, dispatch, handlers, actions } = useContentViewState();
  
  // Extract specific handlers to avoid object reference issues
  const { clearSelectionsForViewChange } = handlers;

  // Active view state - sync with URL params
  const activeView = currentView as ContentView;

  // Clear selections when switching views
  useEffect(() => {
    clearSelectionsForViewChange();
  }, [activeView, clearSelectionsForViewChange]);

  // Fetch all data
  const { data: transcripts = [], isLoading: transcriptsLoading } = useTranscripts();
  const { data: insights = [], isLoading: insightsLoading } = useInsights({});
  const { data: posts = [], isLoading: postsLoading } = usePosts({});

  // Mutations
  const createTranscriptMutation = useCreateTranscript();
  const updateTranscriptMutation = useUpdateTranscript();
  const updateInsightMutation = useUpdateInsight();
  const updatePostMutation = useUpdatePost();

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

  // Extract state for easier access
  const { searchQuery, selectedItems, showFilters, filters, modals } = state;

  // Memoize current view data to prevent infinite re-renders
  const currentViewData = useMemo(() => {
    switch (activeView) {
      case "transcripts":
        return {
          data: transcripts,
          selectedCount: selectedItems.length,
          totalCount: transcripts.length,
          filteredCount: transcripts.filter(t => 
            searchQuery ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
          ).length,
        };
      case "insights":
        return {
          data: insights,
          selectedCount: selectedItems.length,
          totalCount: insights.length,
          filteredCount: insights.filter(i => 
            searchQuery ? i.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
          ).length,
        };
      case "posts":
        return {
          data: posts,
          selectedCount: selectedItems.length,
          totalCount: posts.length,
          filteredCount: posts.filter(p => 
            searchQuery ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
          ).length,
        };
      default:
        return {
          data: [],
          selectedCount: 0,
          totalCount: 0,
          filteredCount: 0,
        };
    }
  }, [activeView, transcripts, insights, posts, selectedItems.length, searchQuery]);

  // Smart selection handlers - avoid using currentViewData.data in dependencies
  // since it changes on every render. Instead use the specific data arrays.
  const currentData = useMemo(() => {
    switch (activeView) {
      case "transcripts": return transcripts;
      case "insights": return insights;
      case "posts": return posts;
      default: return [];
    }
  }, [activeView, transcripts, insights, posts]);

  const handleSelectAll = useCallback((selected: boolean) => {
    handlers.handleSelectAll(selected, currentData);
  }, [handlers.handleSelectAll, currentData]);

  const handleSelectFiltered = useCallback(() => {
    const filteredData = currentData.filter((item: any) => 
      searchQuery ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
    );
    handlers.handleSelectFiltered(filteredData);
  }, [handlers.handleSelectFiltered, currentData, searchQuery]);

  const handleSelectByStatus = useCallback((status: string) => {
    handlers.handleSelectByStatus(status, currentData);
  }, [handlers.handleSelectByStatus, currentData]);

  const handleSelectByPlatform = useCallback((platform: string) => {
    handlers.handleSelectByPlatform(platform, currentData);
  }, [handlers.handleSelectByPlatform, currentData]);

  const handleInvertSelection = useCallback(() => {
    handlers.handleInvertSelection(currentData);
  }, [handlers.handleInvertSelection, currentData]);

  const handleSelectDateRange = useCallback((start: Date, end: Date) => {
    handlers.handleSelectDateRange(start, end, currentData);
  }, [handlers.handleSelectDateRange, currentData]);

  // Handle bulk actions (delegated to individual views)
  const handleBulkAction = useCallback((action: string) => {
    // This will be handled by the individual view components
    // Each view has its own bulk action implementation
    console.log(`Bulk action: ${action}`);
  }, []);

  // Filter handlers
  const handleFilterChange = useCallback((filterKey: string, value: string) => {
    switch (activeView) {
      case 'transcripts':
        if (filterKey === 'status') {
          dispatch({ type: 'SET_TRANSCRIPT_STATUS_FILTER', payload: value });
        } else if (filterKey === 'sort') {
          dispatch({ type: 'SET_TRANSCRIPT_SORT', payload: value });
        }
        break;
      case 'insights':
        if (filterKey === 'status') {
          dispatch({ type: 'SET_INSIGHT_STATUS_FILTER', payload: value });
        } else if (filterKey === 'category') {
          dispatch({ type: 'SET_INSIGHT_CATEGORY_FILTER', payload: value });
        } else if (filterKey === 'sort') {
          const [field, order] = value.split('-');
          dispatch({ type: 'SET_INSIGHT_SORT', payload: { field, order: order as 'asc' | 'desc' } });
        }
        break;
      case 'posts':
        if (filterKey === 'status') {
          dispatch({ type: 'SET_POST_STATUS_FILTER', payload: value });
        } else if (filterKey === 'platform') {
          dispatch({ type: 'SET_POST_PLATFORM_FILTER', payload: value });
        } else if (filterKey === 'sort') {
          dispatch({ type: 'SET_POST_SORT', payload: value });
        }
        break;
    }
  }, [activeView, dispatch]);

  const handleClearAllFilters = useCallback(() => {
    switch (activeView) {
      case 'transcripts':
        dispatch({ type: 'SET_TRANSCRIPT_STATUS_FILTER', payload: 'all' });
        dispatch({ type: 'SET_TRANSCRIPT_SORT', payload: 'createdAt-desc' });
        break;
      case 'insights':
        dispatch({ type: 'SET_INSIGHT_STATUS_FILTER', payload: 'all' });
        dispatch({ type: 'SET_INSIGHT_CATEGORY_FILTER', payload: 'all' });
        dispatch({ type: 'SET_INSIGHT_SORT', payload: { field: 'totalScore', order: 'desc' } });
        break;
      case 'posts':
        dispatch({ type: 'SET_POST_STATUS_FILTER', payload: 'all' });
        dispatch({ type: 'SET_POST_PLATFORM_FILTER', payload: 'all' });
        dispatch({ type: 'SET_POST_SORT', payload: 'createdAt-desc' });
        break;
    }
    actions.setSearchQuery(''); // Also clear search
  }, [activeView, dispatch, actions]);

  // Modal handlers
  const handleInputTranscript = useCallback((formData: {
    title: string;
    content: string;
    fileName?: string;
  }) => {
    createTranscriptMutation.mutate({
      title: formData.title,
      rawContent: formData.content,
      sourceType: formData.fileName ? "upload" : "manual",
      fileName: formData.fileName,
      metadata: formData.fileName ? { originalFileName: formData.fileName } : undefined,
    }, {
      onSuccess: () => {
        dispatch({ type: 'HIDE_TRANSCRIPT_INPUT_MODAL' });
        toast.success('Transcript created');
      }
    });
  }, [createTranscriptMutation, toast, dispatch]);

  const handleSaveTranscript = useCallback((updatedTranscript: TranscriptView) => {
    updateTranscriptMutation.mutate({
      id: updatedTranscript.id,
      title: updatedTranscript.title,
      rawContent: updatedTranscript.rawContent,
      cleanedContent: updatedTranscript.cleanedContent,
    }, {
      onSuccess: () => {
        dispatch({ type: 'HIDE_TRANSCRIPT_MODAL' });
        toast.success('Transcript updated');
      }
    });
  }, [updateTranscriptMutation, toast, dispatch]);

  const handleSaveInsight = useCallback(async (updatedData: Partial<InsightView>) => {
    if (!modals.selectedInsight) return;

    return new Promise<void>((resolve) => {
      const insightId = modals.selectedInsight!.id; // Non-null assertion since we checked above
      updateInsightMutation.mutate({
        id: insightId,
        ...updatedData,
      }, {
        onSuccess: () => {
          dispatch({ type: 'HIDE_INSIGHT_MODAL' });
          toast.success('Insight updated');
          resolve();
        },
        onError: () => {
          resolve(); // Still resolve to prevent hanging
        }
      });
    });
  }, [updateInsightMutation, toast, dispatch, modals.selectedInsight]);

  const handleSavePost = useCallback(async (updatedData: Partial<PostView>) => {
    if (!modals.selectedPost) {
      throw new Error("No post selected for saving");
    }

    updatePostMutation.mutate({
      id: modals.selectedPost.id,
      ...updatedData,
    }, {
      onSuccess: () => {
        dispatch({ type: 'HIDE_POST_MODAL' });
        toast.success('Post updated');
      },
      onError: (error) => {
        throw error; // Re-throw to let PostModal handle the error display
      },
    });
  }, [updatePostMutation, toast, dispatch, modals.selectedPost]);

  const handleSchedulePost = useCallback(async (postId: string, scheduledFor: Date) => {
    try {
      const response = await apiClient.post(`/api/posts/${postId}/schedule`, {
        scheduledFor: scheduledFor.toISOString(),
      });

      if (response.success) {
        toast.success("Post scheduled", {
          description: `Scheduled for ${format(
            scheduledFor,
            "MMM d, yyyy 'at' h:mm a"
          )}`,
        });

        // Update the post status locally
        updatePostMutation.mutate({
          id: postId,
          status: "scheduled",
        });

        dispatch({ type: 'HIDE_SCHEDULE_MODAL' });
      } else {
        throw new Error(response.error || "Failed to schedule post");
      }
    } catch (error) {
      toast.error("Failed to schedule post", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }, [toast, updatePostMutation, dispatch]);

  const handleBulkSchedule = useCallback(async (
    schedules: Array<{ postId: string; scheduledFor: Date }>
  ) => {
    try {
      // Schedule each post
      const results = await Promise.allSettled(
        schedules.map(async ({ postId, scheduledFor }) => {
          const response = await apiClient.post("/api/posts/schedule", {
            postId,
            scheduledFor: scheduledFor.toISOString(),
          });

          if (response.success) {
            // Update local state
            updatePostMutation.mutate({
              id: postId,
              status: "scheduled",
            });
          }

          return response;
        })
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (successful > 0) {
        toast.success(`Successfully scheduled ${successful} posts`);
      }

      if (failed > 0) {
        toast.warning(`Failed to schedule ${failed} posts`);
      }

      // Clear selection after bulk scheduling
      actions.clearSelection();
      dispatch({ type: 'HIDE_BULK_SCHEDULE_MODAL' });
    } catch (error) {
      toast.error("Bulk scheduling failed");
      throw error;
    }
  }, [toast, updatePostMutation, actions, dispatch]);

  // Handle pipeline entry - works from any view
  const handleAddToPipeline = useCallback(() => {
    // Always open transcript input (the only entry point to the pipeline)
    dispatch({ type: 'SHOW_TRANSCRIPT_INPUT_MODAL' });
    
    // If not on transcripts view, optionally switch to it
    // This helps users understand the pipeline flow
    if (activeView !== 'transcripts') {
      // Optional: Switch to transcripts view to reinforce the pipeline concept
      // Uncomment if you want automatic view switching:
      // handleViewChange('transcripts');
    }
  }, [dispatch, activeView]);

  // Initialize search from URL params
  useEffect(() => {
    if (initialSearch) {
      actions.setSearchQuery(initialSearch);
    }
  }, [initialSearch, actions]);

  const pageInfo = getPageInfo();
  const isLoading = transcriptsLoading || insightsLoading || postsLoading;

  // Memoize smart selection props to prevent recreation on every render
  const smartSelectionProps = useMemo(() => {
    switch (activeView) {
      case "transcripts":
        return {
          statuses: ["raw", "cleaned", "processing", "insights_generated"],
          platforms: undefined,
        };
      case "insights":
        return {
          statuses: ["needs_review", "approved", "rejected"],
          platforms: Array.from(new Set(insights.map(i => i.category))),
          platformLabel: "category",
        };
      case "posts":
        return {
          statuses: ["needs_review", "approved", "rejected", "scheduled", "published"],
          platforms: ["x", "linkedin"],
        };
      default:
        return {
          statuses: [],
          platforms: undefined,
        };
    }
  }, [activeView, insights]);

  // Current filters for UnifiedActionBar
  const currentFilters = useMemo(() => {
    switch (activeView) {
      case 'transcripts':
        return {
          status: filters.transcripts.statusFilter,
          sort: filters.transcripts.sortBy,
        };
      case 'insights':
        return {
          status: filters.insights.statusFilter,
          category: filters.insights.categoryFilter,
          sort: `${filters.insights.sortBy}-${filters.insights.sortOrder}`,
        };
      case 'posts':
        return {
          status: filters.posts.statusFilter,
          platform: filters.posts.platformFilter,
          sort: filters.posts.sortBy,
        };
      default:
        return {};
    }
  }, [activeView, filters]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Page Header */}
      <PageHeader
        title={pageInfo.title}
        description={pageInfo.description}
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

        {/* Unified Action Bar */}
        <UnifiedActionBar
          activeView={activeView}
          searchQuery={searchQuery}
          onSearchChange={actions.setSearchQuery}
          selectedCount={currentViewData.selectedCount}
          totalCount={currentViewData.totalCount}
          filteredCount={currentViewData.filteredCount}
          onBulkAction={handleBulkAction}
          onSelectAll={handleSelectAll}
          onSelectFiltered={handleSelectFiltered}
          onSelectByStatus={handleSelectByStatus}
          onSelectByPlatform={handleSelectByPlatform}
          onInvertSelection={handleInvertSelection}
          onSelectDateRange={handleSelectDateRange}
          statuses={smartSelectionProps.statuses}
          platforms={smartSelectionProps.platforms}
          platformLabel={smartSelectionProps.platformLabel}
          currentFilters={currentFilters}
          onFilterChange={handleFilterChange}
          onClearAllFilters={handleClearAllFilters}
          onAddToPipeline={handleAddToPipeline}
        />

        {/* Content Views */}
        <div className="mt-0">
          <TabsContent value="transcripts" className="mt-0">
            <TranscriptsView 
              transcripts={transcripts}
              isLoading={transcriptsLoading}
              searchQuery={searchQuery}
              selectedItems={selectedItems}
              onSelectionChange={actions.setSelectedItems}
              statusFilter={filters.transcripts.statusFilter}
              sortBy={filters.transcripts.sortBy}
              onStatusFilterChange={(filter) => dispatch({ type: 'SET_TRANSCRIPT_STATUS_FILTER', payload: filter })}
              onSortChange={(sort) => dispatch({ type: 'SET_TRANSCRIPT_SORT', payload: sort })}
              onShowTranscriptInputModal={() => dispatch({ type: 'SHOW_TRANSCRIPT_INPUT_MODAL' })}
              onShowTranscriptModal={(transcript, mode) => dispatch({ type: 'SHOW_TRANSCRIPT_MODAL', payload: { transcript, mode } })}
            />
          </TabsContent>
          
          <TabsContent value="insights" className="mt-0">
            <InsightsView 
              insights={insights}
              isLoading={insightsLoading}
              searchQuery={searchQuery}
              selectedItems={selectedItems}
              onSelectionChange={actions.setSelectedItems}
              statusFilter={filters.insights.statusFilter}
              postTypeFilter={filters.insights.postTypeFilter}
              categoryFilter={filters.insights.categoryFilter}
              scoreRange={filters.insights.scoreRange}
              sortBy={filters.insights.sortBy}
              sortOrder={filters.insights.sortOrder}
              onStatusFilterChange={(filter) => dispatch({ type: 'SET_INSIGHT_STATUS_FILTER', payload: filter })}
              onPostTypeFilterChange={(filter) => dispatch({ type: 'SET_INSIGHT_POST_TYPE_FILTER', payload: filter })}
              onCategoryFilterChange={(filter) => dispatch({ type: 'SET_INSIGHT_CATEGORY_FILTER', payload: filter })}
              onScoreRangeChange={(range) => dispatch({ type: 'SET_INSIGHT_SCORE_RANGE', payload: range })}
              onSortChange={(field, order) => dispatch({ type: 'SET_INSIGHT_SORT', payload: { field, order } })}
              onShowInsightModal={(insight) => dispatch({ type: 'SHOW_INSIGHT_MODAL', payload: insight })}
            />
          </TabsContent>
          
          <TabsContent value="posts" className="mt-0">
            <PostsView 
              posts={posts}
              isLoading={postsLoading}
              searchQuery={searchQuery}
              selectedItems={selectedItems}
              onSelectionChange={actions.setSelectedItems}
              statusFilter={filters.posts.statusFilter}
              platformFilter={filters.posts.platformFilter}
              sortBy={filters.posts.sortBy}
              onStatusFilterChange={(filter) => dispatch({ type: 'SET_POST_STATUS_FILTER', payload: filter })}
              onPlatformFilterChange={(filter) => dispatch({ type: 'SET_POST_PLATFORM_FILTER', payload: filter })}
              onSortChange={(sort) => dispatch({ type: 'SET_POST_SORT', payload: sort })}
              onShowPostModal={(post) => dispatch({ type: 'SHOW_POST_MODAL', payload: post })}
              onShowScheduleModal={(post) => dispatch({ type: 'SHOW_SCHEDULE_MODAL', payload: post })}
              onShowBulkScheduleModal={() => dispatch({ type: 'SHOW_BULK_SCHEDULE_MODAL' })}
              onSearchQueryChange={actions.setSearchQuery}
              onHidePostModal={() => dispatch({ type: 'HIDE_POST_MODAL' })}
              onHideScheduleModal={() => dispatch({ type: 'HIDE_SCHEDULE_MODAL' })}
              onHideBulkScheduleModal={() => dispatch({ type: 'HIDE_BULK_SCHEDULE_MODAL' })}
              selectedPost={modals.selectedPost}
              postToSchedule={modals.postToSchedule}
              showPostModal={modals.showPostModal}
              showScheduleModal={modals.showScheduleModal}
              showBulkScheduleModal={modals.showBulkScheduleModal}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Global Modals */}
      <TranscriptInputModal
        isOpen={modals.showTranscriptInput}
        onClose={() => dispatch({ type: 'HIDE_TRANSCRIPT_INPUT_MODAL' })}
        onSubmit={handleInputTranscript}
      />

      <TranscriptModal
        transcript={modals.selectedTranscript}
        isOpen={modals.showTranscriptModal}
        onClose={() => dispatch({ type: 'HIDE_TRANSCRIPT_MODAL' })}
        onSave={handleSaveTranscript}
        initialMode={modals.transcriptModalMode}
      />

      <InsightModal
        insight={modals.selectedInsight}
        isOpen={modals.showInsightModal}
        onClose={() => dispatch({ type: 'HIDE_INSIGHT_MODAL' })}
        onSave={handleSaveInsight}
      />
    </div>
  );
}