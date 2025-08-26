'use client';

import { useState, useMemo } from 'react';
import type { InsightView, GeneratePostsResponse } from '@/types';
import InsightModal from './components/InsightModal';
import { InsightsActionBar } from './components/InsightsActionBar';
import { InsightsFilters } from './components/InsightsFilters';
import { InsightsStatusTabs } from './components/InsightsStatusTabs';
import { InsightsList } from './components/InsightsList';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/lib/toast';
import { useInsights, useUpdateInsight, useBulkUpdateInsights } from './hooks/useInsightQueries';
import { apiClient } from '@/lib/api-client';

interface InsightsClientProps {
  initialFilter?: string;
}

export default function InsightsClient({ initialFilter = 'all' }: InsightsClientProps) {
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

  // TanStack Query hooks - fetch ALL insights once
  const { data: allInsights = [], isLoading, error } = useInsights({});
  const updateInsightMutation = useUpdateInsight();
  const bulkUpdateMutation = useBulkUpdateInsights();

  // Get unique categories from all insights
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(allInsights.map(i => i.category))).sort();
    return [{ value: 'all', label: 'All Categories' }].concat(
      uniqueCategories.map(cat => ({ value: cat, label: cat }))
    );
  }, [allInsights]);

  // Client-side filtering (no API calls, no loading states)
  const filteredInsights = useMemo(() => {
    let filtered = [...allInsights];

    // Filter by status
    if (activeStatusFilter !== 'all') {
      filtered = filtered.filter(insight => insight.status === activeStatusFilter);
    }

    // Filter by post type
    if (postTypeFilter !== 'all') {
      filtered = filtered.filter(insight => insight.postType === postTypeFilter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(insight => insight.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(insight =>
        insight.title.toLowerCase().includes(query) ||
        insight.summary.toLowerCase().includes(query) ||
        insight.verbatimQuote?.toLowerCase().includes(query) ||
        insight.transcriptTitle?.toLowerCase().includes(query)
      );
    }

    // Filter by score range
    if (scoreRange[0] > 0 || scoreRange[1] < 20) {
      filtered = filtered.filter(insight => {
        const score = insight.scores.total;
        return score >= scoreRange[0] && score <= scoreRange[1];
      });
    }

    // Sort insights
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      // Handle nested score sorting
      if (sortBy === 'totalScore') {
        aVal = a.scores.total;
        bVal = b.scores.total;
      } else if (sortBy.startsWith('score.')) {
        const scoreType = sortBy.replace('score.', '') as keyof typeof a.scores;
        aVal = a.scores[scoreType];
        bVal = b.scores[scoreType];
      } else {
        aVal = a[sortBy as keyof InsightView];
        bVal = b[sortBy as keyof InsightView];
      }

      // Handle date sorting
      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Compare values
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [allInsights, activeStatusFilter, postTypeFilter, categoryFilter, searchQuery, scoreRange, sortBy, sortOrder]);

  // Handler function for generating posts from insights
  const handleGeneratePosts = async (insight: InsightView) => {
    try {
      const response = await apiClient.post(`/api/insights/${insight.id}/generate-posts`, {});
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate posts');
      }

      const data = response.data as GeneratePostsResponse;
      toast.generated('post', data?.count || 1);
      
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
      <div className="container mx-auto py-8 px-4 max-w-7xl">
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
      <div className="container mx-auto py-8 px-4 max-w-7xl">
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
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <PageHeader
        title="Insights"
        description="Review and manage AI-generated insights from your transcripts"
      />

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
        insights={allInsights}
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