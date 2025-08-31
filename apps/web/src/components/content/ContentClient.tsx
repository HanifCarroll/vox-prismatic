import { useState, useCallback, useTransition, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, Edit3 } from "lucide-react";
import { useToast } from "@/lib/toast";
import { JobProgressIndicator } from "@/components/workflow";

// Import React Query hooks - simplified direct usage
import { useTranscriptsQuery, useInsightsQuery, usePostsQuery, useDashboardCountsQuery, contentQueryKeys } from "@/hooks/useContentQueries";
import { useQueryClient } from "@tanstack/react-query";

// Import components
import ContentTable from "./ContentTable";
import { VIEW_CONFIGS } from "./views/config";

// Import actions for modals
import { transcriptsAPI } from "@/lib/api";
import { UnifiedActionBar } from "./UnifiedActionBar";
import { useContentActions } from "@/hooks/useContentActions";

// Import modal store
import { useModalStore } from '@/lib/stores/modal-store';

import type { TranscriptView, InsightView, PostView } from "@content-creation/types";
import { ContentView } from "@content-creation/types";

// Skeleton component for loading states
function ContentSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
        </div>
        
        {/* Tabs skeleton */}
        <div className="flex gap-4 mb-6">
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        
        {/* Action bar skeleton */}
        <div className="h-16 bg-gray-100 rounded mb-4"></div>
        
        {/* Table skeleton */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border-b last:border-b-0">
              <div className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ContentClient() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [currentSearchParams] = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  
  // Get current view from URL params with fallback
  const activeView = (currentSearchParams.get('view') || 'transcripts') as ContentView;
  const viewConfig = VIEW_CONFIGS[activeView];
  
  // Local state for ephemeral UI (not in URL)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // Ensure we're mounted before rendering interactive elements
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Client-side pagination parameters
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = Number(currentSearchParams.get('limit')) || 20;
  
  // Direct React Query usage with smart caching
  const transcriptsQuery = useTranscriptsQuery({
    enabled: activeView === 'transcripts',
  });
  
  const insightsQuery = useInsightsQuery({
    enabled: activeView === 'insights',
  });
  
  const postsQuery = usePostsQuery({
    enabled: activeView === 'posts',
  });
  
  // Get all items for the active view - simplified logic
  const allItems = useMemo(() => {
    switch (activeView) {
      case 'transcripts':
        return transcriptsQuery.data || [];
      case 'insights':
        return insightsQuery.data || [];
      case 'posts':
        return postsQuery.data || [];
      default:
        return [];
    }
  }, [activeView, transcriptsQuery.data, insightsQuery.data, postsQuery.data]);

  // Client-side data processing: filtering, sorting, and pagination
  const processedItems = useMemo(() => {
    let items = [...allItems];

    // Apply search filter
    const searchQuery = currentSearchParams.get('search');
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        // Search across multiple fields based on content type
        const searchableText = [
          item.title,
          'content' in item ? item.content : undefined,
          'rawContent' in item ? item.rawContent : undefined,
          'cleanedContent' in item ? item.cleanedContent : undefined,
          'category' in item ? item.category : undefined,
          'summary' in item ? item.summary : undefined,
          'verbatimQuote' in item ? item.verbatimQuote : undefined,
        ].filter(Boolean).join(' ').toLowerCase();

        return searchableText.includes(query);
      });
    }

    // Apply status filter
    const statusFilter = currentSearchParams.get('status');
    if (statusFilter && statusFilter !== 'all') {
      items = items.filter(item => item.status === statusFilter);
    }

    // Apply category filter (for insights only)
    const categoryFilter = currentSearchParams.get('category');
    if (categoryFilter) {
      items = items.filter(item => 'category' in item && item.category === categoryFilter);
    }

    // Apply platform filter (for posts only)
    const platformFilter = currentSearchParams.get('platform');
    if (platformFilter) {
      items = items.filter(item => 'platform' in item && item.platform === platformFilter);
    }

    // Apply post type filter (for insights only)
    const postTypeFilter = currentSearchParams.get('postType');
    if (postTypeFilter) {
      items = items.filter(item => 'postType' in item && item.postType === postTypeFilter);
    }

    // Apply score filters (for insights)
    const scoreMin = currentSearchParams.get('scoreMin');
    const scoreMax = currentSearchParams.get('scoreMax');
    if (scoreMin || scoreMax) {
      items = items.filter(item => {
        if (!('totalScore' in item)) return true;
        const score = item.totalScore;
        if (scoreMin && score < Number(scoreMin)) return false;
        if (scoreMax && score > Number(scoreMax)) return false;
        return true;
      });
    }

    // Apply sorting
    const sortBy = currentSearchParams.get('sortBy') || viewConfig.defaultSort.field;
    const sortOrder = currentSearchParams.get('sortOrder') || viewConfig.defaultSort.order;

    items.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortOrder === 'asc' ? 1 : -1;
      if (bVal == null) return sortOrder === 'asc' ? -1 : 1;

      // Handle dates
      if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'scheduledFor') {
        const aTime = new Date(aVal).getTime();
        const bTime = new Date(bVal).getTime();
        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return items;
  }, [allItems, currentSearchParams, viewConfig.defaultSort]);

  // Client-side pagination
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return processedItems.slice(start, end);
  }, [processedItems, currentPage, pageSize]);

  const clientPagination = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    total: processedItems.length,
    totalPages: Math.ceil(processedItems.length / pageSize),
  }), [processedItems.length, currentPage, pageSize]);
  
  // Use content actions hook with workflow job tracking
  const { handleAction, handleBulkAction, activeJobs, isConnected } = useContentActions(activeView);
  
  // Fetch dashboard counts for accurate totals across all views
  const dashboardCountsQuery = useDashboardCountsQuery();
  
  // Helper to update URL params
  const updateURL = useCallback((updates: Record<string, string | null>, options?: { shallow?: boolean }) => {
    const params = new URLSearchParams(currentSearchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    
    if (options?.shallow) {
      navigate(url, { replace: true });
    } else {
      startTransition(() => {
        navigate(url);
      });
    }
  }, [currentSearchParams, pathname, navigate]);
  
  // Handle view change
  const handleViewChange = useCallback((newView: string) => {
    setSelectedItems([]);
    updateURL({ 
      view: newView,
      page: '1',
      category: null,
      postType: null,
      scoreMin: null,
      scoreMax: null,
      platform: null,
    });
  }, [updateURL]);
  
  // Modal handlers
  const { openModal: openModalStore, closeAllModals } = useModalStore();
  
  const handleInsightModalUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contentQueryKeys.insights() });
  }, [queryClient]);
  
  const handleTranscriptModalUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contentQueryKeys.transcripts() });
  }, [queryClient]);
  
  const handlePostModalUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
  }, [queryClient]);
  
  const openModal = useCallback((modalType: string, id?: string) => {
    const modalMap: Record<string, any> = {
      'add-transcript': () => openModalStore('inputTranscript', {
        isOpen: true,
        onClose: closeAllModals,
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
        isOpen: true,
        onClose: closeAllModals,
        onUpdate: handleTranscriptModalUpdate
      }),
      'view-insight': () => openModalStore('viewInsight', {
        insightId: id,
        isOpen: true,
        onClose: closeAllModals,
        onUpdate: handleInsightModalUpdate
      }),
      'view-post': () => openModalStore('viewPost', {
        postId: id,
        isOpen: true,
        onClose: closeAllModals,
        onUpdate: handlePostModalUpdate
      }),
      'schedule-post': () => openModalStore('schedulePost', {
        postId: id,
        isOpen: true,
        onClose: closeAllModals,
        onSuccess: () => {
          toast.success('Post scheduled successfully');
          closeAllModals();
          queryClient.invalidateQueries({ queryKey: contentQueryKeys.posts() });
        }
      }),
      'bulk-schedule': () => {
        const items = allItems as PostView[];
        openModalStore('bulkSchedule', {
          posts: items.filter(item => selectedItems.includes(item.id)),
          isOpen: true,
          onClose: closeAllModals,
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
  }, [openModalStore, closeAllModals, activeView, transcriptsQuery, handleTranscriptModalUpdate, handleInsightModalUpdate, handlePostModalUpdate, queryClient, allItems, selectedItems, toast]);
  
  // Handle item click
  const handleItemClick = useCallback((id: string) => {
    openModal(`view-${activeView.slice(0, -1)}`, id);
  }, [activeView, openModal]);
  
  // Handle actions with special cases
  const handleContentAction = useCallback(async (action: string, item: TranscriptView | InsightView | PostView) => {
    if (action === 'schedule' && activeView === 'posts') {
      openModal('schedule-post', item.id);
      return;
    }
    await handleAction(action, item);
  }, [activeView, handleAction, openModal]);
  
  // Handle bulk actions with special cases
  const handleContentBulkAction = useCallback(async (action: string, itemIds: string[]) => {
    if (action === 'bulkSchedule' && activeView === 'posts') {
      openModal('bulk-schedule');
      return;
    }
    await handleBulkAction(action, itemIds);
  }, [activeView, handleBulkAction, openModal]);
  
  // Handle search
  const handleSearch = useCallback((query: string) => {
    updateURL({ 
      search: query || null,
      page: '1'
    });
  }, [updateURL]);
  
  // Handle filter change
  const handleFilterChange = useCallback((filterType: string, value: string | null) => {
    const updates: Record<string, string | null> = { [filterType]: value };
    
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
  
  // Check loading states
  const isInitialLoading = useMemo(() => {
    switch (activeView) {
      case 'transcripts':
        return transcriptsQuery.isLoading;
      case 'insights':
        return insightsQuery.isLoading;
      case 'posts':
        return postsQuery.isLoading;
      default:
        return false;
    }
  }, [activeView, transcriptsQuery.isLoading, insightsQuery.isLoading, postsQuery.isLoading]);
  
  const isFetching = useMemo(() => {
    switch (activeView) {
      case 'transcripts':
        return transcriptsQuery.isFetching;
      case 'insights':
        return insightsQuery.isFetching;
      case 'posts':
        return postsQuery.isFetching;
      default:
        return false;
    }
  }, [activeView, transcriptsQuery.isFetching, insightsQuery.isFetching, postsQuery.isFetching]);
  
  // Show skeleton loading state for initial load or when not mounted
  if (!mounted || isInitialLoading) {
    return <ContentSkeleton />;
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Content Pipeline"
          description="Transform your content from raw transcripts to published posts"
        />
        <div className="flex items-center gap-2">
          {isFetching && (
            <Badge variant="outline" className="animate-pulse">
              Refreshing...
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
        </div>
        
        {/* Unified Action Bar */}
        <UnifiedActionBar
          activeView={activeView}
          searchQuery={currentSearchParams.get('search') || ''}
          onSearchChange={handleSearch}
          selectedCount={selectedItems.length}
          totalCount={processedItems.length}
          filteredCount={paginatedItems.length}
          onBulkAction={(action) => handleContentBulkAction(action, selectedItems)}
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
              setSelectedItems(paginatedItems.map(item => item.id));
            } else {
              setSelectedItems([]);
            }
          }}
          currentData={paginatedItems}
        />
        
        {/* Content Tables */}
        <TabsContent value={activeView}>
          <ContentTable
            view={activeView}
            data={paginatedItems as any[]}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            sortBy={currentSearchParams.get('sortBy') || viewConfig.defaultSort.field}
            sortOrder={currentSearchParams.get('sortOrder') || viewConfig.defaultSort.order}
            onSortChange={handleSortChange}
            onItemClick={handleItemClick}
            onAction={handleContentAction}
            onBulkAction={(action) => handleContentBulkAction(action, selectedItems)}
            isPending={isPending || isFetching}
            pagination={clientPagination}
            onPageChange={handlePageChange}
            activeJobs={activeJobs}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}