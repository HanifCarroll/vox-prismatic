'use client';

import { useState, useMemo } from 'react';
import type { InsightView } from '@/types';
import InsightModal from './components/InsightModal';
import { InsightsActionBar } from './components/InsightsActionBar';
import { InsightsFilters } from './components/InsightsFilters';
import { InsightsStatusTabs } from './components/InsightsStatusTabs';
import { InsightsList } from './components/InsightsList';
import { useToast } from '@/lib/toast';
import { useInsights, useUpdateInsight, useBulkUpdateInsights } from './hooks/useInsightQueries';
import { apiClient } from '@/lib/api-client';

interface InsightsClientProps {
  initialFilter?: string;
}

export default function InsightsClient({ initialFilter = 'needs_review' }: InsightsClientProps) {
  const toast = useToast();
  
  // Local UI state
  const [activeStatusFilter, setActiveStatusFilter] = useState(initialFilter);
  const [postTypeFilter, setPostTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [scoreRange, setScoreRange] = useState([0, 20]);
  const [sortBy, setSortBy] = useState('totalScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<InsightView | null>(null);
  const [showModal, setShowModal] = useState(false);

  // TanStack Query hooks
  const { data: insights = [], isLoading, error } = useInsights({
    status: activeStatusFilter !== 'all' ? activeStatusFilter : undefined,
    postType: postTypeFilter !== 'all' ? postTypeFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    search: searchQuery || undefined,
    sortBy,
    sortOrder,
  });
  const updateInsightMutation = useUpdateInsight();
  const bulkUpdateMutation = useBulkUpdateInsights();

  // Get unique categories from insights
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(insights.map(i => i.category))).sort();
    return [{ value: 'all', label: 'All Categories' }].concat(
      uniqueCategories.map(cat => ({ value: cat, label: cat }))
    );
  }, [insights]);

  // TanStack Query handles filtering and sorting, so we can use insights directly
  const filteredInsights = insights;

  // Handler function for generating posts from insights
  const handleGeneratePosts = async (insight: InsightView) => {
    try {
      const response = await apiClient.post(`/api/insights/${insight.id}/generate-posts`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate posts');
      }

      toast.generated('post', response.data?.count || 1);
      
      // Optionally update the insight status or take other actions
      // The success is handled by TanStack Query refetch
      
    } catch (error) {
      console.error('Failed to generate posts:', error);
      toast.apiError('generate posts', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  // Handle individual insight actions
  const handleAction = async (action: string, insight: InsightView) => {
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
        setSelectedInsight(insight);
        setShowModal(true);
      } else if (action === 'generate_posts') {
        await handleGeneratePosts(insight);
      } else {
        // Handle other potential future actions
        console.log('Unhandled action:', action);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedInsights.length === 0) return;
    
    bulkUpdateMutation.mutate({
      action,
      insightIds: selectedInsights
    }, {
      onSuccess: () => {
        setSelectedInsights([]);
      }
    });
  };

  // Handle selection
  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedInsights(prev => [...prev, id]);
    } else {
      setSelectedInsights(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedInsights(filteredInsights.map(i => i.id));
    } else {
      setSelectedInsights([]);
    }
  };

  // Handle sort change
  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setPostTypeFilter('all');
    setCategoryFilter('all');
    setScoreRange([0, 10]);
  };

  // Handle modal save
  const handleModalSave = async (updatedData: Partial<InsightView>) => {
    if (!selectedInsight) return;

    updateInsightMutation.mutate({
      id: selectedInsight.id,
      ...updatedData
    }, {
      onSuccess: () => {
        setShowModal(false);
        setSelectedInsight(null);
      }
    });
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  // Handle error state  
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Failed to load insights: {error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Insights</h1>
        <p className="mt-2 text-gray-600">
          Review and manage AI-generated insights from your transcripts
        </p>
      </div>

      {/* Action Bar */}
      <InsightsActionBar
        selectedInsights={selectedInsights}
        searchQuery={searchQuery}
        showFilters={showFilters}
        onBulkAction={handleBulkAction}
        onSearchChange={setSearchQuery}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

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

      {/* Insights List */}
      <InsightsList
        insights={filteredInsights}
        selectedInsights={selectedInsights}
        searchQuery={searchQuery}
        postTypeFilter={postTypeFilter}
        categoryFilter={categoryFilter}
        activeStatusFilter={activeStatusFilter}
        onAction={handleAction}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        onClearFilters={handleClearFilters}
      />

      {/* Insight Modal */}
      <InsightModal
        insight={selectedInsight}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedInsight(null);
        }}
        onSave={handleModalSave}
      />
    </div>
  );
}