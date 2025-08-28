"use client";

import { useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import type { TranscriptView } from "@/types/database";
import { TranscriptsDataTable } from "./TranscriptsDataTable";
import TranscriptInputModal from "../modals/TranscriptInputModal";
import TranscriptModal from "../modals/TranscriptModal";
import { 
  useCreateTranscript, 
  useUpdateTranscript, 
  useBulkUpdateTranscripts 
} from "../../hooks/useTranscriptQueries";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ResponsiveContentView } from "../ResponsiveContentView";
import { useHybridDataStrategy } from "../../hooks/useHybridDataStrategy";
import { usePagination } from "../../hooks/usePagination";
import { MobilePagination } from "../mobile/MobilePagination";
import { usePerformanceMonitor } from "@/lib/performance-monitor";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface TranscriptsViewProps {
  transcripts: TranscriptView[];
  isLoading: boolean;
  searchQuery: string;
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  statusFilter: string;
  sortBy: string;
  onStatusFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  onShowTranscriptInputModal: () => void;
  onShowTranscriptModal: (transcript: TranscriptView, mode: 'view' | 'edit') => void;
  totalCount?: number;  // Total items from server
  useServerFiltering?: boolean;  // Override for hybrid strategy
  globalCounts?: {
    total: number;
    raw: number;
    cleaned: number;
  };
}

export default function TranscriptsView({ 
  transcripts, 
  isLoading, 
  searchQuery,
  selectedItems,
  onSelectionChange,
  statusFilter,
  sortBy,
  onStatusFilterChange,
  onSortChange,
  onShowTranscriptInputModal,
  onShowTranscriptModal,
  totalCount = 0,
  useServerFiltering: forceServerFiltering,
  globalCounts
}: TranscriptsViewProps) {
  const toast = useToast();
  const { confirm, confirmationProps } = useConfirmation();
  const { startMark, endMark, trackDataLoad } = usePerformanceMonitor();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  // Mutations
  const createTranscriptMutation = useCreateTranscript();
  const updateTranscriptMutation = useUpdateTranscript();
  const bulkUpdateMutation = useBulkUpdateTranscripts();
  
  // Determine data loading strategy
  const { 
    strategy,
    shouldPaginate,
    shouldUseServerFilters,
    pageSize,
  } = useHybridDataStrategy({
    totalItems: totalCount || transcripts.length,
    isMobile,
    isTablet,
    forceStrategy: forceServerFiltering ? 'server' : undefined,
  });
  
  // Pagination state (only for server-side filtering)
  const pagination = usePagination({
    totalItems: totalCount || transcripts.length,
    initialPageSize: pageSize,
  });

  // Parse sorting
  const [sortField, sortOrder] = sortBy.split("-") as [string, "asc" | "desc"];

  // Track data loading performance
  useEffect(() => {
    if (!isLoading && transcripts.length > 0) {
      trackDataLoad({
        strategy,
        itemCount: transcripts.length,
        filteredCount: transcripts.length,
        pageSize,
        duration: 0, // Will be tracked by query hooks
      });
    }
  }, [transcripts.length, strategy, pageSize, isLoading, trackDataLoad]);

  // Client-side filtering - only used when not using server filtering
  const filteredTranscripts = useMemo(() => {
    startMark('client-filter');
    
    // If using server-side filtering, transcripts are already filtered
    if (shouldUseServerFilters) {
      endMark('client-filter', { strategy: 'server', skipped: true });
      return transcripts;
    }
    
    let filtered = [...transcripts];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (transcript) =>
          transcript.title.toLowerCase().includes(query) ||
          transcript.rawContent.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "raw":
          filtered = filtered.filter((t) => t.status === "raw");
          break;
        case "cleaned":
          filtered = filtered.filter((t) => t.status === "cleaned");
          break;
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof TranscriptView];
      let bVal: any = b[sortField as keyof TranscriptView];

      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    endMark('client-filter', { 
      strategy: 'client', 
      itemsIn: transcripts.length,
      itemsOut: filtered.length 
    });

    return filtered;
  }, [
    transcripts,
    statusFilter,
    searchQuery,
    sortField,
    sortOrder,
    shouldUseServerFilters,
    startMark,
    endMark,
  ]);

  // Handler for individual actions
  const handleAction = useCallback(async (action: string, transcript: TranscriptView) => {
    try {
      if (action === "view") {
        onShowTranscriptModal(transcript, "view");
      } else if (action === "edit") {
        onShowTranscriptModal(transcript, "edit");
      } else if (action === "clean") {
        const response = await apiClient.post(`/api/transcripts/${transcript.id}/clean`, {});
        if (!response.success) {
          throw new Error(response.error || 'Failed to clean transcript');
        }
        toast.success('Transcript cleaning started');
      } else if (action === "process") {
        const response = await apiClient.post(`/api/transcripts/${transcript.id}/process`, {});
        if (!response.success) {
          throw new Error(response.error || 'Failed to process transcript');
        }
        toast.success('Insight extraction started');
      } else if (action === "delete") {
        const confirmed = await confirm({
          title: "Delete Transcript",
          description: `Are you sure you want to delete "${transcript.title}"? This action cannot be undone.`,
          confirmText: "Delete",
          variant: "destructive",
        });

        if (confirmed) {
          const response = await apiClient.delete(`/api/transcripts/${transcript.id}`);
          if (!response.success) {
            throw new Error(response.error || 'Failed to delete transcript');
          }
          toast.success('Transcript deleted');
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} transcript:`, error);
      toast.error(`Failed to ${action} transcript`);
    }
  }, [updateTranscriptMutation, toast, confirm, onShowTranscriptModal]);

  // Handler for bulk actions
  const handleBulkAction = useCallback((action: string) => {
    if (selectedItems.length === 0) return;
    
    bulkUpdateMutation.mutate({
      action,
      transcriptIds: selectedItems
    }, {
      onSuccess: () => {
        onSelectionChange([]);
        toast.success(`Successfully ${action}ed ${selectedItems.length} transcripts`);
      },
      onError: () => {
        toast.error(`Failed to ${action} transcripts`);
      }
    });
  }, [selectedItems, bulkUpdateMutation, toast, onSelectionChange]);

  // Selection handlers - delegated to parent
  const handleSelect = useCallback((id: string, selected: boolean) => {
    if (selected) {
      onSelectionChange([...selectedItems, id]);
    } else {
      onSelectionChange(selectedItems.filter(selectedId => selectedId !== id));
    }
  }, [selectedItems, onSelectionChange]);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      onSelectionChange(transcripts.map(t => t.id));
    } else {
      onSelectionChange([]);
    }
  }, [transcripts, onSelectionChange]);

  // Export bulk action handler for parent
  const exportedBulkActionHandler = useCallback((action: string) => {
    handleBulkAction(action);
  }, [handleBulkAction]);

  // Expose bulk action handler to parent via callback ref or prop
  // This will be handled by the parent component

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading transcripts...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Table or Empty State */}
      {filteredTranscripts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? "No matching transcripts" : "No transcripts found"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? "Try adjusting your search terms or filters"
              : "Get started by adding your first transcript"}
          </p>
          {!searchQuery && (
            <Button onClick={onShowTranscriptInputModal} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Transcript
            </Button>
          )}
        </div>
      ) : (
        <ResponsiveContentView
          type="transcript"
          items={filteredTranscripts}
          selectedIds={selectedItems}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onAction={handleAction}
          isLoading={isLoading}
          emptyMessage="No transcripts found"
          renderTable={() => (
            <TranscriptsDataTable
              transcripts={filteredTranscripts}
              selectedTranscripts={selectedItems}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onAction={handleAction}
            />
          )}
          useVirtualScrolling={filteredTranscripts.length > 20 && !shouldPaginate}
        />
      )}
      
      {/* Pagination controls for server-side filtering */}
      {shouldPaginate && !isLoading && filteredTranscripts.length > 0 && (
        <MobilePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={totalCount || filteredTranscripts.length}
          pageSize={pagination.pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          hasNextPage={pagination.hasNextPage}
          hasPreviousPage={pagination.hasPreviousPage}
          pageRange={pagination.pageRange}
          onPageChange={(page) => {
            pagination.goToPage(page);
            // Trigger data refetch with new offset
            // This will be handled by ContentClient integration
          }}
          onPageSizeChange={(size) => {
            pagination.setPageSize(size);
            // Trigger data refetch with new page size
          }}
          variant={isMobile ? 'compact' : 'full'}
          showPageSizeSelector={!isMobile}
          loading={isLoading}
        />
      )}

      <ConfirmationDialog {...confirmationProps} />
    </div>
  );
}