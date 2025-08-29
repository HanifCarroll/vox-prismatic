"use client";

import { useState, useCallback, useTransition, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Lightbulb, Edit3, Plus, Filter, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/lib/toast";

// Import components
import ContentTable from "./components/ContentTable";
import ContentFilters from "./components/ContentFilters";
import { UnifiedActionBar } from "./components/UnifiedActionBar";
import { useContentActions } from "./hooks/useContentActions";
import { VIEW_CONFIGS } from "./components/views/config";

// Import modals
import TranscriptInputModal from "./components/modals/TranscriptInputModal";
import TranscriptModal from "./components/modals/TranscriptModal.refactored";
import InsightModal from "./components/modals/InsightModal.refactored";
import PostModal from "./components/modals/PostModal.refactored";
import { SchedulePostModal } from "./components/modals/SchedulePostModal.refactored";
import { BulkScheduleModal } from "@/components/BulkScheduleModal";

import type { TranscriptView, InsightView, PostView } from "@/types";
import type { ContentView } from "./components/views/config";

interface ContentClientProps {
  view: string;
  data: {
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
  searchParams: Record<string, string | undefined>;
}

export default function ContentClient({ 
  view: initialView, 
  data, 
  searchParams 
}: ContentClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  
  // Local state for ephemeral UI (not in URL)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Get current view from props
  const activeView = initialView as ContentView;
  const viewConfig = VIEW_CONFIGS[activeView];
  
  // Use content actions hook
  const { handleAction, handleBulkAction } = useContentActions(activeView);
  
  // Helper to update URL params
  const updateURL = useCallback((updates: Record<string, string | null>) => {
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
    
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }, [currentSearchParams, pathname, router]);
  
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
  
  // Handle search
  const handleSearch = useCallback((query: string) => {
    updateURL({ 
      search: query || null,
      page: '1' // Reset to first page on search
    });
  }, [updateURL]);
  
  // Handle filter changes
  const handleFilterChange = useCallback((filterKey: string, value: string | null) => {
    updateURL({ 
      [filterKey]: value,
      page: '1' // Reset to first page on filter change
    });
  }, [updateURL]);
  
  // Handle sort changes
  const handleSortChange = useCallback((sortField: string, sortOrder: string) => {
    updateURL({ 
      sort: sortField,
      order: sortOrder 
    });
  }, [updateURL]);
  
  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    updateURL({ page: page.toString() });
  }, [updateURL]);
  
  // Handle modal operations
  const openModal = useCallback((modalType: string, id?: string) => {
    updateURL({ 
      modal: modalType,
      id: id || null 
    });
  }, [updateURL]);
  
  const closeModal = useCallback(() => {
    updateURL({ 
      modal: null,
      id: null 
    });
  }, [updateURL]);
  
  // Handle item click
  const handleItemClick = useCallback((id: string) => {
    openModal(`view-${activeView.slice(0, -1)}`, id); // view-transcript, view-insight, view-post
  }, [activeView, openModal]);
  
  // Handle actions with special cases
  const handleContentAction = useCallback(async (action: string, item: any) => {
    // Special handling for schedule action (opens modal)
    if (action === 'schedule' && activeView === 'posts') {
      openModal('schedule-post', item.id);
      return;
    }
    
    // All other actions use the generic handler
    await handleAction(action, item);
  }, [activeView, handleAction, openModal]);
  
  // Handle bulk actions with special cases
  const handleContentBulkAction = useCallback(async (action: string, itemIds: string[]) => {
    // Special handling for bulk schedule (opens modal)
    if (action === 'bulkSchedule' && activeView === 'posts') {
      openModal('bulk-schedule');
      return;
    }
    
    // Confirm bulk deletes
    if (action === 'bulkDelete') {
      const itemType = activeView.slice(0, -1); // Remove 's' from end
      const message = `Are you sure you want to delete ${itemIds.length} ${itemType}${itemIds.length > 1 ? 's' : ''}?`;
      if (!confirm(message)) return;
    }
    
    await handleBulkAction(action, itemIds);
    setSelectedItems([]); // Clear selection after bulk action
  }, [activeView, handleBulkAction, openModal]);
  
  // Get current data based on view
  const currentData = useMemo(() => {
    switch (activeView) {
      case 'transcripts': return data.transcripts;
      case 'insights': return data.insights;
      case 'posts': return data.posts;
      default: return [];
    }
  }, [activeView, data]);
  
  // Stats for header
  const stats = useMemo(() => ({
    transcripts: {
      total: activeView === 'transcripts' ? data.pagination.total : 0,
      raw: data.transcripts.filter(t => t.status === 'raw').length,
    },
    insights: {
      total: activeView === 'insights' ? data.pagination.total : 0,
      pending: data.insights.filter(i => i.status === 'needs_review').length,
    },
    posts: {
      total: activeView === 'posts' ? data.pagination.total : 0,
      draft: data.posts.filter(p => p.status === 'draft').length,
    },
  }), [activeView, data]);
  
  // Get available bulk actions based on selection
  const availableBulkActions = useMemo(() => {
    if (selectedItems.length === 0) return [];
    
    return viewConfig.bulkActions.filter(action => {
      // Check if action has a condition
      if (!action.condition) return true;
      
      // Check if all selected items meet the condition
      return selectedItems.every(id => {
        const item = currentData.find(d => d.id === id);
        return item && action.condition!(item);
      });
    });
  }, [selectedItems, currentData, viewConfig.bulkActions]);
  
  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="container mx-auto py-6 px-4 max-w-7xl flex-1 flex flex-col min-h-0">
        <PageHeader
          title="Content Pipeline"
          description="Transform your content from raw transcripts to published posts"
        />
        
        {/* Stats badges */}
        <div className="flex gap-4 mb-6">
          <Badge variant="outline" className="px-3 py-1">
            <FileText className="h-3 w-3 mr-1" />
            {stats.transcripts.total} Transcripts
            {stats.transcripts.raw > 0 && ` (${stats.transcripts.raw} raw)`}
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Lightbulb className="h-3 w-3 mr-1" />
            {stats.insights.total} Insights
            {stats.insights.pending > 0 && ` (${stats.insights.pending} pending)`}
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Edit3 className="h-3 w-3 mr-1" />
            {stats.posts.total} Posts
            {stats.posts.draft > 0 && ` (${stats.posts.draft} draft)`}
          </Badge>
        </div>
        
        {/* Main content area */}
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0 ${isPending ? 'opacity-60' : ''}`}>
          <Tabs value={activeView} onValueChange={handleViewChange} className="flex-1 flex flex-col">
            <div className="border-b px-6 pt-4">
              <TabsList className="h-10">
                <TabsTrigger value="transcripts" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Transcripts
                </TabsTrigger>
                <TabsTrigger value="insights" className="gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Insights
                </TabsTrigger>
                <TabsTrigger value="posts" className="gap-2">
                  <Edit3 className="h-4 w-4" />
                  Posts
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Action bar */}
            <UnifiedActionBar
              activeView={activeView}
              searchQuery={searchParams.search || ''}
              onSearchChange={handleSearch}
              selectedCount={selectedItems.length}
              totalCount={data.pagination.total}
              filteredCount={currentData.length}
              onBulkAction={(action) => handleContentBulkAction(action, selectedItems)}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              onCreateNew={() => {
                if (activeView === 'transcripts') {
                  openModal('create-transcript');
                }
              }}
            />
            
            {/* Filters */}
            {showFilters && (
              <ContentFilters
                view={activeView}
                filters={searchParams}
                onFilterChange={handleFilterChange}
                selectedItems={selectedItems}
                onSelectionAction={(action) => {
                  // Handle quick selection actions
                  const items = currentData as any[];
                  let newSelection: string[] = [];
                  
                  switch (action) {
                    case 'selectAll':
                      newSelection = items.map(item => item.id);
                      break;
                    case 'selectNone':
                      newSelection = [];
                      break;
                    case 'selectInvert':
                      newSelection = items
                        .filter(item => !selectedItems.includes(item.id))
                        .map(item => item.id);
                      break;
                    case 'selectPending':
                      newSelection = items
                        .filter(item => item.status === 'needs_review' || item.status === 'raw' || item.status === 'draft')
                        .map(item => item.id);
                      break;
                    case 'selectApproved':
                      newSelection = items
                        .filter(item => item.status === 'approved' || item.status === 'cleaned' || item.status === 'processed')
                        .map(item => item.id);
                      break;
                    case 'selectRaw':
                      newSelection = items
                        .filter(item => item.status === 'raw')
                        .map(item => item.id);
                      break;
                    case 'selectCleaned':
                      newSelection = items
                        .filter(item => item.status === 'cleaned')
                        .map(item => item.id);
                      break;
                    case 'selectDraft':
                      newSelection = items
                        .filter(item => item.status === 'draft')
                        .map(item => item.id);
                      break;
                    case 'selectScheduled':
                      newSelection = items
                        .filter(item => item.status === 'scheduled')
                        .map(item => item.id);
                      break;
                  }
                  
                  setSelectedItems(newSelection);
                }}
                onBulkAction={(action) => handleContentBulkAction(action, selectedItems)}
                availableBulkActions={availableBulkActions}
              />
            )}
            
            {/* Content table - same for all views! */}
            <div className="flex-1 overflow-auto">
              <ContentTable
                view={activeView}
                data={currentData}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                sortBy={searchParams.sort || viewConfig.defaultSort.field}
                sortOrder={searchParams.order || viewConfig.defaultSort.order}
                onSortChange={handleSortChange}
                onItemClick={handleItemClick}
                onAction={handleContentAction}
                onBulkAction={(action) => handleContentBulkAction(action, selectedItems)}
                isPending={isPending}
                pagination={data.pagination}
                onPageChange={handlePageChange}
              />
            </div>
          </Tabs>
        </div>
        
        {/* Modals */}
        {searchParams.modal === 'create-transcript' && (
          <TranscriptInputModal
            isOpen={true}
            onClose={closeModal}
            onSubmit={async (data) => {
              // Handle transcript creation
              closeModal();
              router.refresh();
              toast.success('Transcript created successfully');
            }}
          />
        )}
        
        {searchParams.modal === 'view-transcript' && searchParams.id && (
          <TranscriptModal
            transcriptId={searchParams.id}
            isOpen={true}
            onClose={closeModal}
            onUpdate={() => router.refresh()}
          />
        )}
        
        {searchParams.modal === 'view-insight' && searchParams.id && (
          <InsightModal
            insightId={searchParams.id}
            isOpen={true}
            onClose={closeModal}
            onUpdate={() => router.refresh()}
          />
        )}
        
        {searchParams.modal === 'view-post' && searchParams.id && (
          <PostModal
            postId={searchParams.id}
            isOpen={true}
            onClose={closeModal}
            onUpdate={() => router.refresh()}
          />
        )}
        
        {searchParams.modal === 'schedule-post' && searchParams.id && (
          <SchedulePostModal
            postId={searchParams.id}
            isOpen={true}
            onClose={closeModal}
            onSuccess={() => {
              closeModal();
              router.refresh();
              toast.success('Post scheduled successfully');
            }}
          />
        )}
        
        {searchParams.modal === 'bulk-schedule' && selectedItems.length > 0 && (
          <BulkScheduleModal
            posts={currentData.filter(item => selectedItems.includes(item.id)) as PostView[]}
            isOpen={true}
            onClose={closeModal}
            onSchedule={async () => {
              closeModal();
              setSelectedItems([]);
              router.refresh();
              toast.success('Posts scheduled successfully');
            }}
          />
        )}
      </div>
    </div>
  );
}