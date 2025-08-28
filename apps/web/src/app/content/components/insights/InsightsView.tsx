"use client";

import { useMemo, useCallback } from "react";
import { Lightbulb } from "lucide-react";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import type { InsightView, GeneratePostsResponse } from "@/types";
import { InsightsDataTable } from "./InsightsDataTable";
import InsightModal from "../modals/InsightModal";
import { 
  useUpdateInsight, 
  useBulkUpdateInsights 
} from "../../hooks/useInsightQueries";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ResponsiveContentView } from "../ResponsiveContentView";

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
  globalCounts
}: InsightsViewProps) {
  const toast = useToast();
  const { confirm, confirmationProps } = useConfirmation();
  
  // Mutations
  const updateInsightMutation = useUpdateInsight();
  const bulkUpdateMutation = useBulkUpdateInsights();
  
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

  // Client-side filtering
  const filteredInsights = useMemo(() => {
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

    return filtered;
  }, [
    insights,
    statusFilter,
    postTypeFilter,
    categoryFilter,
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
        updateInsightMutation.mutate({
          id: insight.id,
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
          updateInsightMutation.mutate({
            id: insight.id,
            status: "rejected",
          });
        }
      } else if (action === "review") {
        updateInsightMutation.mutate({
          id: insight.id,
          status: "needs_review",
        });
      } else if (action === "generate_posts") {
        await handleGeneratePosts(insight);
      }
    } catch (error) {
      console.error(`Failed to ${action} insight:`, error);
      toast.error(`Failed to ${action} insight`);
    }
  }, [updateInsightMutation, toast, confirm, onShowInsightModal]);

  // Handle bulk actions
  const handleBulkAction = useCallback((action: string) => {
    if (selectedItems.length === 0) return;

    bulkUpdateMutation.mutate(
      {
        action,
        insightIds: selectedItems,
      },
      {
        onSuccess: () => {
          onSelectionChange([]);
          toast.success(`Successfully ${action}ed ${selectedItems.length} insights`);
        },
        onError: () => {
          toast.error(`Failed to ${action} insights`);
        }
      }
    );
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
          useVirtualScrolling={filteredInsights.length > 20}
        />
      )}

      <ConfirmationDialog {...confirmationProps} />
    </div>
  );
}