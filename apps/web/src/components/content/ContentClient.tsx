
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
  
  // Client-side pagination parameters (no longer sent to server)
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = Number(currentSearchParams.get('limit')) || 20;
  
  // Use React Query with proper initial data to prevent duplicate requests
  // Enable queries only for the active view to avoid unnecessary network calls
  const transcriptsQuery = useTranscriptsQuery({
    enabled: activeView === 'transcripts',
    initialData: {
      items: initialData.transcripts || [],
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch when component mounts if data is fresh
  });
  
  const insightsQuery = useInsightsQuery({
    enabled: activeView === 'insights',
    initialData: {
      items: initialData.insights || [],
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  
  const postsQuery = usePostsQuery({
    enabled: activeView === 'posts',
    initialData: {
      items: initialData.posts || [],
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  
  // Get all items for the active view (no server-side filtering)
  const getActiveData = (): (TranscriptView | InsightView | PostView)[] => {
    let data: (TranscriptView | InsightView | PostView)[] = [];
    
    switch (activeView) {
      case 'transcripts': {
        const query = transcriptsQuery;
        const initialViewData = initialData.transcripts || [];
        
        // Priority order for data resolution:
        // 1. Use React Query data if available and fresh
        // 2. Use initialData (from server-side fetch) as fallback
        // 3. Use empty array as last resort
        if (query.data?.items && Array.isArray(query.data.items)) {
          data = query.data.items;
        } else if (initialViewData && Array.isArray(initialViewData) && initialViewData.length > 0) {
          data = initialViewData;
        }
        
        // Debug logging only in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[${activeView}] getActiveData:`, {
            queryState: {
              isLoading: query.isLoading,
              isError: query.isError,
              hasData: !!query.data,
              dataItems: query.data?.items?.length || 0,
            },
            initialViewDataLength: Array.isArray(initialViewData) ? initialViewData.length : 'NOT_ARRAY',
            finalDataLength: Array.isArray(data) ? data.length : 'NOT_ARRAY'
          });
        }
        break;
      }
      case 'insights': {
        const query = insightsQuery;
        const initialViewData = initialData.insights || [];
        
        if (query.data?.items && Array.isArray(query.data.items)) {
          data = query.data.items;
        } else if (initialViewData && Array.isArray(initialViewData) && initialViewData.length > 0) {
          data = initialViewData;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[${activeView}] getActiveData:`, {
            queryState: {
              isLoading: query.isLoading,
              isError: query.isError,
              hasData: !!query.data,
              dataItems: query.data?.items?.length || 0,
            },
            initialViewDataLength: Array.isArray(initialViewData) ? initialViewData.length : 'NOT_ARRAY',
            finalDataLength: Array.isArray(data) ? data.length : 'NOT_ARRAY'
          });
        }
        break;
      }
      case 'posts': {
        const query = postsQuery;
        const initialViewData = initialData.posts || [];
        
        if (query.data?.items && Array.isArray(query.data.items)) {
          data = query.data.items;
        } else if (initialViewData && Array.isArray(initialViewData) && initialViewData.length > 0) {
          data = initialViewData;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[${activeView}] getActiveData:`, {
            queryState: {
              isLoading: query.isLoading,
              isError: query.isError,
              hasData: !!query.data,
              dataItems: query.data?.items?.length || 0,
            },
            initialViewDataLength: Array.isArray(initialViewData) ? initialViewData.length : 'NOT_ARRAY',
            finalDataLength: Array.isArray(data) ? data.length : 'NOT_ARRAY'
          });
        }
        break;
      }
      default:
        return [];
    }
    
    return data;
  };

  const allItems = getActiveData();


  // Client-side data processing: filtering, sorting, and pagination
  const processedItems = useMemo(() => {
    
    // Ensure allItems is always an array to prevent iteration errors
    if (!Array.isArray(allItems)) {
      console.warn(`[${activeView}] allItems is not an array:`, { allItems, type: typeof allItems });
      return [];
    }
    
    let items = [...allItems];

    // Apply search filter
    const searchQuery = currentSearchParams.get('search');
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        // Search across multiple fields based on content type with proper type checking
        const searchableText = [
          item.title,
          'content' in item ? item.content : undefined,
          'rawContent' in item ? item.rawContent : undefined,
          'cleanedContent' in item ? item.cleanedContent : undefined,
          // keyPoints property doesn't exist in any of our view types
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
      // Use type assertion with proper fallback for sorting
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
    const result = processedItems.slice(start, end);
    
    // Debug logging only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${activeView}] Pagination:`, {
        processedItemsLength: processedItems.length,
        currentPage,
        pageSize,
        start,
        end,
        resultLength: result.length,
      });
    }
    
    return result;
  }, [processedItems, currentPage, pageSize, activeView]);

  const clientPagination = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    total: processedItems.length,
    totalPages: Math.ceil(processedItems.length / pageSize),
  }), [processedItems.length, currentPage, pageSize]);

  // Log performance metrics in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${activeView}] Client-side processing:`, {
      totalFetched: Array.isArray(allItems) ? allItems.length : 0,
      afterFiltering: processedItems.length,
      currentPage: currentPage,
      showingItems: paginatedItems.length,
    });
  }
  
  // Use content actions hook with workflow job tracking
  const { handleAction, handleBulkAction, activeJobs, removeActiveJob, isConnected } = useContentActions(activeView);
  
  // Fetch dashboard counts for accurate totals across all views
  const dashboardCountsQuery = useDashboardCountsQuery();
  
  
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
        // Get current items dynamically when modal is opened
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
  
  // Get the current page items (filtered and paginated)
  const currentItems = paginatedItems as any[];
  
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
          </div>
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
            pagination={clientPagination}
            onPageChange={handlePageChange}
            activeJobs={activeJobs}
          />
        </TabsContent>
      </Tabs>
      
      {/* Modals are now handled by the global ModalManager in AppLayout */}
    </div>
  );
}