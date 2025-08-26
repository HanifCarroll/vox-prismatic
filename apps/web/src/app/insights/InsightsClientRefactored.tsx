'use client';

import { useCallback } from 'react';
import type { InsightView, GeneratePostsResponse } from '@/types';
import InsightModal from './components/InsightModal';
import { InsightsActionBar } from '@/components/ItemActionBar/InsightsActionBar';
import { InsightsFilters } from './components/InsightsFilters';
import { InsightsStatusTabs } from '@/components/StatusTabs/InsightsStatusTabs';
import { InsightsList } from './components/InsightsList';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/lib/toast';
import { useInsights, useUpdateInsight, useBulkUpdateInsights } from './hooks/useInsightQueries';
import { apiClient } from '@/lib/api-client';

// Import our new hooks
import { useClientFiltering } from '@/hooks/useClientFiltering';
import { useSelection } from '@/hooks/useSelection';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useModalState } from '@/hooks/useModalState';

interface InsightsClientProps {
  initialFilter?: string;
}

export default function InsightsClientRefactored({ initialFilter = 'all' }: InsightsClientProps) {
  const toast = useToast();
  
  // TanStack Query hooks - fetch ALL insights once
  const { data: allInsights = [], isLoading, error } = useInsights({});
  const updateInsightMutation = useUpdateInsight();
  const bulkUpdateMutation = useBulkUpdateInsights();

  // Client-side filtering with our new hook
  const {
    filteredItems: filteredInsights,
    filters,
    actions: filterActions,
    itemCount
  } = useClientFiltering(allInsights, initialFilter, {
    searchFields: ['title', 'summary', 'verbatimQuote', 'transcriptTitle'],
    statusField: 'status',
    customFilters: {
      // Handle score range filtering
      scoreRange: (insight: InsightView, scoreRange: [number, number]) => {
        if (scoreRange[0] > 0 || scoreRange[1] < 20) {
          const score = insight.scores.total;
          return score >= scoreRange[0] && score <= scoreRange[1];
        }
        return true;
      },
      // Handle post type filtering
      postType: (insight: InsightView, postType: string) => {
        return postType === 'all' || insight.postType === postType;
      },
      // Handle category filtering
      category: (insight: InsightView, category: string) => {
        return category === 'all' || insight.category === category;
      }
    },
    customSort: {
      // Handle nested score sorting
      totalScore: (insight: InsightView) => insight.scores.total,
      'score.total': (insight: InsightView) => insight.scores.total,
      'score.relevance': (insight: InsightView) => insight.scores.relevance,
      'score.engagement': (insight: InsightView) => insight.scores.engagement,
      'score.actionability': (insight: InsightView) => insight.scores.actionability,
    }
  });

  // Selection management with our new hook
  const { state: selectionState, actions: selectionActions } = useSelection();

  // Bulk actions with our new hook
  const bulkActions = useBulkActions(bulkUpdateMutation, {
    clearSelection: selectionActions.clear,
  });

  // Modal state management with our new hook
  const editModal = useModalState<InsightView>(updateInsightMutation, {
    successMessage: 'Insight updated successfully',
    errorContext: 'update insight',
  });

  // Get unique categories from all insights for filters
  const categories = useCallback(() => {
    const uniqueCategories = Array.from(new Set(allInsights.map(i => i.category))).sort();
    return [{ value: 'all', label: 'All Categories' }].concat(
      uniqueCategories.map(cat => ({ value: cat, label: cat }))
    );
  }, [allInsights])();

  // Custom filter handlers
  const handlePostTypeFilterChange = useCallback((postType: string) => {
    filterActions.setAdditionalFilter('postType', postType);
  }, [filterActions]);

  const handleCategoryFilterChange = useCallback((category: string) => {
    filterActions.setAdditionalFilter('category', category);
  }, [filterActions]);

  const handleScoreRangeChange = useCallback((scoreRange: [number, number]) => {
    filterActions.setAdditionalFilter('scoreRange', scoreRange);
  }, [filterActions]);

  // Generate posts handler - specialized for insights
  const handleGeneratePosts = useCallback(async (insight: InsightView) => {
    try {
      const response = await apiClient.post(`/api/insights/${insight.id}/generate-posts`, {});
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate posts');
      }

      const data = response.data as GeneratePostsResponse;
      toast.generated('post', data?.count || 1);
    } catch (error) {
      console.error('Failed to generate posts:', error);
      toast.apiError('generate posts', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }, [toast]);

  // Individual insight actions - much cleaner now
  const handleAction = useCallback(async (action: string, insight: InsightView) => {
    try {
      if (action === 'approve' || action === 'reject') {
        updateInsightMutation.mutate({
          id: insight.id,
          status: action === 'approve' ? 'approved' : 'rejected'
        });
      } else if (action === 'review') {
        updateInsightMutation.mutate({
          id: insight.id,
          status: 'needs_review'
        });
      } else if (action === 'edit') {
        editModal.actions.open(insight);
      } else if (action === 'generate_posts') {
        await handleGeneratePosts(insight);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  }, [updateInsightMutation, editModal.actions, handleGeneratePosts]);

  // Loading state - much cleaner
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  // Error state - much cleaner
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Failed to load insights: {error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Get current filter values from additional filters
  const postTypeFilter = filters.postType || 'all';
  const categoryFilter = filters.category || 'all';
  const scoreRange = filters.scoreRange || [0, 20];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Page Header */}
      <PageHeader
        title="Insights"
        subtitle={`${itemCount.filtered} of ${itemCount.total} insights`}
      />

      {/* Action Bar */}
      <InsightsActionBar
        selectedInsights={selectionState.selectedItems}
        searchQuery={filters.searchQuery}
        showFilters={filters.showFilters}
        onBulkAction={bulkActions.handleBulkAction}
        onSearchChange={filterActions.setSearchQuery}
        onToggleFilters={() => filterActions.setAdditionalFilter('showFilters', !filters.showFilters)}
      />

      {/* Filters */}
      {filters.showFilters && (
        <InsightsFilters
          postTypeFilter={postTypeFilter}
          categoryFilter={categoryFilter}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          scoreRange={scoreRange}
          categories={categories}
          onPostTypeChange={handlePostTypeFilterChange}
          onCategoryChange={handleCategoryFilterChange}
          onSortChange={filterActions.setSort}
          onScoreRangeChange={handleScoreRangeChange}
        />
      )}

      {/* Status Tabs */}
      <InsightsStatusTabs
        activeFilter={filters.activeStatusFilter}
        insights={allInsights}
        onFilterChange={filterActions.setActiveStatusFilter}
      />

      {/* Insights List */}
      <InsightsList
        insights={filteredInsights}
        selectedInsights={selectionState.selectedItems}
        searchQuery={filters.searchQuery}
        postTypeFilter={postTypeFilter}
        categoryFilter={categoryFilter}
        activeStatusFilter={filters.activeStatusFilter}
        onAction={handleAction}
        onSelect={selectionActions.toggle}
        onSelectAll={selectionActions.selectAll}
        onClearFilters={filterActions.clearFilters}
      />

      {/* Edit Modal */}
      <InsightModal
        insight={editModal.state.selectedItem}
        isOpen={editModal.state.isOpen}
        onClose={editModal.actions.close}
        onSave={editModal.actions.handleSubmit}
      />
    </div>
  );
}