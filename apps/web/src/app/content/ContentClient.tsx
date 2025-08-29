"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, Edit3, TrendingUp, Clock, Target } from "lucide-react";
import { useToast } from "@/lib/toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Import Zustand store and selectors
import {
  useSearchQuery,
  useActiveView,
  useSetSearchQuery,
  useSetActiveView,
  useTranscripts,
  useTranscriptActions,
  useTranscriptSelectionHandlers,
  useTranscriptComputedValues,
  useInsights,
  useInsightActions,
  useInsightSelectionHandlers,
  useInsightComputedValues,
  usePosts,
  usePostActions,
  usePostSelectionHandlers,
  usePostComputedValues,
  useModals,
  useModalActions,
  useModalComputedValues,
  useContentOperations,
  useActiveContentState,
  ModalType,
  HydrationBoundary,
} from "./store";

// Import existing components
import TranscriptsView from "./components/transcripts/TranscriptsView";
import InsightsView from "./components/insights/InsightsView";
import PostsView from "./components/posts/PostsView";
import { UnifiedActionBar } from "./components/UnifiedActionBar";

// Import server action data hooks
import { 
  useTranscriptsData,
  useInsightsData,
  usePostsData,
  useDashboardCountsData
} from "./hooks/use-server-actions";
import { useHybridDataStrategy } from "./hooks/useHybridDataStrategy";
import { useURLStateSync, type ParsedURLState } from "./hooks/useURLStateSync";

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

// Main component - no providers needed!
export default function ContentClient({
  initialView = "transcripts",
  initialSearch,
  initialFilters,
  initialSort,
}: ContentClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  // Use Zustand store directly
  const searchQuery = useSearchQuery();
  const activeView = useActiveView();
  const setSearchQuery = useSetSearchQuery();
  const setActiveView = useSetActiveView();
  
  // Get state for each content type
  const transcripts = useTranscripts();
  const transcriptActions = useTranscriptActions();
  const transcriptSelectionHandlers = useTranscriptSelectionHandlers();
  const transcriptComputedValues = useTranscriptComputedValues();
  
  const insights = useInsights();
  const insightActions = useInsightActions();
  const insightSelectionHandlers = useInsightSelectionHandlers();
  const insightComputedValues = useInsightComputedValues();
  
  const posts = usePosts();
  const postActions = usePostActions();
  const postSelectionHandlers = usePostSelectionHandlers();
  const postComputedValues = usePostComputedValues();
  
  const modals = useModals();
  const modalActions = useModalActions();
  const modalComputedValues = useModalComputedValues();
  
  // Get active content operations
  const activeContent = useContentOperations(activeView);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // URL state synchronization with bidirectional sync
  const urlSync = useURLStateSync({
    activeView: activeView as any,
    filters: {
      transcripts: {
        statusFilter: transcripts.statusFilter,
        sortBy: transcripts.sortBy,
      },
      insights: {
        statusFilter: insights.statusFilter,
        categoryFilter: insights.categoryFilter,
        postTypeFilter: insights.postTypeFilter,
        scoreRange: insights.scoreRange,
        sortBy: insights.sortBy,
        sortOrder: insights.sortOrder,
      },
      posts: {
        statusFilter: posts.statusFilter,
        platformFilter: posts.platformFilter,
        sortBy: posts.sortBy,
      },
    },
    searchQuery,
    currentPage,
    pageSize,
    onURLStateRestore: useCallback((state: ParsedURLState) => {
      // Restore state from URL parameters
      setActiveView(state.view as any);
      setSearchQuery(state.searchQuery);
      setCurrentPage(state.currentPage);
      setPageSize(state.pageSize);
      
      // Restore filters based on the active view
      switch (state.view) {
        case 'transcripts':
          transcriptActions.setStatusFilter(state.filters.transcripts.statusFilter);
          transcriptActions.setSort(state.filters.transcripts.sortBy);
          break;
        case 'insights':
          insightActions.setStatusFilter(state.filters.insights.statusFilter);
          insightActions.setCategoryFilter(state.filters.insights.categoryFilter);
          insightActions.setPostTypeFilter(state.filters.insights.postTypeFilter);
          insightActions.setScoreRange(state.filters.insights.scoreRange);
          insightActions.setSort(state.filters.insights.sortBy, state.filters.insights.sortOrder);
          break;
        case 'posts':
          postActions.setStatusFilter(state.filters.posts.statusFilter);
          postActions.setPlatformFilter(state.filters.posts.platformFilter);
          postActions.setSort(state.filters.posts.sortBy);
          break;
      }
    }, [setActiveView, setSearchQuery, setCurrentPage, setPageSize, transcriptActions, insightActions, postActions]),
  });

  // Fetch dashboard counts for strategy determination
  const dashboardCountsHook = useDashboardCountsData();
  const dashboardCounts = dashboardCountsHook.data;
  const countsLoading = dashboardCountsHook.isLoading;

  // Fetch dashboard counts on mount
  useEffect(() => {
    dashboardCountsHook.fetchDashboardCounts();
  }, [dashboardCountsHook.fetchDashboardCounts]);
  
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

  // Server action data hooks
  const transcriptsData = useTranscriptsData();
  const insightsData = useInsightsData();
  const postsData = usePostsData();

  // Fetch data when view becomes active or filters change
  useEffect(() => {
    if (activeView === 'transcripts') {
      transcriptsData.fetchTranscripts({
        status: transcripts.statusFilter !== 'all' ? transcripts.statusFilter : undefined,
        search: searchQuery || undefined,
        sortBy: transcripts.sortBy.split('-')[0],
        sortOrder: transcripts.sortBy.split('-')[1] as 'asc' | 'desc',
        page: currentPage,
        limit: transcriptStrategy.shouldPaginate ? transcriptStrategy.pageSize : undefined,
      });
    }
  }, [
    activeView,
    transcripts.statusFilter,
    transcripts.sortBy,
    searchQuery,
    currentPage,
    transcriptStrategy.shouldPaginate,
    transcriptStrategy.pageSize,
    transcriptsData.fetchTranscripts
  ]);

  useEffect(() => {
    if (activeView === 'insights') {
      insightsData.fetchInsights({
        status: insights.statusFilter !== 'all' ? insights.statusFilter : undefined,
        category: insights.categoryFilter !== 'all' ? insights.categoryFilter : undefined,
        postType: insights.postTypeFilter !== 'all' ? insights.postTypeFilter : undefined,
        scoreMin: insights.scoreRange[0] !== 0 ? insights.scoreRange[0] : undefined,
        scoreMax: insights.scoreRange[1] !== 20 ? insights.scoreRange[1] : undefined,
        search: searchQuery || undefined,
        sortBy: insights.sortBy,
        sortOrder: insights.sortOrder,
        page: currentPage,
        limit: insightStrategy.shouldPaginate ? insightStrategy.pageSize : undefined,
      });
    }
  }, [
    activeView,
    insights.statusFilter,
    insights.categoryFilter,
    insights.postTypeFilter,
    insights.scoreRange,
    insights.sortBy,
    insights.sortOrder,
    searchQuery,
    currentPage,
    insightStrategy.shouldPaginate,
    insightStrategy.pageSize,
    insightsData.fetchInsights
  ]);

  useEffect(() => {
    if (activeView === 'posts') {
      postsData.fetchPosts({
        status: posts.statusFilter !== 'all' ? posts.statusFilter : undefined,
        platform: posts.platformFilter !== 'all' ? posts.platformFilter : undefined,
        search: searchQuery || undefined,
        sortBy: postComputedValues.sortField,
        sortOrder: postComputedValues.sortOrder,
        page: currentPage,
        limit: postStrategy.shouldPaginate ? postStrategy.pageSize : undefined,
      });
    }
  }, [
    activeView,
    posts.statusFilter,
    posts.platformFilter,
    searchQuery,
    currentPage,
    postComputedValues.sortField,
    postComputedValues.sortOrder,
    postStrategy.shouldPaginate,
    postStrategy.pageSize,
    postsData.fetchPosts
  ]);
  
  // Handle view changes
  const handleViewChange = useCallback((value: string) => {
    const newView = value as ContentView;
    setActiveView(newView);
    setCurrentPage(1);
    // URL will be updated automatically by useURLStateSync
  }, [setActiveView, setCurrentPage]);
  
  // Handle keyboard shortcuts for modals
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle modal keyboard shortcuts
      if (event.key === 'Escape' && modalComputedValues.hasActiveModals) {
        modalActions.closeAllModals();
      }
    };
    
    if (modalComputedValues.hasActiveModals) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [modalComputedValues.hasActiveModals, modalActions]);
  
  // Get page info
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
  
  // Handle filter changes
  const handleFilterChange = useCallback((filterKey: string, value: string) => {
    switch (activeView) {
      case 'transcripts':
        if (filterKey === 'status') transcriptActions.setStatusFilter(value);
        if (filterKey === 'sort') transcriptActions.setSort(value);
        break;
      case 'insights':
        if (filterKey === 'status') insightActions.setStatusFilter(value);
        if (filterKey === 'category') insightActions.setCategoryFilter(value);
        if (filterKey === 'sort') {
          const [field, order] = value.split('-');
          insightActions.setSort(field, order as 'asc' | 'desc');
        }
        break;
      case 'posts':
        if (filterKey === 'status') postActions.setStatusFilter(value);
        if (filterKey === 'platform') postActions.setPlatformFilter(value);
        if (filterKey === 'sort') postActions.setSort(value);
        break;
    }
  }, [activeView, transcriptActions, insightActions, postActions]);
  
  const handleClearAllFilters = useCallback(() => {
    activeContent.operations.clearAllFilters();
    setSearchQuery('');
  }, [activeContent.operations, setSearchQuery]);
  
  // Current view data
  const currentViewData = useMemo(() => {
    const data = activeView === 'transcripts' ? transcriptsData.data : 
                 activeView === 'insights' ? insightsData.data : postsData.data;
    const pagination = activeView === 'transcripts' ? transcriptsData.pagination : 
                      activeView === 'insights' ? insightsData.pagination : postsData.pagination;
    
    return {
      data,
      selectedCount: activeContent.state.selectedItems.length,
      totalCount: pagination?.total || data.length,
      filteredCount: data.length,
    };
  }, [activeView, transcriptsData.data, insightsData.data, postsData.data, 
      transcriptsData.pagination, insightsData.pagination, postsData.pagination,
      activeContent.state.selectedItems.length]);
  
  // Current filters for UnifiedActionBar
  const currentFilters = useMemo(() => {
    switch (activeView) {
      case 'transcripts':
        return {
          status: transcripts.statusFilter,
          sort: transcripts.sortBy,
        };
      case 'insights':
        return {
          status: insights.statusFilter,
          category: insights.categoryFilter,
          postType: insights.postTypeFilter,
          sort: `${insights.sortBy}-${insights.sortOrder}`,
        };
      case 'posts':
        return {
          status: posts.statusFilter,
          platform: posts.platformFilter,
          sort: posts.sortBy,
        };
    }
  }, [activeView, transcripts, insights, posts]);
  
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
  const isLoading = activeView === 'transcripts' ? transcriptsData.loading : 
                    activeView === 'insights' ? insightsData.loading : postsData.loading;

  return (
    <HydrationBoundary>
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

              {/* Action Bar */}
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
                onAddToPipeline={() => modalActions.openModal(ModalType.TRANSCRIPT_INPUT)}
                visibleColumns={activeContent.state.columnVisibility}
                availableColumns={availableColumns}
                onColumnVisibilityChange={activeContent.actions.setColumnVisibility}
              />

              {/* Content Views */}
              <div className="border-t border-gray-100">
                <TabsContent value="transcripts" className="mt-0" forceMount>
                  <div className={activeView === 'transcripts' ? 'p-3 sm:p-6' : 'hidden'}>
                    <TranscriptsView 
                      transcripts={transcriptsData.data}
                      isLoading={transcriptsData.loading}
                      searchQuery={searchQuery}
                      selectedItems={transcripts.selectedItems}
                      onSelectionChange={transcriptActions.setSelectedItems}
                      statusFilter={transcripts.statusFilter}
                      sortBy={transcripts.sortBy}
                      onStatusFilterChange={transcriptActions.setStatusFilter}
                      onSortChange={transcriptActions.setSort}
                      onShowTranscriptInputModal={() => modalActions.openModal(ModalType.TRANSCRIPT_INPUT)}
                      onShowTranscriptModal={(transcript, mode) => {
                        modalActions.setTranscriptData(transcript, mode);
                        modalActions.openModal(mode === 'edit' ? ModalType.TRANSCRIPT_EDIT : ModalType.TRANSCRIPT_VIEW);
                      }}
                      totalCount={transcriptsData.pagination?.total}
                      useServerFiltering={transcriptStrategy.shouldUseServerFilters}
                      globalCounts={dashboardCounts?.transcripts}
                    />
                  </div>
                </TabsContent>
              
                <TabsContent value="insights" className="mt-0" forceMount>
                  <div className={activeView === 'insights' ? 'p-3 sm:p-6' : 'hidden'}>
                    <InsightsView 
                      insights={insightsData.data}
                      isLoading={insightsData.loading}
                      searchQuery={searchQuery}
                      selectedItems={insights.selectedItems}
                      onSelectionChange={insightActions.setSelectedItems}
                      statusFilter={insights.statusFilter}
                      postTypeFilter={insights.postTypeFilter}
                      categoryFilter={insights.categoryFilter}
                      scoreRange={insights.scoreRange}
                      sortBy={insights.sortBy}
                      sortOrder={insights.sortOrder}
                      totalCount={insightsData.pagination?.total}
                      useServerFiltering={insightStrategy.shouldUseServerFilters}
                      onStatusFilterChange={insightActions.setStatusFilter}
                      onPostTypeFilterChange={insightActions.setPostTypeFilter}
                      onCategoryFilterChange={insightActions.setCategoryFilter}
                      onScoreRangeChange={insightActions.setScoreRange}
                      onSortChange={(field, order) => insightActions.setSort(field, order)}
                      onShowInsightModal={(insight) => {
                        modalActions.setInsightData(insight);
                        modalActions.openModal(ModalType.INSIGHT_VIEW);
                      }}
                      globalCounts={dashboardCounts?.insights}
                    />
                  </div>
                </TabsContent>
              
                <TabsContent value="posts" className="mt-0" forceMount>
                  <div className={activeView === 'posts' ? 'p-3 sm:p-6' : 'hidden'}>
                    <PostsView 
                      posts={postsData.data}
                      isLoading={postsData.loading}
                      searchQuery={searchQuery}
                      selectedItems={posts.selectedItems}
                      onSelectionChange={postActions.setSelectedItems}
                      statusFilter={posts.statusFilter}
                      platformFilter={posts.platformFilter}
                      sortBy={posts.sortBy}
                      onStatusFilterChange={postActions.setStatusFilter}
                      onPlatformFilterChange={postActions.setPlatformFilter}
                      onSortChange={postActions.setSort}
                      onShowPostModal={(post) => {
                        modalActions.setPostData(post);
                        modalActions.openModal(ModalType.POST_VIEW);
                      }}
                      onShowScheduleModal={(post) => {
                        modalActions.setSchedulePostData(post);
                        modalActions.openModal(ModalType.POST_SCHEDULE);
                      }}
                      onShowBulkScheduleModal={() => {
                        modalActions.openModal(ModalType.BULK_SCHEDULE);
                      }}
                      onSearchQueryChange={setSearchQuery}
                      onHidePostModal={() => modalActions.closeModal(ModalType.POST_VIEW)}
                      onHideScheduleModal={() => modalActions.closeModal(ModalType.POST_SCHEDULE)}
                      onHideBulkScheduleModal={() => modalActions.closeModal(ModalType.BULK_SCHEDULE)}
                      selectedPost={modals.selectedPost}
                      postToSchedule={modals.postToSchedule}
                      showPostModal={modalComputedValues.isModalOpen('post_view')}
                      showScheduleModal={modalComputedValues.isModalOpen('post_schedule')}
                      showBulkScheduleModal={modalComputedValues.isModalOpen('bulk_schedule')}
                      totalCount={postsData.pagination?.total}
                      useServerFiltering={postStrategy.shouldUseServerFilters}
                      globalCounts={dashboardCounts?.posts}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Modals */}
          <TranscriptInputModal
            isOpen={modalComputedValues.isModalOpen('transcript_input')}
            onClose={() => modalActions.closeModal(ModalType.TRANSCRIPT_INPUT)}
            onSubmit={async (data) => {
              // Handle transcript creation
              console.log('Creating transcript:', data);
              modalActions.closeModal(ModalType.TRANSCRIPT_INPUT);
            }}
          />

          <TranscriptModal
            transcript={modals.selectedTranscript}
            isOpen={modalComputedValues.isModalOpen('transcript_view') || modalComputedValues.isModalOpen('transcript_edit')}
            onClose={() => {
              modalActions.closeModal(ModalType.TRANSCRIPT_VIEW);
              modalActions.closeModal(ModalType.TRANSCRIPT_EDIT);
            }}
            onSave={async (data) => {
              // Handle transcript save
              console.log('Saving transcript:', data);
              modalActions.closeModal(ModalType.TRANSCRIPT_VIEW);
              modalActions.closeModal(ModalType.TRANSCRIPT_EDIT);
            }}
            initialMode={modals.transcriptModalMode}
          />

          <InsightModal
            insight={modals.selectedInsight}
            isOpen={modalComputedValues.isModalOpen('insight_view')}
            onClose={() => modalActions.closeModal(ModalType.INSIGHT_VIEW)}
            onSave={async (data) => {
              // Handle insight save
              console.log('Saving insight:', data);
              modalActions.closeModal(ModalType.INSIGHT_VIEW);
            }}
          />
          
          <PostModal
            post={modals.selectedPost}
            isOpen={modalComputedValues.isModalOpen('post_view')}
            onClose={() => modalActions.closeModal(ModalType.POST_VIEW)}
            onSave={async (data) => {
              // Handle post save
              console.log('Saving post:', data);
              modalActions.closeModal(ModalType.POST_VIEW);
            }}
          />
          
          <SchedulePostModal
            post={modals.postToSchedule}
            isOpen={modalComputedValues.isModalOpen('post_schedule')}
            onClose={() => modalActions.closeModal(ModalType.POST_SCHEDULE)}
            onSchedule={async (data) => {
              // Handle post scheduling
              console.log('Scheduling post:', data);
              modalActions.closeModal(ModalType.POST_SCHEDULE);
            }}
          />
          
          <BulkScheduleModal
            posts={(postsData.data || []).filter((p: PostView) => posts.selectedItems.includes(p.id))}
            isOpen={modalComputedValues.isModalOpen('bulk_schedule')}
            onClose={() => modalActions.closeModal(ModalType.BULK_SCHEDULE)}
            onSchedule={async (schedules) => {
              // Handle bulk scheduling
              console.log('Bulk scheduling:', schedules);
              modalActions.closeModal(ModalType.BULK_SCHEDULE);
              postActions.clearSelection();
            }}
          />
        </div>
      </div>
    </HydrationBoundary>
  );
}