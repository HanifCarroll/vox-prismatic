'use client';

import { useState, useMemo } from 'react';
import { InsightView } from './components/InsightCard';
import InsightModal from './components/InsightModal';
import { InsightsActionBar } from './components/InsightsActionBar';
import { InsightsFilters } from './components/InsightsFilters';
import { InsightsStatusTabs } from './components/InsightsStatusTabs';
import { InsightsList } from './components/InsightsList';

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
  const [scoreRange, setScoreRange] = useState([0, 20]);
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

    // Score range filter removed - show all insights regardless of score

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
            setInsights(prev => prev.map(i => 
              i.id === insight.id 
                ? { ...i, status: action === 'approve' ? 'approved' : 'rejected' as any, updatedAt: new Date(result.data.updatedAt) }
                : i
            ));
          }
        }
      } else if (action === 'review') {
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
        setSelectedInsight(insight);
        setShowModal(true);
      } else {
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
          const newStatus = action === 'approve' ? 'approved' : 
                           action === 'reject' ? 'rejected' :
                           action === 'archive' ? 'archived' : 'needs_review';
          
          setInsights(prev => prev.map(insight => 
            selectedInsights.includes(insight.id)
              ? { ...insight, status: newStatus as any, updatedAt: new Date() }
              : insight
          ));
          
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