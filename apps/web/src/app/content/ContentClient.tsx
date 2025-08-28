"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, Edit3, TrendingUp, Clock, Target } from "lucide-react";
import { useToast } from "@/lib/toast";
import { useHybridDataStrategy } from "./hooks/useHybridDataStrategy";
import { usePagination } from "./hooks/usePagination";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Import table components
import TranscriptsView from "./components/transcripts/TranscriptsView";
import InsightsView from "./components/insights/InsightsView";
import PostsView from "./components/posts/PostsView";
import { UnifiedActionBar } from "./components/UnifiedActionBar";

// Import state management hooks
import { useContentViewState, type InitialFilters, type InitialSort } from "./hooks/useContentViewState";
import { useContentCounts } from "./hooks/useContentCounts";
import { useContentModals } from "./hooks/useContentModals";
import { useContentFilters } from "./hooks/useContentFilters";
import { useURLStateSync } from "./hooks/useURLStateSync";

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
  initialSearch?: string;
  initialFilters?: InitialFilters;
  initialSort?: InitialSort;
}

export default function ContentClient({
  initialView = "transcripts",
  initialSearch,
  initialFilters,
  initialSort,
}: ContentClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Get the current view from URL params, fallback to initialView
  const currentView = searchParams.get("view") || initialView;

  // Use our centralized state management with URL-based initial values
  const { state, dispatch, handlers, actions } = useContentViewState(
    initialView,
    initialSearch,
    initialFilters,
    initialSort
  );
  
  // Extract specific handlers to avoid object reference issues
  const { clearSelectionsForViewChange } = handlers;

  // Active view state - sync with URL params
  const activeView = currentView as ContentView;
  
  // Device detection for hybrid strategy
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Sync state with URL
  const { hasActiveFilters, clearAllFilters: clearAllURLFilters } = useURLStateSync({
    activeView,
    filters: state.filters,
    searchQuery: state.searchQuery,
  });

  // Clear selections when switching views
  useEffect(() => {
    clearSelectionsForViewChange();
  }, [activeView, clearSelectionsForViewChange]);

  // Calculate pagination offsets
  const offset = (currentPage - 1) * pageSize;
  
  // Fetch only data for active tab with hybrid strategy
  const { data: transcriptsResult, isLoading: transcriptsLoading } = useTranscripts({
    enabled: activeView === 'transcripts',
    status: state.filters.transcripts.statusFilter !== 'all' ? state.filters.transcripts.statusFilter : undefined,
    search: state.searchQuery || undefined,
    sortBy: state.filters.transcripts.sortBy.split('-')[0],
    sortOrder: state.filters.transcripts.sortBy.split('-')[1] as 'asc' | 'desc',
    limit: transcriptStrategy.shouldPaginate ? transcriptStrategy.pageSize : undefined,
    offset: transcriptStrategy.shouldPaginate ? offset : undefined,
    useServerFiltering: transcriptStrategy.shouldUseServerFilters,
  });
  
  const { data: insightsResult, isLoading: insightsLoading } = useInsights({
    enabled: activeView === 'insights',
    status: state.filters.insights.statusFilter !== 'all' ? state.filters.insights.statusFilter : undefined,
    category: state.filters.insights.categoryFilter !== 'all' ? state.filters.insights.categoryFilter : undefined,
    postType: state.filters.insights.postTypeFilter !== 'all' ? state.filters.insights.postTypeFilter : undefined,
    minScore: state.filters.insights.scoreRange[0] !== 0 ? state.filters.insights.scoreRange[0] : undefined,
    maxScore: state.filters.insights.scoreRange[1] !== 20 ? state.filters.insights.scoreRange[1] : undefined,
    search: state.searchQuery || undefined,
    sortBy: state.filters.insights.sortBy,
    sortOrder: state.filters.insights.sortOrder,
    limit: insightStrategy.shouldPaginate ? insightStrategy.pageSize : undefined,
    offset: insightStrategy.shouldPaginate ? offset : undefined,
    useServerFiltering: insightStrategy.shouldUseServerFilters,
  });
  
  const { data: postsResult, isLoading: postsLoading } = usePosts({
    enabled: activeView === 'posts',
    status: state.filters.posts.statusFilter !== 'all' ? state.filters.posts.statusFilter : undefined,
    platform: state.filters.posts.platformFilter !== 'all' ? state.filters.posts.platformFilter : undefined,
    search: state.searchQuery || undefined,
    sortBy: state.filters.posts.sortBy,
    sortOrder: state.filters.posts.sortBy.split('-')[1] as 'asc' | 'desc' || 'desc',
    limit: postStrategy.shouldPaginate ? postStrategy.pageSize : undefined,
    offset: postStrategy.shouldPaginate ? offset : undefined,
    useServerFiltering: postStrategy.shouldUseServerFilters,
  });
  
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

  // Handle view change - preserves filters when switching views
  const handleViewChange = useCallback((value: string) => {
    const newView = value as ContentView;
    
    // Clear selections when changing views
    actions.clearSelection();
    
    // Reset pagination when switching views
    setCurrentPage(1);
    
    // Reset to default filters for the new view but keep search
    const params = new URLSearchParams();
    params.set("view", newView);
    
    // Preserve search query if present
    if (state.searchQuery) {
      params.set("search", state.searchQuery);
    }
    
    router.push(`/content?${params.toString()}`, { scroll: false });
  }, [router, state.searchQuery, actions]);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [state.filters, state.searchQuery]);

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

  // Memoize current view data - optimized with early returns
  const currentViewData = useMemo(() => {
    const baseData = {
      selectedCount: selectedItems.length,
    };

    switch (activeView) {
      case "transcripts":
        return {
          ...baseData,
          data: transcripts,
          totalCount: transcriptMetadata?.pagination?.total || transcripts.length,
          filteredCount: !searchQuery ? transcripts.length : 
            transcripts.filter((t: TranscriptView) => 
              t.title.toLowerCase().includes(searchQuery.toLowerCase())
            ).length,
        };
      case "insights":
        return {
          ...baseData,
          data: insights,
          totalCount: insightMetadata?.pagination?.total || insights.length,
          filteredCount: !searchQuery ? insights.length :
            insights.filter((i: InsightView) => 
              i.title.toLowerCase().includes(searchQuery.toLowerCase())
            ).length,
        };
      case "posts":
        return {
          ...baseData,
          data: posts,
          totalCount: postMetadata?.pagination?.total || posts.length,
          filteredCount: !searchQuery ? posts.length :
            posts.filter((p: PostView) => 
              p.title.toLowerCase().includes(searchQuery.toLowerCase())
            ).length,
        };
      default:
        return {
          ...baseData,
          data: [],
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
  const { handleFilterChange, currentFilters } = useContentFilters({
    activeView,
    filters,
    dispatch,
    setSearchQuery: actions.setSearchQuery,
  });

  // Handle clear all filters with URL state
  const handleClearAllFilters = useCallback(() => {
    // Clear filters in state
    switch (activeView) {
      case 'transcripts':
        dispatch({ type: 'SET_TRANSCRIPT_STATUS_FILTER', payload: 'all' });
        dispatch({ type: 'SET_TRANSCRIPT_SORT', payload: 'createdAt-desc' });
        break;
      case 'insights':
        dispatch({ type: 'SET_INSIGHT_STATUS_FILTER', payload: 'all' });
        dispatch({ type: 'SET_INSIGHT_CATEGORY_FILTER', payload: 'all' });
        dispatch({ type: 'SET_INSIGHT_POST_TYPE_FILTER', payload: 'all' });
        dispatch({ type: 'SET_INSIGHT_SCORE_RANGE', payload: [0, 20] });
        dispatch({ type: 'SET_INSIGHT_SORT', payload: { field: 'totalScore', order: 'desc' } });
        break;
      case 'posts':
        dispatch({ type: 'SET_POST_STATUS_FILTER', payload: 'all' });
        dispatch({ type: 'SET_POST_PLATFORM_FILTER', payload: 'all' });
        dispatch({ type: 'SET_POST_SORT', payload: 'createdAt-desc' });
        break;
    }
    actions.setSearchQuery('');
    
    // Clear URL filters
    clearAllURLFilters();
  }, [activeView, dispatch, actions, clearAllURLFilters]);

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

  // Note: Search is now initialized from URL params via useContentViewState,
  // so we don't need a separate effect for this

  const pageInfo = getPageInfo();
  // Only check loading state for the active view
  const isLoading = activeView === 'transcripts' ? transcriptsLoading : 
                    activeView === 'insights' ? insightsLoading : 
                    activeView === 'posts' ? postsLoading : false;
  const isCountsLoading = countsLoading;

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
              <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-3 h-auto p-1 bg-transparent border-0 gap-1">
                <TabsTrigger value="transcripts" className="flex flex-col items-center justify-center gap-0 py-1.5 px-2 text-sm font-medium rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200 min-w-0">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">Transcripts</span>
                  <div className="flex items-center gap-0.5">
                    <Badge variant="secondary" className="font-bold text-[10px] px-1.5 h-4">
                      {countsLoading ? "..." : counts.transcripts.total}
                    </Badge>
                    {counts.transcripts.raw > 0 && !countsLoading && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 font-medium text-[10px] px-1.5 h-4">
                        {counts.transcripts.raw}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              
                <TabsTrigger value="insights" className="flex flex-col items-center justify-center gap-0 py-1.5 px-2 text-sm font-medium rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200 min-w-0">
                  <Lightbulb className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">Insights</span>
                  <div className="flex items-center gap-0.5">
                    <Badge variant="secondary" className="font-bold text-[10px] px-1.5 h-4">
                      {countsLoading ? "..." : counts.insights.total}
                    </Badge>
                    {counts.insights.needsReview > 0 && !countsLoading && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-medium text-[10px] px-1.5 h-4">
                        {counts.insights.needsReview}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              
                <TabsTrigger value="posts" className="flex flex-col items-center justify-center gap-0 py-1.5 px-2 text-sm font-medium rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200 min-w-0">
                  <Edit3 className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">Posts</span>
                  <div className="flex items-center gap-0.5">
                    <Badge variant="secondary" className="font-bold text-[10px] px-1.5 h-4">
                      {countsLoading ? "..." : counts.posts.total}
                    </Badge>
                    {counts.posts.needsReview > 0 && !countsLoading && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-medium text-[10px] px-1.5 h-4">
                        {counts.posts.needsReview}
                      </Badge>
                    )}
                  </div>
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
              visibleColumns={state.columnVisibility[activeView]}
              availableColumns={
                activeView === 'posts' ? [
                  { id: 'title', label: 'Title' },
                  { id: 'platform', label: 'Platform' },
                  { id: 'status', label: 'Status' },
                  { id: 'createdAt', label: 'Created' },
                  { id: 'scheduledFor', label: 'Scheduled' },
                  { id: 'characterCount', label: 'Length' },
                  { id: 'insightTitle', label: 'Source' },
                ] : activeView === 'insights' ? [
                  { id: 'title', label: 'Title' },
                  { id: 'type', label: 'Type' },
                  { id: 'category', label: 'Category' },
                  { id: 'totalScore', label: 'Score' },
                  { id: 'status', label: 'Status' },
                  { id: 'createdAt', label: 'Created' },
                ] : [
                  { id: 'title', label: 'Title' },
                  { id: 'source', label: 'Source' },
                  { id: 'wordCount', label: 'Words' },
                  { id: 'status', label: 'Status' },
                  { id: 'createdAt', label: 'Created' },
                ]
              }
              onColumnVisibilityChange={(columnId, visible) => 
                dispatch({ 
                  type: 'SET_COLUMN_VISIBILITY', 
                  payload: { view: activeView, columnId, visible } 
                })
              }
            />

            {/* Content Views - part of the same card */}
            <div className="border-t border-gray-100">
              <TabsContent value="transcripts" className="mt-0" forceMount>
                <div className={activeView === 'transcripts' ? 'p-3 sm:p-6' : 'hidden'}>
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
                </div>
              </TabsContent>
            
              <TabsContent value="insights" className="mt-0" forceMount>
                <div className={activeView === 'insights' ? 'p-3 sm:p-6' : 'hidden'}>
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
                </div>
              </TabsContent>
            
              <TabsContent value="posts" className="mt-0" forceMount>
                <div className={activeView === 'posts' ? 'p-3 sm:p-6' : 'hidden'}>
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
              totalCount={postsResult?.meta?.total || posts.length}
              useServerFiltering={postStrategy.shouldUseServerFilters}
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
                </div>
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