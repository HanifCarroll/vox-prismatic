"use client";

import { useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, Edit3, TrendingUp, Clock, Target } from "lucide-react";
import { useToast } from "@/lib/toast";

// Import table components
import TranscriptsView from "./components/transcripts/TranscriptsView";
import InsightsView from "./components/insights/InsightsView";
import PostsView from "./components/posts/PostsView";
import { UnifiedActionBar } from "./components/UnifiedActionBar";

// Import state management hooks
import { useContentViewState } from "./hooks/useContentViewState";
import { useContentCounts } from "./hooks/useContentCounts";
import { useContentModals } from "./hooks/useContentModals";
import { useContentFilters } from "./hooks/useContentFilters";

// Import modals
import TranscriptInputModal from "./components/modals/TranscriptInputModal";
import TranscriptModal from "./components/modals/TranscriptModal";
import InsightModal from "./components/modals/InsightModal";
import PostModal from "./components/modals/PostModal";
import { SchedulePostModal } from "./components/modals/SchedulePostModal";
import { BulkScheduleModal } from "@/components/BulkScheduleModal";

// Import queries
import { useTranscripts } from "./hooks/useTranscriptQueries";
import { useInsights } from "./hooks/useInsightQueries";
import { usePosts } from "./hooks/usePostQueries";
import { useDashboardCounts } from "@/app/hooks/useDashboardQueries";

import type { TranscriptView, InsightView, PostView } from "@/types";

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

  // Fetch all data with metadata
  const { data: transcriptsResult, isLoading: transcriptsLoading } = useTranscripts();
  const { data: insightsResult, isLoading: insightsLoading } = useInsights({});
  const { data: postsResult, isLoading: postsLoading } = usePosts({});
  
  // Extract data and metadata
  const transcripts = transcriptsResult?.data || [];
  const transcriptMetadata = transcriptsResult?.meta;
  const insights = insightsResult?.data || [];
  const insightMetadata = insightsResult?.meta;
  const posts = postsResult?.data || [];
  const postMetadata = postsResult?.meta;
  
  // Fetch accurate dashboard counts for tab badges
  const { data: dashboardCounts, isLoading: countsLoading } = useDashboardCounts();

  // Calculate counts for badges - use dashboard counts for accurate totals
  const counts = useContentCounts(transcripts, insights, posts, dashboardCounts);

  // Handle view change
  const handleViewChange = useCallback((value: string) => {
    const newView = value as ContentView;
    
    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    router.push(`/content?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Get page info with stats based on active view
  const getPageInfo = () => {
    const baseInfo = {
      title: "Content Pipeline",
      description: activeView === "transcripts" 
        ? "Process your transcripts through the content creation pipeline"
        : activeView === "insights"
        ? "Review and approve AI-generated insights from your content"
        : "Manage and schedule your social media posts",
      icon: activeView === "transcripts" ? FileText : activeView === "insights" ? Lightbulb : Edit3,
      stats: undefined as any[] | undefined,
    };

    // Prepare stats for the header
    const stats: any[] = [];
    
    if (countsLoading || !dashboardCounts) {
      // Show loading state with undefined stats
      return baseInfo;
    }
    
    switch (activeView) {
      case "transcripts":
        stats.push(
          { 
            label: "Total Transcripts", 
            value: counts.transcripts.total,
            icon: FileText
          },
          { 
            label: "Need Cleaning", 
            value: counts.transcripts.raw,
            icon: Target,
            trend: counts.transcripts.raw > 0 ? 'neutral' : undefined
          },
          { 
            label: "Processing", 
            value: counts.transcripts.processing,
            icon: Clock
          },
          { 
            label: "Completed", 
            value: counts.transcripts.completed,
            icon: TrendingUp,
            trend: 'up'
          }
        );
        break;
      case "insights":
        stats.push(
          { 
            label: "Total Insights", 
            value: counts.insights.total,
            icon: Lightbulb
          },
          { 
            label: "Need Review", 
            value: counts.insights.needsReview,
            icon: Target,
            trend: counts.insights.needsReview > 0 ? 'neutral' : undefined
          },
          { 
            label: "Approved", 
            value: counts.insights.approved,
            icon: TrendingUp,
            trend: 'up'
          },
          { 
            label: "Rejected", 
            value: counts.insights.rejected,
            icon: Clock
          }
        );
        break;
      case "posts":
        stats.push(
          { 
            label: "Total Posts", 
            value: counts.posts.total,
            icon: Edit3
          },
          { 
            label: "Need Review", 
            value: counts.posts.needsReview,
            icon: Target,
            trend: counts.posts.needsReview > 0 ? 'neutral' : undefined
          },
          { 
            label: "Scheduled", 
            value: counts.posts.scheduled,
            icon: Clock
          },
          { 
            label: "Published", 
            value: counts.posts.published,
            icon: TrendingUp,
            trend: 'up'
          }
        );
        break;
    }
    
    return { ...baseInfo, stats };
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
          totalCount: transcriptMetadata?.pagination?.total || transcripts.length,
          filteredCount: transcripts.filter((t: TranscriptView) => 
            searchQuery ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
          ).length,
        };
      case "insights":
        return {
          data: insights,
          selectedCount: selectedItems.length,
          totalCount: insightMetadata?.pagination?.total || insights.length,
          filteredCount: insights.filter((i: InsightView) => 
            searchQuery ? i.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
          ).length,
        };
      case "posts":
        return {
          data: posts,
          selectedCount: selectedItems.length,
          totalCount: postMetadata?.pagination?.total || posts.length,
          filteredCount: posts.filter((p: PostView) => 
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
  }, [activeView, transcripts, insights, posts, selectedItems.length, searchQuery, transcriptMetadata, insightMetadata, postMetadata]);

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

  // Use filter management hook
  const { handleFilterChange, handleClearAllFilters, currentFilters } = useContentFilters({
    activeView,
    filters,
    dispatch,
    setSearchQuery: actions.setSearchQuery,
  });

  // Use modal management hook
  const modalHandlers = useContentModals({ dispatch, modals });
  const handleBulkSchedule = useCallback(
    (schedules: Array<{ postId: string; scheduledFor: Date }>) => 
      modalHandlers.handleBulkSchedule(schedules, actions.clearSelection),
    [modalHandlers, actions.clearSelection]
  );

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
  const isLoading = transcriptsLoading || insightsLoading || postsLoading || countsLoading;

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
          platforms: Array.from(new Set(insights.map((i: InsightView) => i.category))) as string[],
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


  return (
    <div className="h-full bg-gray-50">
      <div className="container mx-auto py-3 px-4 max-w-7xl">
        {/* Page Header with Stats */}
        <PageHeader
          title={pageInfo.title}
          description={pageInfo.description}
          stats={pageInfo.stats}
        />

        {/* Unified Control Panel - All controls in one cohesive card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Content Tabs - integrated into the card */}
          <Tabs value={activeView} onValueChange={handleViewChange} className="w-full">
            <div className="border-b border-gray-200">
              <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-3 h-auto p-1 sm:p-2 bg-transparent border-0 gap-1">
                <TabsTrigger value="transcripts" className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-1.5 sm:py-2 px-1 sm:px-3 text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200 min-w-0">
                  <FileText className="h-4 sm:h-5 w-4 sm:w-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Transcripts</span>
                  <span className="sm:hidden text-[10px]">Trans.</span>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Badge variant="secondary" className="sm:ml-1 font-bold text-[10px] sm:text-xs px-1 sm:px-2 h-4 sm:h-5">
                      {countsLoading ? "..." : counts.transcripts.total}
                    </Badge>
                    {/* Show review count inline on mobile */}
                    {counts.transcripts.raw > 0 && !countsLoading && (
                      <Badge variant="outline" className="sm:hidden bg-yellow-50 text-yellow-700 border-yellow-300 font-medium text-[10px] px-1 h-4">
                        {counts.transcripts.raw}
                      </Badge>
                    )}
                  </div>
                  {/* Desktop review badge */}
                  {counts.transcripts.raw > 0 && !countsLoading && (
                    <Badge variant="outline" className="hidden sm:inline-flex ml-1 bg-yellow-50 text-yellow-700 border-yellow-300 font-medium text-xs">
                      {counts.transcripts.raw} new
                    </Badge>
                  )}
                </TabsTrigger>
              
                <TabsTrigger value="insights" className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-1.5 sm:py-2 px-1 sm:px-3 text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200 min-w-0">
                  <Lightbulb className="h-4 sm:h-5 w-4 sm:w-5 flex-shrink-0" />
                  <span className="text-[10px] sm:text-sm">Insights</span>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Badge variant="secondary" className="sm:ml-1 font-bold text-[10px] sm:text-xs px-1 sm:px-2 h-4 sm:h-5">
                      {countsLoading ? "..." : counts.insights.total}
                    </Badge>
                    {/* Show review count inline on mobile */}
                    {counts.insights.needsReview > 0 && !countsLoading && (
                      <Badge variant="outline" className="sm:hidden bg-amber-50 text-amber-700 border-amber-300 font-medium text-[10px] px-1 h-4">
                        {counts.insights.needsReview}
                      </Badge>
                    )}
                  </div>
                  {/* Desktop review badge */}
                  {counts.insights.needsReview > 0 && !countsLoading && (
                    <Badge variant="outline" className="hidden sm:inline-flex ml-1 bg-amber-50 text-amber-700 border-amber-300 font-medium text-xs">
                      {counts.insights.needsReview} review
                    </Badge>
                  )}
                </TabsTrigger>
              
                <TabsTrigger value="posts" className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-1.5 sm:py-2 px-1 sm:px-3 text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200 min-w-0">
                  <Edit3 className="h-4 sm:h-5 w-4 sm:w-5 flex-shrink-0" />
                  <span className="text-[10px] sm:text-sm">Posts</span>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Badge variant="secondary" className="sm:ml-1 font-bold text-[10px] sm:text-xs px-1 sm:px-2 h-4 sm:h-5">
                      {countsLoading ? "..." : counts.posts.total}
                    </Badge>
                    {/* Show review count inline on mobile */}
                    {counts.posts.needsReview > 0 && !countsLoading && (
                      <Badge variant="outline" className="sm:hidden bg-amber-50 text-amber-700 border-amber-300 font-medium text-[10px] px-1 h-4">
                        {counts.posts.needsReview}
                      </Badge>
                    )}
                  </div>
                  {counts.posts.needsReview > 0 && !countsLoading && (
                    <Badge variant="outline" className="hidden sm:inline-flex ml-1 bg-amber-50 text-amber-700 border-amber-300 font-medium text-[10px] sm:text-xs">
                      {counts.posts.needsReview} review
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Unified Action Bar - integrated seamlessly */}
            <UnifiedActionBar
              activeView={activeView}
              searchQuery={searchQuery}
              onSearchChange={actions.setSearchQuery}
              selectedCount={currentViewData.selectedCount}
              totalCount={currentViewData.totalCount}
              filteredCount={currentViewData.filteredCount}
              onBulkAction={handleBulkAction}
              onSelectAll={handleSelectAll}
              currentFilters={currentFilters}
              onFilterChange={handleFilterChange}
              onClearAllFilters={handleClearAllFilters}
              onAddToPipeline={handleAddToPipeline}
            />

            {/* Content Views - part of the same card */}
            <div className="border-t border-gray-100">
              <TabsContent value="transcripts" className="mt-0 p-3 sm:p-6">
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
              globalCounts={dashboardCounts ? {
                total: dashboardCounts.transcripts.total,
                raw: dashboardCounts.transcripts.byStatus.raw || 0,
                cleaned: dashboardCounts.transcripts.byStatus.cleaned || 0,
                processing: dashboardCounts.transcripts.byStatus.processing || 0,
                insights_generated: dashboardCounts.transcripts.byStatus.insights_generated || 0,
                posts_created: dashboardCounts.transcripts.byStatus.posts_created || 0,
              } : undefined}
            />
              </TabsContent>
            
              <TabsContent value="insights" className="mt-0 p-3 sm:p-6">
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
              globalCounts={dashboardCounts ? {
                total: dashboardCounts.insights.total,
                needs_review: dashboardCounts.insights.byStatus.needs_review || 0,
                approved: dashboardCounts.insights.byStatus.approved || 0,
                rejected: dashboardCounts.insights.byStatus.rejected || 0,
                archived: dashboardCounts.insights.byStatus.archived || 0,
              } : undefined}
            />
              </TabsContent>
            
              <TabsContent value="posts" className="mt-0 p-3 sm:p-6">
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
              globalCounts={dashboardCounts ? {
                total: dashboardCounts.posts.total,
                needs_review: dashboardCounts.posts.byStatus.needs_review || 0,
                approved: dashboardCounts.posts.byStatus.approved || 0,
                scheduled: dashboardCounts.posts.byStatus.scheduled || 0,
                published: dashboardCounts.posts.byStatus.published || 0,
                failed: dashboardCounts.posts.byStatus.failed || 0,
                rejected: dashboardCounts.posts.byStatus.rejected || 0,
                archived: dashboardCounts.posts.byStatus.archived || 0,
              } : undefined}
            />
              </TabsContent>
            </div>
          </Tabs>
        </div>

      {/* Global Modals */}
      <TranscriptInputModal
        isOpen={modals.showTranscriptInput}
        onClose={() => dispatch({ type: 'HIDE_TRANSCRIPT_INPUT_MODAL' })}
        onSubmit={modalHandlers.handleInputTranscript}
      />

      <TranscriptModal
        transcript={modals.selectedTranscript}
        isOpen={modals.showTranscriptModal}
        onClose={() => dispatch({ type: 'HIDE_TRANSCRIPT_MODAL' })}
        onSave={modalHandlers.handleSaveTranscript}
        initialMode={modals.transcriptModalMode}
      />

      <InsightModal
        insight={modals.selectedInsight}
        isOpen={modals.showInsightModal}
        onClose={() => dispatch({ type: 'HIDE_INSIGHT_MODAL' })}
        onSave={modalHandlers.handleSaveInsight}
      />
      </div>
    </div>
  );
}