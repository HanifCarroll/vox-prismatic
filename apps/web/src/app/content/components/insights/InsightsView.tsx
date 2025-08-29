"use client";

import { useMemo, useCallback, useEffect } from "react";
import { Lightbulb } from "lucide-react";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import type { InsightView, GeneratePostsResponse } from "@/types";
import { InsightsDataTable } from "./InsightsDataTable";
import InsightModal from "../modals/InsightModal";
import { 
  useUpdateInsightAction, 
  useBulkUpdateInsightsAction 
} from "../../hooks/use-server-actions";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ResponsiveContentView } from "../ResponsiveContentView";
import { useHybridDataStrategy } from "../../hooks/useHybridDataStrategy";
import { usePagination } from "../../hooks/usePagination";
import { MobilePagination } from "../mobile/MobilePagination";
import { usePerformanceMonitor } from "@/lib/performance-monitor";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface InsightsViewProps {
  insights: InsightView[];
  isLoading: boolean;
  searchQuery: string;
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  statusFilter: string;
  postTypeFilter: string;
  categoryFilter: string;
  scoreRange: [number, number];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onStatusFilterChange: (filter: string) => void;
  onPostTypeFilterChange: (filter: string) => void;
  onCategoryFilterChange: (filter: string) => void;
  onScoreRangeChange: (range: [number, number]) => void;
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  onShowInsightModal: (insight: InsightView) => void;
  totalCount?: number;  // Total items from server
  useServerFiltering?: boolean;  // Override for hybrid strategy
  globalCounts?: {
    total: number;
    needs_review: number;
    approved: number;
    rejected: number;
    archived: number;
  };
}

export default function InsightsView({ 
  insights, 
  isLoading,
  searchQuery,
  selectedItems,
  onSelectionChange,
  statusFilter,
  postTypeFilter,
  categoryFilter,
  scoreRange,
  sortBy,
  sortOrder,
  onStatusFilterChange,
  onPostTypeFilterChange,
  onCategoryFilterChange,
  onScoreRangeChange,
  onSortChange,
  onShowInsightModal,
  totalCount = 0,
  useServerFiltering: forceServerFiltering,
  globalCounts
}: InsightsViewProps) {
  const toast = useToast();
  const { confirm, confirmationProps } = useConfirmation();
  const { startMark, endMark, trackDataLoad } = usePerformanceMonitor();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  // Determine data loading strategy
  const { 
    strategy,
    shouldPaginate,
    shouldUseServerFilters,
    pageSize,
  } = useHybridDataStrategy({
    totalItems: totalCount || insights.length,
    isMobile,
    isTablet,
    forceStrategy: forceServerFiltering ? 'server' : undefined,
  });
  
  // Pagination state (only for server-side filtering)
  const pagination = usePagination({
    totalItems: totalCount || insights.length,
    initialPageSize: pageSize,
  });
  
  // Server Actions
  const updateInsightAction = useUpdateInsightAction();
  const bulkUpdateAction = useBulkUpdateInsightsAction();
  
  // No local UI state needed - all managed by ContentClient

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(insights.map((i) => i.category))
    ).sort();
    return [{ value: "all", label: "All Categories" }].concat(
      uniqueCategories.map((cat) => ({ value: cat, label: cat }))
    );
  }, [insights]);

  // Track data loading performance
  useEffect(() => {
    if (!isLoading && insights.length > 0) {
      trackDataLoad({
        strategy,
        itemCount: insights.length,
        filteredCount: insights.length,
        pageSize,
        duration: 0, // Will be tracked by query hooks
      });
    }
  }, [insights.length, strategy, pageSize, isLoading, trackDataLoad]);

  // Client-side filtering - only used when not using server filtering
  const filteredInsights = useMemo(() => {
    startMark('client-filter');
    
    // If using server-side filtering, insights are already filtered
    if (shouldUseServerFilters) {
      endMark('client-filter', { strategy: 'server', skipped: true });
      return insights;
    }
    let filtered = [...insights];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (insight) => insight.status === statusFilter
      );
    }

    // Filter by post type
    if (postTypeFilter !== "all") {
      filtered = filtered.filter(
        (insight) => insight.postType === postTypeFilter
      );
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (insight) => insight.category === categoryFilter
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (insight) =>
          insight.title.toLowerCase().includes(query) ||
          insight.summary.toLowerCase().includes(query) ||
          insight.verbatimQuote?.toLowerCase().includes(query) ||
          insight.transcriptTitle?.toLowerCase().includes(query)
      );
    }

    // Filter by score range
    if (scoreRange[0] > 0 || scoreRange[1] < 20) {
      filtered = filtered.filter((insight) => {
        const score = insight.scores.total;
        return score >= scoreRange[0] && score <= scoreRange[1];
      });
    }

    // Sort insights
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortBy === "totalScore") {
        aVal = a.scores.total;
        bVal = b.scores.total;
      } else if (sortBy.startsWith("score.")) {
        const scoreType = sortBy.replace("score.", "") as keyof typeof a.scores;
        aVal = a.scores[scoreType];
        bVal = b.scores[scoreType];
      } else {
        aVal = a[sortBy as keyof InsightView];
        bVal = b[sortBy as keyof InsightView];
      }

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
      itemsIn: insights.length,
      itemsOut: filtered.length 
    });
    
    return filtered;
  }, [
    insights,
    statusFilter,
    postTypeFilter,
    categoryFilter,
    shouldUseServerFilters,
    startMark,
    endMark,
    searchQuery,
    scoreRange,
    sortBy,
    sortOrder,
  ]);

  // Handler for generating posts from insights
  const handleGeneratePosts = async (insight: InsightView) => {
    try {
      const response = await apiClient.post(
        `/api/insights/${insight.id}/generate-posts`,
        {}
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to generate posts");
      }

      const data = response.data as GeneratePostsResponse;
      toast.success(`Generated ${data?.count || 1} posts`);
    } catch (error) {
      console.error("Failed to generate posts:", error);
      toast.error("Failed to generate posts");
    }
  };

  // Handle individual insight actions
  const handleAction = useCallback(async (action: string, insight: InsightView) => {
    try {
      if (action === "view" || action === "edit") {
        onShowInsightModal(insight);
      } else if (action === "approve") {
        await updateInsightAction(insight.id, {
          status: "approved",
        });
      } else if (action === "reject") {
        const confirmed = await confirm({
          title: "Reject Insight",
          description: "This insight will be marked as rejected. You can review it again later.",
          confirmText: "Reject",
          variant: "destructive",
        });

        if (confirmed) {
          await updateInsightAction(insight.id, {
            status: "rejected",
          });
        }
      } else if (action === "review") {
        await updateInsightAction(insight.id, {
          status: "needs_review",
        });
      } else if (action === "generate_posts") {
        await handleGeneratePosts(insight);
      }
    } catch (error) {
      console.error(`Failed to ${action} insight:`, error);
      toast.error(`Failed to ${action} insight`);
    }
  }, [updateInsightAction, toast, confirm, onShowInsightModal]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedItems.length === 0) return;

    try {
      await bulkUpdateAction({
        action,
        insightIds: selectedItems,
      });
      onSelectionChange([]);
      toast.success(`Successfully ${action}ed ${selectedItems.length} insights`);
    } catch (error) {
      toast.error(`Failed to ${action} insights`);
    }
  }, [selectedItems, bulkUpdateAction, toast, onSelectionChange]);

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
      onSelectionChange(insights.map(i => i.id));
    } else {
      onSelectionChange([]);
    }
  }, [insights, onSelectionChange]);

  // Handle sort change - delegated to parent
  const handleSortChange = (field: string, order: "asc" | "desc") => {
    onSortChange(field, order);
  };

  // Export bulk action handler for parent
  const exportedBulkActionHandler = useCallback((action: string) => {
    handleBulkAction(action);
  }, [handleBulkAction]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Lightbulb className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading insights...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Table or Empty State */}
      {filteredInsights.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || postTypeFilter !== "all" || categoryFilter !== "all"
              ? "No matching insights found"
              : statusFilter === "needs_review"
              ? "No insights need review"
              : `No ${statusFilter === "all" ? "" : statusFilter} insights found`}
          </h3>
          <p className="text-gray-600">
            {searchQuery || postTypeFilter !== "all" || categoryFilter !== "all"
              ? "Try adjusting your filters or search terms"
              : "Generate insights from your transcripts to get started"}
          </p>
        </div>
      ) : (
        <ResponsiveContentView
          type="insight"
          items={filteredInsights}
          selectedIds={selectedItems}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onAction={handleAction}
          isLoading={isLoading}
          emptyMessage="No insights found"
          renderTable={() => (
            <InsightsDataTable
              insights={filteredInsights}
              selectedInsights={selectedItems}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onAction={handleAction}
            />
          )}
          useVirtualScrolling={filteredInsights.length > 20 && !shouldPaginate}
        />
      )}
      
      {/* Pagination controls for server-side filtering */}
      {shouldPaginate && !isLoading && filteredInsights.length > 0 && (
        <MobilePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={totalCount || filteredInsights.length}
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