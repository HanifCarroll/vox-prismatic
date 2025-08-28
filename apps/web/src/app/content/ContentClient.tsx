"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, Edit3, TrendingUp, Clock, Target } from "lucide-react";
import { useToast } from "@/lib/toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Import new state management
import { 
  ContentProvider, 
  useContentContext, 
  useActiveContentState,
  useContentOperations 
} from "./state/content-providers";
import { ModalManagerProvider, ModalType } from "./state/modal-manager";

// Import existing components
import TranscriptsView from "./components/transcripts/TranscriptsView";
import InsightsView from "./components/insights/InsightsView";
import PostsView from "./components/posts/PostsView";
import { UnifiedActionBar } from "./components/UnifiedActionBar";

// Import data hooks
import { useTranscripts } from "./hooks/useTranscriptQueries";
import { useInsights } from "./hooks/useInsightQueries";
import { usePosts } from "./hooks/usePostQueries";
import { useDashboardCounts } from "@/app/hooks/useDashboardQueries";
import { useHybridDataStrategy } from "./hooks/useHybridDataStrategy";

// Import modals
import TranscriptInputModal from "./components/modals/TranscriptInputModal";
import TranscriptModal from "./components/modals/TranscriptModal";
import InsightModal from "./components/modals/InsightModal";
import PostModal from "./components/modals/PostModal";
import { SchedulePostModal } from "./components/modals/SchedulePostModal";
import { BulkScheduleModal } from "@/components/BulkScheduleModal";

import type { TranscriptView, InsightView, PostView } from "@/types";

type ContentView = "transcripts" | "insights" | "posts";

interface ContentClientProps {
  initialView?: string;
  initialSearch?: string;
  initialFilters?: any;
  initialSort?: any;
}

// Main content display component (now much simpler)
function ContentDisplay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  // Use the new context-based state
  const { 
    searchQuery, 
    activeView, 
    setSearchQuery, 
    setActiveView,
    transcripts: transcriptState,
    insights: insightState,
    posts: postState,
    modals
  } = useContentContext();
  
  // Get the active content state
  const activeContent = useActiveContentState();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Fetch dashboard counts for strategy determination
  const { data: dashboardCounts, isLoading: countsLoading } = useDashboardCounts();
  
  // Determine data loading strategies
  const transcriptStrategy = useHybridDataStrategy({
    totalItems: dashboardCounts?.transcripts?.total || 100,
    isMobile,
    isTablet,
  });
  
  const insightStrategy = useHybridDataStrategy({
    totalItems: dashboardCounts?.insights?.total || 100,
    isMobile,
    isTablet,
  });
  
  const postStrategy = useHybridDataStrategy({
    totalItems: dashboardCounts?.posts?.total || 100,
    isMobile,
    isTablet,
  });
  
  // Data fetching with much simpler query parameters
  const { data: transcriptsResult, isLoading: transcriptsLoading } = useTranscripts({
    enabled: activeView === 'transcripts',
    status: transcriptState.state.statusFilter !== 'all' ? transcriptState.state.statusFilter : undefined,
    search: searchQuery || undefined,
    sortBy: transcriptState.state.sortBy.split('-')[0],
    sortOrder: transcriptState.state.sortBy.split('-')[1] as 'asc' | 'desc',
    limit: transcriptStrategy.shouldPaginate ? transcriptStrategy.pageSize : undefined,
    offset: transcriptStrategy.shouldPaginate ? (currentPage - 1) * transcriptStrategy.pageSize : 0,
    useServerFiltering: transcriptStrategy.shouldUseServerFilters,
  });
  
  const { data: insightsResult, isLoading: insightsLoading } = useInsights({
    enabled: activeView === 'insights',
    status: insightState.state.statusFilter !== 'all' ? insightState.state.statusFilter : undefined,
    category: insightState.state.categoryFilter !== 'all' ? insightState.state.categoryFilter : undefined,
    postType: insightState.state.postTypeFilter !== 'all' ? insightState.state.postTypeFilter : undefined,
    minScore: insightState.state.scoreRange[0] !== 0 ? insightState.state.scoreRange[0] : undefined,
    maxScore: insightState.state.scoreRange[1] !== 20 ? insightState.state.scoreRange[1] : undefined,
    search: searchQuery || undefined,
    sortBy: insightState.state.sortBy,
    sortOrder: insightState.state.sortOrder,
    limit: insightStrategy.shouldPaginate ? insightStrategy.pageSize : undefined,
    offset: insightStrategy.shouldPaginate ? (currentPage - 1) * insightStrategy.pageSize : 0,
    useServerFiltering: insightStrategy.shouldUseServerFilters,
  });
  
  const { data: postsResult, isLoading: postsLoading } = usePosts({
    enabled: activeView === 'posts',
    status: postState.state.statusFilter !== 'all' ? postState.state.statusFilter : undefined,
    platform: postState.state.platformFilter !== 'all' ? postState.state.platformFilter : undefined,
    search: searchQuery || undefined,
    sortBy: postState.computedValues.sortField,
    sortOrder: postState.computedValues.sortOrder,
    limit: postStrategy.shouldPaginate ? postStrategy.pageSize : undefined,
    offset: postStrategy.shouldPaginate ? (currentPage - 1) * postStrategy.pageSize : 0,
    useServerFiltering: postStrategy.shouldUseServerFilters,
  });
  
  // Extract data
  const transcripts = transcriptsResult?.data || [];
  const insights = insightsResult?.data || [];
  const posts = postsResult?.data || [];
  
  // Handle view changes
  const handleViewChange = useCallback((value: string) => {
    const newView = value as ContentView;
    setActiveView(newView);
    setCurrentPage(1);
    
    // Update URL
    const params = new URLSearchParams();
    params.set("view", newView);
    if (searchQuery) {
      params.set("search", searchQuery);
    }
    router.push(`/content?${params.toString()}`, { scroll: false });
  }, [setActiveView, searchQuery, router]);
  
  // Get page info with simplified logic
  const getPageInfo = () => {
    const baseStats = countsLoading || !dashboardCounts ? undefined : (() => {
      switch (activeView) {
        case "transcripts":
          return [
            { label: "Total Transcripts", value: dashboardCounts.transcripts.total, icon: FileText },
            { label: "Need Cleaning", value: dashboardCounts.transcripts.byStatus.raw || 0, icon: Target },
            { label: "Ready to Process", value: dashboardCounts.transcripts.byStatus.cleaned || 0, icon: TrendingUp },
          ];
        case "insights":
          return [
            { label: "Total Insights", value: dashboardCounts.insights.total, icon: Lightbulb },
            { label: "Need Review", value: dashboardCounts.insights.byStatus.needs_review || 0, icon: Target },
            { label: "Approved", value: dashboardCounts.insights.byStatus.approved || 0, icon: TrendingUp },
            { label: "Rejected", value: dashboardCounts.insights.byStatus.rejected || 0, icon: Clock },
          ];
        case "posts":
          return [
            { label: "Total Posts", value: dashboardCounts.posts.total, icon: Edit3 },
            { label: "Need Review", value: dashboardCounts.posts.byStatus.needs_review || 0, icon: Target },
            { label: "Scheduled", value: dashboardCounts.posts.byStatus.scheduled || 0, icon: Clock },
            { label: "Published", value: dashboardCounts.posts.byStatus.published || 0, icon: TrendingUp },
          ];
        default:
          return [];
      }
    })();
    
    return {
      title: "Content Pipeline",
      description: activeView === "transcripts" 
        ? "Process your transcripts through the content creation pipeline"
        : activeView === "insights"
        ? "Review and approve AI-generated insights from your content"
        : "Manage and schedule your social media posts",
      icon: activeView === "transcripts" ? FileText : activeView === "insights" ? Lightbulb : Edit3,
      stats: baseStats,
    };
  };
  
  // Simplified filter handling
  const handleFilterChange = useCallback((filterKey: string, value: string) => {
    switch (activeView) {
      case 'transcripts':
        if (filterKey === 'status') transcriptState.actions.setStatusFilter(value);
        if (filterKey === 'sort') transcriptState.actions.setSort(value);
        break;
      case 'insights':
        if (filterKey === 'status') insightState.actions.setStatusFilter(value);
        if (filterKey === 'category') insightState.actions.setCategoryFilter(value);
        if (filterKey === 'sort') {
          const [field, order] = value.split('-');
          insightState.actions.setSort(field, order as 'asc' | 'desc');
        }
        break;
      case 'posts':
        if (filterKey === 'status') postState.actions.setStatusFilter(value);
        if (filterKey === 'platform') postState.actions.setPlatformFilter(value);
        if (filterKey === 'sort') postState.actions.setSort(value);
        break;
    }
  }, [activeView, transcriptState.actions, insightState.actions, postState.actions]);
  
  const handleClearAllFilters = useCallback(() => {
    activeContent.actions.resetFilters();
    setSearchQuery('');
  }, [activeContent.actions, setSearchQuery]);
  
  // Current view data
  const currentViewData = useMemo(() => {
    const data = activeView === 'transcripts' ? transcripts : activeView === 'insights' ? insights : posts;
    return {
      data,
      selectedCount: activeContent.state.selectedItems.length,
      totalCount: data.length,
      filteredCount: data.length,
    };
  }, [activeView, transcripts, insights, posts, activeContent.state.selectedItems.length]);
  
  // Current filters for UnifiedActionBar
  const currentFilters = useMemo(() => {
    switch (activeView) {
      case 'transcripts':
        return {
          status: transcriptState.state.statusFilter,
          sort: transcriptState.state.sortBy,
        };
      case 'insights':
        return {
          status: insightState.state.statusFilter,
          category: insightState.state.categoryFilter,
          postType: insightState.state.postTypeFilter,
          sort: `${insightState.state.sortBy}-${insightState.state.sortOrder}`,
        };
      case 'posts':
        return {
          status: postState.state.statusFilter,
          platform: postState.state.platformFilter,
          sort: postState.state.sortBy,
        };
    }
  }, [activeView, transcriptState.state, insightState.state, postState.state]);
  
  // Available columns configuration
  const availableColumns = useMemo(() => {
    switch (activeView) {
      case 'transcripts':
        return [
          { id: 'title', label: 'Title' },
          { id: 'source', label: 'Source' },
          { id: 'wordCount', label: 'Words' },
          { id: 'status', label: 'Status' },
          { id: 'createdAt', label: 'Created' },
        ];
      case 'insights':
        return [
          { id: 'title', label: 'Title' },
          { id: 'type', label: 'Type' },
          { id: 'category', label: 'Category' },
          { id: 'totalScore', label: 'Score' },
          { id: 'status', label: 'Status' },
          { id: 'createdAt', label: 'Created' },
        ];
      case 'posts':
        return [
          { id: 'title', label: 'Title' },
          { id: 'platform', label: 'Platform' },
          { id: 'status', label: 'Status' },
          { id: 'createdAt', label: 'Created' },
          { id: 'scheduledFor', label: 'Scheduled' },
          { id: 'characterCount', label: 'Length' },
          { id: 'insightTitle', label: 'Source' },
        ];
    }
  }, [activeView]);
  
  const pageInfo = getPageInfo();
  const isLoading = activeView === 'transcripts' ? transcriptsLoading : 
                    activeView === 'insights' ? insightsLoading : postsLoading;

  return (
    <div className="h-full bg-gray-50">
      <div className="container mx-auto py-3 px-4 max-w-7xl">
        {/* Page Header */}
        <PageHeader
          title={pageInfo.title}
          description={pageInfo.description}
          stats={pageInfo.stats}
        />

        {/* Unified Control Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Content Tabs */}
          <Tabs value={activeView} onValueChange={handleViewChange} className="w-full">
            <div className="border-b border-gray-200">
              <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-3 h-auto p-1 bg-transparent border-0 gap-1">
                <TabsTrigger value="transcripts" className="flex flex-col items-center justify-center gap-0 py-1.5 px-2 text-sm font-medium rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200 min-w-0">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">Transcripts</span>
                  <Badge variant="secondary" className="font-bold text-[10px] px-1.5 h-4">
                    {countsLoading ? "..." : dashboardCounts?.transcripts?.total || 0}
                  </Badge>
                </TabsTrigger>
              
                <TabsTrigger value="insights" className="flex flex-col items-center justify-center gap-0 py-1.5 px-2 text-sm font-medium rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200 min-w-0">
                  <Lightbulb className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">Insights</span>
                  <Badge variant="secondary" className="font-bold text-[10px] px-1.5 h-4">
                    {countsLoading ? "..." : dashboardCounts?.insights?.total || 0}
                  </Badge>
                </TabsTrigger>
              
                <TabsTrigger value="posts" className="flex flex-col items-center justify-center gap-0 py-1.5 px-2 text-sm font-medium rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200 min-w-0">
                  <Edit3 className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">Posts</span>
                  <Badge variant="secondary" className="font-bold text-[10px] px-1.5 h-4">
                    {countsLoading ? "..." : dashboardCounts?.posts?.total || 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Action Bar - now much simpler */}
            <UnifiedActionBar
              activeView={activeView}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCount={currentViewData.selectedCount}
              totalCount={currentViewData.totalCount}
              filteredCount={currentViewData.filteredCount}
              onBulkAction={(action) => {
                // Handle bulk actions based on active view
                console.log(`Bulk action: ${action} for ${activeContent.state.selectedItems.length} items`);
                // Bulk actions will be handled by individual view components
              }}
              onSelectAll={(selected) => {
                if (selected) {
                  activeContent.actions.setSelectedItems(currentViewData.data.map((item: any) => item.id));
                } else {
                  activeContent.actions.clearSelection();
                }
              }}
              currentFilters={currentFilters}
              onFilterChange={handleFilterChange}
              onClearAllFilters={handleClearAllFilters}
              onAddToPipeline={() => modals.actions.showTranscriptInput()}
              visibleColumns={activeContent.state.columnVisibility}
              availableColumns={availableColumns}
              onColumnVisibilityChange={activeContent.actions.setColumnVisibility}
            />

            {/* Content Views - simplified props */}
            <div className="border-t border-gray-100">
              <TabsContent value="transcripts" className="mt-0" forceMount>
                <div className={activeView === 'transcripts' ? 'p-3 sm:p-6' : 'hidden'}>
                  <TranscriptsView 
                    transcripts={transcripts}
                    isLoading={transcriptsLoading}
                    searchQuery={searchQuery}
                    selectedItems={transcriptState.state.selectedItems}
                    onSelectionChange={transcriptState.actions.setSelectedItems}
                    statusFilter={transcriptState.state.statusFilter}
                    sortBy={transcriptState.state.sortBy}
                    onStatusFilterChange={transcriptState.actions.setStatusFilter}
                    onSortChange={transcriptState.actions.setSort}
                    onShowTranscriptInputModal={modals.actions.showTranscriptInput}
                    onShowTranscriptModal={modals.actions.showTranscriptModal}
                    totalCount={transcriptsResult?.meta?.pagination?.total}
                    useServerFiltering={transcriptStrategy.shouldUseServerFilters}
                    globalCounts={dashboardCounts?.transcripts}
                  />
                </div>
              </TabsContent>
            
              <TabsContent value="insights" className="mt-0" forceMount>
                <div className={activeView === 'insights' ? 'p-3 sm:p-6' : 'hidden'}>
                  <InsightsView 
                    insights={insights}
                    isLoading={insightsLoading}
                    searchQuery={searchQuery}
                    selectedItems={insightState.state.selectedItems}
                    onSelectionChange={insightState.actions.setSelectedItems}
                    statusFilter={insightState.state.statusFilter}
                    postTypeFilter={insightState.state.postTypeFilter}
                    categoryFilter={insightState.state.categoryFilter}
                    scoreRange={insightState.state.scoreRange}
                    sortBy={insightState.state.sortBy}
                    sortOrder={insightState.state.sortOrder}
                    totalCount={insightsResult?.meta?.pagination?.total || insights.length}
                    useServerFiltering={insightStrategy.shouldUseServerFilters}
                    onStatusFilterChange={insightState.actions.setStatusFilter}
                    onPostTypeFilterChange={insightState.actions.setPostTypeFilter}
                    onCategoryFilterChange={insightState.actions.setCategoryFilter}
                    onScoreRangeChange={insightState.actions.setScoreRange}
                    onSortChange={(field, order) => insightState.actions.setSort(field, order)}
                    onShowInsightModal={modals.actions.showInsightModal}
                    globalCounts={dashboardCounts?.insights}
                  />
                </div>
              </TabsContent>
            
              <TabsContent value="posts" className="mt-0" forceMount>
                <div className={activeView === 'posts' ? 'p-3 sm:p-6' : 'hidden'}>
                  <PostsView 
                    posts={posts}
                    isLoading={postsLoading}
                    searchQuery={searchQuery}
                    selectedItems={postState.state.selectedItems}
                    onSelectionChange={postState.actions.setSelectedItems}
                    statusFilter={postState.state.statusFilter}
                    platformFilter={postState.state.platformFilter}
                    sortBy={postState.state.sortBy}
                    onStatusFilterChange={postState.actions.setStatusFilter}
                    onPlatformFilterChange={postState.actions.setPlatformFilter}
                    onSortChange={postState.actions.setSort}
                    onShowPostModal={modals.actions.showPostModal}
                    onShowScheduleModal={modals.actions.showScheduleModal}
                    onShowBulkScheduleModal={modals.actions.showBulkScheduleModal}
                    onSearchQueryChange={setSearchQuery}
                    onHidePostModal={modals.actions.hidePostModal}
                    onHideScheduleModal={modals.actions.hideScheduleModal}
                    onHideBulkScheduleModal={modals.actions.hideBulkScheduleModal}
                    selectedPost={modals.state.selectedPost}
                    postToSchedule={modals.state.postToSchedule}
                    showPostModal={modals.modalState.isPostModalOpen}
                    showScheduleModal={modals.modalState.isScheduleModalOpen}
                    showBulkScheduleModal={modals.modalState.isBulkScheduleModalOpen}
                    totalCount={postsResult?.meta?.pagination?.total || posts.length}
                    useServerFiltering={postStrategy.shouldUseServerFilters}
                    globalCounts={dashboardCounts?.posts}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Modals - now managed by modal manager */}
        <TranscriptInputModal
          isOpen={modals.modalState.isTranscriptInputOpen}
          onClose={() => modals.actions.closeModal(ModalType.TRANSCRIPT_INPUT)}
          onSubmit={async (data) => {
            // Handle transcript creation
            console.log('Creating transcript:', data);
            modals.actions.closeModal(ModalType.TRANSCRIPT_INPUT);
          }}
        />

        <TranscriptModal
          transcript={modals.modalState.selectedTranscript}
          isOpen={modals.modalState.isTranscriptModalOpen}
          onClose={modals.actions.hideTranscriptModal}
          onSave={async (data) => {
            // Handle transcript save
            console.log('Saving transcript:', data);
            modals.actions.hideTranscriptModal();
          }}
          initialMode={modals.modalState.transcriptModalMode}
        />

        <InsightModal
          insight={modals.modalState.selectedInsight}
          isOpen={modals.modalState.isInsightModalOpen}
          onClose={modals.actions.hideInsightModal}
          onSave={async (data) => {
            // Handle insight save
            console.log('Saving insight:', data);
            modals.actions.hideInsightModal();
          }}
        />
        
        <PostModal
          post={modals.modalState.selectedPost}
          isOpen={modals.modalState.isPostModalOpen}
          onClose={modals.actions.hidePostModal}
          onSave={async (data) => {
            // Handle post save
            console.log('Saving post:', data);
            modals.actions.hidePostModal();
          }}
        />
        
        <SchedulePostModal
          post={modals.modalState.postToSchedule}
          isOpen={modals.modalState.isScheduleModalOpen}
          onClose={modals.actions.hideScheduleModal}
          onSchedule={async (data) => {
            // Handle post scheduling
            console.log('Scheduling post:', data);
            modals.actions.hideScheduleModal();
          }}
        />
        
        <BulkScheduleModal
          posts={posts.filter((p: PostView) => postState.state.selectedItems.includes(p.id))}
          isOpen={modals.modalState.isBulkScheduleModalOpen}
          onClose={modals.actions.hideBulkScheduleModal}
          onSchedule={async (schedules) => {
            // Handle bulk scheduling
            console.log('Bulk scheduling:', schedules);
            modals.actions.hideBulkScheduleModal();
            postState.actions.clearSelection();
          }}
        />
      </div>
    </div>
  );
}

// Main component with providers
export default function ContentClient({
  initialView = "transcripts",
  initialSearch,
  initialFilters,
  initialSort,
}: ContentClientProps) {
  return (
    <ModalManagerProvider>
      <ContentProvider
        initialView={initialView as any}
        initialSearch={initialSearch}
        initialFilters={initialFilters}
      >
        <ContentDisplay />
      </ContentProvider>
    </ModalManagerProvider>
  );
}