'use client';

import { useState, useMemo, useEffect } from 'react';
import InsightCard, { InsightView } from './components/InsightCard';
import InsightModal from './components/InsightModal';

// Filter configuration
const statusFilters = [
  { key: 'all', label: 'All Insights', count: (insights: InsightView[]) => insights.length },
  { key: 'needs_review', label: 'Needs Review', count: (insights: InsightView[]) => insights.filter(i => i.status === 'needs_review').length },
  { key: 'approved', label: 'Approved', count: (insights: InsightView[]) => insights.filter(i => i.status === 'approved').length },
  { key: 'rejected', label: 'Rejected', count: (insights: InsightView[]) => insights.filter(i => i.status === 'rejected').length },
  { key: 'archived', label: 'Archived', count: (insights: InsightView[]) => insights.filter(i => i.status === 'archived').length }
];

const postTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'Problem', label: '⚠️ Problem' },
  { value: 'Proof', label: '📊 Proof' },
  { value: 'Framework', label: '🏗️ Framework' },
  { value: 'Contrarian Take', label: '🎯 Contrarian Take' },
  { value: 'Mental Model', label: '🧠 Mental Model' }
];

interface InsightsClientProps {
  initialInsights: InsightView[];
  initialFilter?: string;
}

export default function InsightsClient({ initialInsights, initialFilter = 'needs_review' }: InsightsClientProps) {
  const [insights, setInsights] = useState<InsightView[]>(initialInsights);
  const [activeStatusFilter, setActiveStatusFilter] = useState(initialFilter);
  const [postTypeFilter, setPostTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [scoreRange, setScoreRange] = useState([0, 10]);
  const [sortBy, setSortBy] = useState('totalScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<InsightView | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Get unique categories from insights
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(insights.map(i => i.category))).sort();
    return [{ value: 'all', label: 'All Categories' }].concat(
      uniqueCategories.map(cat => ({ value: cat, label: cat }))
    );
  }, [insights]);

  // Filter and sort insights
  const filteredInsights = useMemo(() => {
    let filtered = insights;

    // Apply status filter
    if (activeStatusFilter !== 'all') {
      filtered = filtered.filter(insight => insight.status === activeStatusFilter);
    }

    // Apply post type filter
    if (postTypeFilter !== 'all') {
      filtered = filtered.filter(insight => insight.postType === postTypeFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(insight => insight.category === categoryFilter);
    }

    // Apply score range filter
    filtered = filtered.filter(insight => 
      insight.scores.total >= scoreRange[0] && insight.scores.total <= scoreRange[1]
    );

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(insight =>
        insight.title.toLowerCase().includes(query) ||
        insight.summary.toLowerCase().includes(query) ||
        insight.verbatimQuote.toLowerCase().includes(query) ||
        insight.category.toLowerCase().includes(query) ||
        insight.transcriptTitle?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'urgencyScore':
          aValue = a.scores.urgency;
          bValue = b.scores.urgency;
          break;
        case 'relatabilityScore':
          aValue = a.scores.relatability;
          bValue = b.scores.relatability;
          break;
        case 'specificityScore':
          aValue = a.scores.specificity;
          bValue = b.scores.specificity;
          break;
        case 'authorityScore':
          aValue = a.scores.authority;
          bValue = b.scores.authority;
          break;
        default: // totalScore
          aValue = a.scores.total;
          bValue = b.scores.total;
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [insights, activeStatusFilter, postTypeFilter, categoryFilter, searchQuery, scoreRange, sortBy, sortOrder]);

  // Handle individual insight actions
  const handleAction = async (action: string, insight: InsightView) => {
    try {
      if (action === 'approve' || action === 'reject') {
        const response = await fetch(`/api/insights?id=${insight.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: action === 'approve' ? 'approved' : 'rejected'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Update the insight in the state
            setInsights(prev => prev.map(i => 
              i.id === insight.id 
                ? { ...i, status: action === 'approve' ? 'approved' : 'rejected' as any, updatedAt: new Date(result.data.updatedAt) }
                : i
            ));
          }
        }
      } else if (action === 'review') {
        // Move back to needs review
        const response = await fetch(`/api/insights?id=${insight.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'needs_review'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setInsights(prev => prev.map(i => 
              i.id === insight.id 
                ? { ...i, status: 'needs_review' as any, updatedAt: new Date(result.data.updatedAt) }
                : i
            ));
          }
        }
      } else if (action === 'edit') {
        // Open modal for editing
        setSelectedInsight(insight);
        setShowModal(true);
      } else {
        // Handle other actions (generate_posts, etc.)
        console.log(`Action: ${action} on insight: ${insight.title}`);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedInsights.length === 0) return;

    try {
      const response = await fetch('/api/insights/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          insightIds: selectedInsights
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update insights in state
          const newStatus = action === 'approve' ? 'approved' : 
                           action === 'reject' ? 'rejected' :
                           action === 'archive' ? 'archived' : 'needs_review';
          
          setInsights(prev => prev.map(insight => 
            selectedInsights.includes(insight.id)
              ? { ...insight, status: newStatus as any, updatedAt: new Date() }
              : insight
          ));
          
          // Clear selection
          setSelectedInsights([]);
        }
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
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

  // Handle modal save
  const handleModalSave = async (updatedData: Partial<InsightView>) => {
    if (!selectedInsight) return;

    try {
      const response = await fetch(`/api/insights?id=${selectedInsight.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update the insight in the state
          setInsights(prev => prev.map(i => 
            i.id === selectedInsight.id 
              ? { ...i, ...updatedData, updatedAt: new Date(result.data.updatedAt) }
              : i
          ));
          setShowModal(false);
          setSelectedInsight(null);
        }
      }
    } catch (error) {
      console.error('Failed to save insight:', error);
      throw error;
    }
  };

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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Left side - Bulk Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedInsights.length > 0 && (
              <>
                <span className="text-sm font-medium text-gray-700">
                  {selectedInsights.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('approve')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    Approve Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject')}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Reject Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('archive')}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                  >
                    Archive Selected
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right side - Search and Filters */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Filters {showFilters ? '▼' : '▶'}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Post Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Post Type</label>
                <select
                  value={postTypeFilter}
                  onChange={(e) => setPostTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {postTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="totalScore-desc">Total Score (High to Low)</option>
                  <option value="totalScore-asc">Total Score (Low to High)</option>
                  <option value="createdAt-desc">Date Created (Newest)</option>
                  <option value="createdAt-asc">Date Created (Oldest)</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                  <option value="category-asc">Category (A-Z)</option>
                </select>
              </div>

              {/* Score Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Score Range: {scoreRange[0]} - {scoreRange[1]}
                </label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={scoreRange[0]}
                    onChange={(e) => setScoreRange([parseInt(e.target.value), scoreRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={scoreRange[1]}
                    onChange={(e) => setScoreRange([scoreRange[0], parseInt(e.target.value)])}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {statusFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveStatusFilter(filter.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeStatusFilter === filter.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {filter.label}
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {filter.count(insights)}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Select All */}
      {filteredInsights.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedInsights.length === filteredInsights.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label className="text-sm text-gray-700">
            Select all {filteredInsights.length} insights
          </label>
        </div>
      )}

      {/* Insights Grid */}
      <div className="space-y-4">
        {filteredInsights.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">💡</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || postTypeFilter !== 'all' || categoryFilter !== 'all' || scoreRange[0] > 0 || scoreRange[1] < 10
                ? 'No matching insights found'
                : activeStatusFilter === 'needs_review'
                ? 'No insights need review'
                : `No ${activeStatusFilter === 'all' ? '' : activeStatusFilter} insights found`}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || postTypeFilter !== 'all' || categoryFilter !== 'all' || scoreRange[0] > 0 || scoreRange[1] < 10
                ? 'Try adjusting your filters or search terms'
                : activeStatusFilter === 'needs_review'
                ? 'All insights have been reviewed. Great work!'
                : 'Process some transcripts to generate insights, or check other status tabs'
              }
            </p>
            {(searchQuery || postTypeFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPostTypeFilter('all');
                  setCategoryFilter('all');
                  setScoreRange([0, 10]);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onAction={handleAction}
              isSelected={selectedInsights.includes(insight.id)}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

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