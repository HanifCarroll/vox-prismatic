'use client';

import { Lightbulb } from 'lucide-react';
import InsightCard, { InsightView } from './InsightCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface InsightsListProps {
  insights: InsightView[];
  selectedInsights: string[];
  searchQuery: string;
  postTypeFilter: string;
  categoryFilter: string;
  activeStatusFilter: string;
  onAction: (action: string, insight: InsightView) => void;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onClearFilters: () => void;
}

export function InsightsList({
  insights,
  selectedInsights,
  searchQuery,
  postTypeFilter,
  categoryFilter,
  activeStatusFilter,
  onAction,
  onSelect,
  onSelectAll,
  onClearFilters
}: InsightsListProps) {
  const hasActiveFilters = searchQuery || postTypeFilter !== 'all' || categoryFilter !== 'all';

  if (insights.length === 0) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {hasActiveFilters
            ? 'No matching insights found'
            : activeStatusFilter === 'needs_review'
            ? 'No insights need review'
            : `No ${activeStatusFilter === 'all' ? '' : activeStatusFilter} insights found`}
        </h3>
        <p className="text-gray-600 mb-4">
          {hasActiveFilters
            ? 'Try adjusting your filters or search terms'
            : activeStatusFilter === 'needs_review'
            ? 'All insights have been reviewed. Great work!'
            : 'Process some transcripts to generate insights, or check other status tabs'}
        </p>
        {hasActiveFilters && (
          <Button onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Select All */}
      <div className="mb-4 flex items-center gap-2">
        <Checkbox
          id="select-all"
          checked={selectedInsights.length === insights.length}
          onCheckedChange={(checked) => onSelectAll(!!checked)}
        />
        <label htmlFor="select-all" className="text-sm text-gray-700 cursor-pointer">
          Select all {insights.length} insights
        </label>
      </div>

      {/* Insights Grid */}
      <div className="space-y-4">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onAction={onAction}
            isSelected={selectedInsights.includes(insight.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </>
  );
}