"use client";

import { useState, useMemo, useCallback } from "react";
import { InsightsActionBar } from "@/components/ItemActionBar/InsightsActionBar";
import { InsightsStatusTabs } from "@/components/StatusTabs/InsightsStatusTabs";
import { InsightsFilters } from "@/app/insights/components/InsightsFilters";
import { Lightbulb } from "lucide-react";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import type { InsightView, GeneratePostsResponse } from "@/types";
import { InsightsDataTable } from "./InsightsDataTable";
import InsightModal from "@/app/insights/components/InsightModal";
import { 
  useUpdateInsight, 
  useBulkUpdateInsights 
} from "@/app/insights/hooks/useInsightQueries";
import { SmartSelection } from "@/components/SmartSelection";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";

interface InsightsViewProps {
  insights: InsightView[];
  isLoading: boolean;
}

export default function InsightsView({ insights, isLoading }: InsightsViewProps) {
  const toast = useToast();
  const { confirm, confirmationProps } = useConfirmation();
  
  // Mutations
  const updateInsightMutation = useUpdateInsight();
  const bulkUpdateMutation = useBulkUpdateInsights();
  
  // Local UI state
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [postTypeFilter, setPostTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [scoreRange, setScoreRange] = useState([0, 20]);
  const [sortBy, setSortBy] = useState("totalScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<InsightView | null>(null);
  const [showModal, setShowModal] = useState(false);

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
    if (activeStatusFilter !== "all") {
      filtered = filtered.filter(
        (insight) => insight.status === activeStatusFilter
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
    activeStatusFilter,
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
        setSelectedInsight(insight);
        setShowModal(true);
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
  }, [updateInsightMutation, toast, confirm]);

  // Handle bulk actions
  const handleBulkAction = useCallback((action: string) => {
    if (selectedInsights.length === 0) return;

    bulkUpdateMutation.mutate(
      {
        action,
        insightIds: selectedInsights,
      },
      {
        onSuccess: () => {
          setSelectedInsights([]);
          toast.success(`Successfully ${action}ed ${selectedInsights.length} insights`);
        },
        onError: () => {
          toast.error(`Failed to ${action} insights`);
        }
      }
    );
  }, [selectedInsights, bulkUpdateMutation, toast]);

  // Selection handlers
  const handleSelect = useCallback((id: string, selected: boolean) => {
    if (selected) {
      setSelectedInsights((prev) => [...prev, id]);
    } else {
      setSelectedInsights((prev) =>
        prev.filter((selectedId) => selectedId !== id)
      );
    }
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedInsights(insights.map((i) => i.id));
    } else {
      setSelectedInsights([]);
    }
  }, [insights]);

  // Smart selection handlers
  const handleSelectFiltered = () => {
    setSelectedInsights(filteredInsights.map((i) => i.id));
  };

  const handleSelectByStatus = (status: string) => {
    const statusInsights = insights.filter((i) => i.status === status);
    setSelectedInsights(statusInsights.map((i) => i.id));
  };

  const handleSelectByCategory = (category: string) => {
    const categoryInsights = insights.filter((i) => i.category === category);
    setSelectedInsights(categoryInsights.map((i) => i.id));
  };

  const handleInvertSelection = () => {
    const currentSelected = new Set(selectedInsights);
    const inverted = insights
      .filter((i) => !currentSelected.has(i.id))
      .map((i) => i.id);
    setSelectedInsights(inverted);
  };

  const handleSelectDateRange = (start: Date, end: Date) => {
    const rangeInsights = insights.filter((i) => {
      const date = new Date(i.createdAt);
      return date >= start && date <= end;
    });
    setSelectedInsights(rangeInsights.map((i) => i.id));
  };

  // Handle sort change
  const handleSortChange = (field: string, order: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(order);
  };

  // Handle modal save
  const handleModalSave = async (updatedData: Partial<InsightView>) => {
    if (!selectedInsight) return;

    updateInsightMutation.mutate(
      {
        id: selectedInsight.id,
        ...updatedData,
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setSelectedInsight(null);
          toast.success("Insight updated");
        },
      }
    );
  };

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
      {/* Action Bar */}
      <InsightsActionBar
        selectedInsights={selectedInsights}
        searchQuery={searchQuery}
        showFilters={showFilters}
        onBulkAction={handleBulkAction}
        onSearchChange={setSearchQuery}
        onToggleFilters={() => setShowFilters(!showFilters)}
      >
        <SmartSelection
          totalItems={insights.length}
          selectedCount={selectedInsights.length}
          filteredCount={filteredInsights.length}
          onSelectAll={handleSelectAll}
          onSelectFiltered={handleSelectFiltered}
          onSelectByStatus={handleSelectByStatus}
          onSelectByPlatform={handleSelectByCategory}
          onInvertSelection={handleInvertSelection}
          onSelectDateRange={handleSelectDateRange}
          statuses={["needs_review", "approved", "rejected"]}
          platforms={categories.map(c => c.value).filter(v => v !== "all")}
          platformLabel="category"
        />
      </InsightsActionBar>

      {/* Advanced Filters */}
      {showFilters && (
        <InsightsFilters
          postTypeFilter={postTypeFilter}
          categoryFilter={categoryFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          scoreRange={scoreRange}
          categories={categories}
          onPostTypeChange={setPostTypeFilter}
          onCategoryChange={setCategoryFilter}
          onSortChange={handleSortChange}
          onScoreRangeChange={setScoreRange}
        />
      )}

      {/* Status Tabs */}
      <InsightsStatusTabs
        activeFilter={activeStatusFilter}
        insights={insights}
        onFilterChange={setActiveStatusFilter}
      />

      {/* Data Table or Empty State */}
      {filteredInsights.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || postTypeFilter !== "all" || categoryFilter !== "all"
              ? "No matching insights found"
              : activeStatusFilter === "needs_review"
              ? "No insights need review"
              : `No ${activeStatusFilter === "all" ? "" : activeStatusFilter} insights found`}
          </h3>
          <p className="text-gray-600">
            {searchQuery || postTypeFilter !== "all" || categoryFilter !== "all"
              ? "Try adjusting your filters or search terms"
              : "Generate insights from your transcripts to get started"}
          </p>
        </div>
      ) : (
        <InsightsDataTable
          insights={filteredInsights}
          selectedInsights={selectedInsights}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onAction={handleAction}
        />
      )}

      {/* Modal */}
      <InsightModal
        insight={selectedInsight}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedInsight(null);
        }}
        onSave={handleModalSave}
      />

      <ConfirmationDialog {...confirmationProps} />
    </div>
  );
}