
import { useState, useCallback, useTransition, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Lightbulb, Edit3, Plus, Filter, Trash2, CheckCircle, XCircle, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/lib/toast";
import { JobProgressIndicator } from "@/components/workflow";

// Import React Query hooks
import { useTranscriptsQuery, useInsightsQuery, usePostsQuery, useDashboardCountsQuery, contentQueryKeys } from "@/hooks/useContentQueries";
import { useQueryClient } from "@tanstack/react-query";

// Import prefetching hooks
import { usePrefetchOnHover } from "@/hooks/usePrefetchOnHover";
import { useRelatedDataPrefetch } from "@/hooks/useRelatedDataPrefetch";

// Import components
import ContentTable from "./ContentTable";
import { VIEW_CONFIGS } from "./views/config";
import type { ActionConfig } from "./views/config";

// Import actions for modals
import { transcriptsAPI } from "@/lib/api";
import { UnifiedActionBar } from "./UnifiedActionBar";
import { useContentActions } from "@/hooks/useContentActions";

// Import modal store
import { useModalStore } from '@/lib/stores/modal-store';

import type { TranscriptView, InsightView, PostView } from "@content-creation/types";
import { ContentView, ModalType } from "@content-creation/types";

interface ContentClientProps {
  view: string;
  initialData: {
    transcripts: TranscriptView[];
    insights: InsightView[];
    posts: PostView[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export default function ContentClient({ 
  view: initialView, 
  initialData
}: ContentClientProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [currentSearchParams] = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  
  // Local state for ephemeral UI (not in URL)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // Ensure we're mounted before rendering interactive elements
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Get current view from props
  const activeView = initialView as ContentView;
  const viewConfig = VIEW_CONFIGS[activeView];
  
  // Query params from client-side URL (not server props)
  // Use currentSearchParams for real-time URL state
  // Memoize to prevent recreation on every render (which causes infinite refetches)
  const queryParams = useMemo(() => ({
    page: Number(currentSearchParams.get('page')) || 1,
    limit: Number(currentSearchParams.get('limit')) || 20,
    search: currentSearchParams.get('search') || undefined,
    status: currentSearchParams.get('status') as any,
    category: currentSearchParams.get('category') || undefined,
    postType: currentSearchParams.get('postType') || undefined,
    scoreMin: currentSearchParams.get('scoreMin') ? Number(currentSearchParams.get('scoreMin')) : undefined,
    scoreMax: currentSearchParams.get('scoreMax') ? Number(currentSearchParams.get('scoreMax')) : undefined,
    platform: currentSearchParams.get('platform') || undefined,
    sortBy: currentSearchParams.get('sortBy') || undefined,
    sortOrder: currentSearchParams.get('sortOrder') as 'asc' | 'desc' | undefined,
  }), [currentSearchParams]);
  
  // Use React Query with initialData to prevent refetching
  const transcriptsQuery = useTranscriptsQuery({
    ...queryParams,
    // Only fetch if this is the active view
    enabled: activeView === 'transcripts',
    initialData: activeView === 'transcripts' ? {
      items: initialData.transcripts,
      pagination: initialData.pagination,
    } : undefined,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch when component mounts if data is fresh
  });
  
  const insightsQuery = useInsightsQuery({
    ...queryParams,
    enabled: activeView === 'insights',
    initialData: activeView === 'insights' ? {
      items: initialData.insights,
      pagination: initialData.pagination,
    } : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  
  const postsQuery = usePostsQuery({
    ...queryParams,
    enabled: activeView === 'posts',
    initialData: activeView === 'posts' ? {
      items: initialData.posts,
      pagination: initialData.pagination,
    } : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  
  // Get the active query data
  const getActiveData = () => {
    switch (activeView) {
      case 'transcripts':
        return transcriptsQuery.data || { items: initialData.transcripts, pagination: initialData.pagination };
      case 'insights':
        return insightsQuery.data || { items: initialData.insights, pagination: initialData.pagination };
      case 'posts':
        return postsQuery.data || { items: initialData.posts, pagination: initialData.pagination };
      default:
        return { items: [], pagination: initialData.pagination };
    }
  };
  
  const data = getActiveData();
  
  // Use content actions hook with workflow job tracking
  const { handleAction, handleBulkAction, activeJobs, removeActiveJob, isConnected } = useContentActions(activeView);
  
  // Fetch dashboard counts for accurate totals across all views
  const dashboardCountsQuery = useDashboardCountsQuery();
  
  // Set up related data prefetching for workflow optimization
  // Convert URLSearchParams to plain object for the prefetch hook
  // Memoize to prevent recreation on every render
  const searchParamsObject = useMemo(
    () => Object.fromEntries(currentSearchParams.entries()),
    [currentSearchParams]
  );
  
  const { prefetchAdjacentViews, prefetchWorkflowNext } = useRelatedDataPrefetch({
    currentView: activeView,
    searchParams: searchParamsObject,
    counts: {
      transcripts: data.items.length,
      insights: activeView === 'insights' ? data.items.length : 0,
      posts: activeView === 'posts' ? data.items.length : 0,
    },
    autoMode: true,
    respectConnection: true,
  });
  
  // Helper to update URL params with shallow routing option
  const updateURL = useCallback((updates: Record<string, string | null>, options?: { shallow?: boolean }) => {
    const params = new URLSearchParams(currentSearchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    // Clean up empty params
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    
    if (options?.shallow) {
      // Use replace for shallow routing (no server refetch)
      navigate(url, { replace: true });
    } else {
      startTransition(() => {
        navigate(url);
      });
    }
  }, [currentSearchParams, pathname, navigate]);
  
  // Handle view change
  const handleViewChange = useCallback((newView: string) => {
    // Clear selections when changing views
    setSelectedItems([]);
    
    // Update URL with new view, reset page to 1
    updateURL({ 
      view: newView,
      page: '1',
      // Clear view-specific filters when switching
      category: null,
      postType: null,
      scoreMin: null,
      scoreMax: null,
      platform: null,
    });
  }, [updateURL]);
  
  // Use modal store instead of URL state
  const { openModal: openModalStore, closeAllModals } = useModalStore();
  
  // Define modal update handlers first (before they're referenced)
  const handleInsightModalUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
  }, [queryClient]);
  
  const handleTranscriptModalUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contentQueryKeys.transcripts() });
  }, [queryClient]);
  
  const handlePostModalUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
  }, [queryClient]);
  
  // Helper to map old modal types to new store types
  const openModal = useCallback((modalType: string, id?: string) => {
    // Map modal types to store modal types
    const modalMap: Record<string, any> = {
      'add-transcript': () => openModalStore('inputTranscript', {
        onSubmit: async (data: { title: string; content: string; fileName?: string }) => {
          const formData = new FormData();
          formData.append('title', data.title);
          formData.append('rawContent', data.content);
          if (data.fileName) {
            formData.append('fileName', data.fileName);
          }
          formData.append('sourceType', 'manual');
          
          const result = await transcriptsAPI.createTranscriptFromForm(formData);
          
          if (result.success) {
            toast.success('Transcript created successfully');
            closeAllModals();
            // Refresh the transcripts list
            if (activeView === 'transcripts') {
              transcriptsQuery.refetch();
            }
          } else {
            toast.error(result.error?.message || 'Failed to create transcript');
          }
        }
      }),
      'view-transcript': () => openModalStore('viewTranscript', {
        transcriptId: id,
        onUpdate: handleTranscriptModalUpdate
      }),
      'view-insight': () => openModalStore('viewInsight', {
        insightId: id,
        onUpdate: handleInsightModalUpdate
      }),
      'view-post': () => openModalStore('viewPost', {
        postId: id,
        onUpdate: handlePostModalUpdate
      }),
      'schedule-post': () => openModalStore('schedulePost', {
        postId: id,
        onSuccess: () => {
          toast.success('Post scheduled successfully');
          closeAllModals();
          queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
        }
      }),
      'bulk-schedule': () => {
        // Get current items dynamically when modal is opened
        const currentData = getActiveData();
        const items = currentData.items as PostView[];
        openModalStore('bulkSchedule', {
          posts: items.filter(item => selectedItems.includes(item.id)),
          onSchedule: async (schedules: any) => {
            toast.success(`${schedules.length} posts scheduled successfully`);
            closeAllModals();
            setSelectedItems([]);
            queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
          }
        });
      }
    };
    
    const handler = modalMap[modalType];
    if (handler) {
      handler();
    }
  }, [openModalStore, closeAllModals, activeView, transcriptsQuery, handleTranscriptModalUpdate, handleInsightModalUpdate, handlePostModalUpdate, queryClient, getActiveData, selectedItems, toast]);
  
  const closeModal = useCallback(() => {
    closeAllModals();
  }, [closeAllModals]);
  
  // Handle item click
  const handleItemClick = useCallback((id: string) => {
    openModal(`view-${activeView.slice(0, -1)}`, id); // view-transcript, view-insight, view-post
  }, [activeView, openModal]);
  
  // Handle actions with special cases
  const handleContentAction = useCallback(async (action: string, item: TranscriptView | InsightView | PostView) => {
    // Special handling for schedule action (opens modal)
    if (action === 'schedule' && activeView === 'posts') {
      openModal('schedule-post', item.id);
      return;
    }
    
    // All other actions go through the action handler
    await handleAction(action, item);
  }, [activeView, handleAction, openModal]);
  
  // Handle bulk actions with special cases
  const handleContentBulkAction = useCallback(async (action: string, itemIds: string[]) => {
    // Special handling for bulk schedule (opens modal)
    if (action === 'bulkSchedule' && activeView === 'posts') {
      openModal('bulk-schedule');
      return;
    }
    
    // All other bulk actions go through the handler
    await handleBulkAction(action, itemIds);
  }, [activeView, handleBulkAction, openModal]);
  
  // Handle search
  const handleSearch = useCallback((query: string) => {
    updateURL({ 
      search: query || null,
      page: '1' // Reset to first page on search
    });
  }, [updateURL]);
  
  // Handle filter change
  const handleFilterChange = useCallback((filterType: string, value: string | null) => {
    const updates: Record<string, string | null> = { [filterType]: value };
    
    // Reset page to 1 when filters change (except for sorting)
    if (filterType !== 'page' && filterType !== 'sortBy' && filterType !== 'sortOrder') {
      updates.page = '1';
    }
    
    updateURL(updates);
  }, [updateURL]);
  
  // Handle sort change
  const handleSortChange = useCallback((field: string, order: string) => {
    updateURL({ 
      sortBy: field,
      sortOrder: order 
    });
  }, [updateURL]);
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    updateURL({ page: page.toString() });
  }, [updateURL]);
  
  // Get modal state from client-side URL params (not server props)
  // Modals are now handled by the global ModalManager
  
  // Get the right items for the current view
  const currentItems = data.items as any[];
  
  // Show loading state until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Content Pipeline"
          description="Transform your content from raw transcripts to published posts"
        />
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="secondary" className="gap-1">
              <Wifi className="h-3 w-3" />
              Live Updates
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
          {activeJobs.length > 0 && (
            <Badge variant="default">
              {activeJobs.length} Processing
            </Badge>
          )}
        </div>
      </div>
      
      {/* Active Jobs Display */}
      {activeJobs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-blue-900">Processing Jobs</h3>
          <div className="space-y-2">
            {activeJobs.map(job => (
              <JobProgressIndicator
                key={job.id}
                jobId={job.jobId}
                title={job.title}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <Tabs value={activeView} onValueChange={handleViewChange}>
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="transcripts" className="gap-2">
              <FileText className="h-4 w-4" />
              Transcripts
              {dashboardCountsQuery.data?.transcripts.total ? (
                <Badge variant="secondary">{dashboardCountsQuery.data.transcripts.total}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
              {dashboardCountsQuery.data?.insights.total ? (
                <Badge variant="secondary">{dashboardCountsQuery.data.insights.total}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <Edit3 className="h-4 w-4" />
              Posts
              {dashboardCountsQuery.data?.posts.total ? (
                <Badge variant="secondary">{dashboardCountsQuery.data.posts.total}</Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            {activeView === 'transcripts' && (
              <Button onClick={() => openModal('add-transcript')} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Transcript
              </Button>
            )}
          </div>
        </div>
        
        {/* Unified Action Bar */}
        <UnifiedActionBar
          activeView={activeView}
          searchQuery={currentSearchParams.get('search') || ''}
          onSearchChange={handleSearch}
          selectedCount={selectedItems.length}
          totalCount={data.pagination.total}
          filteredCount={data.items.length}
          onBulkAction={(action) => handleContentBulkAction(action, selectedItems)}
          onCreateNew={activeView === 'transcripts' ? () => openModal('add-transcript') : undefined}
          currentFilters={{
            status: currentSearchParams.get('status') || undefined,
            platform: currentSearchParams.get('platform') || undefined,
            category: currentSearchParams.get('category') || undefined,
            sort: `${currentSearchParams.get('sortBy') || viewConfig.defaultSort.field}-${currentSearchParams.get('sortOrder') || viewConfig.defaultSort.order}`,
          }}
          onFilterChange={handleFilterChange}
          onClearAllFilters={() => {
            updateURL({
              status: null,
              platform: null,
              category: null,
              search: null,
              page: '1',
            });
          }}
          onSelectAll={(selected) => {
            if (selected) {
              setSelectedItems(currentItems.map(item => item.id));
            } else {
              setSelectedItems([]);
            }
          }}
          currentData={currentItems}
        />
        
        {/* Content Tables */}
        <TabsContent value={activeView}>
          <ContentTable
            view={activeView}
            data={currentItems}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            sortBy={currentSearchParams.get('sortBy') || viewConfig.defaultSort.field}
            sortOrder={currentSearchParams.get('sortOrder') || viewConfig.defaultSort.order}
            onSortChange={handleSortChange}
            onItemClick={handleItemClick}
            onAction={handleContentAction}
            onBulkAction={(action) => handleContentBulkAction(action, selectedItems)}
            isPending={isPending}
            pagination={data.pagination}
            onPageChange={handlePageChange}
            activeJobs={activeJobs}
          />
        </TabsContent>
      </Tabs>
      
      {/* Modals are now handled by the global ModalManager in AppLayout */}
    </div>
  );
}