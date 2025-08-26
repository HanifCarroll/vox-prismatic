'use client';

import type { InsightView } from '@/types';
import { StatusTabs, type StatusFilter } from './index';

// Filter configuration for insights
const INSIGHTS_STATUS_FILTERS: StatusFilter<InsightView>[] = [
  { 
    key: 'all', 
    label: 'All Insights', 
    count: (insights) => insights.length 
  },
  { 
    key: 'needs_review', 
    label: 'Needs Review', 
    count: (insights) => insights.filter(i => i.status === 'needs_review').length 
  },
  { 
    key: 'approved', 
    label: 'Approved', 
    count: (insights) => insights.filter(i => i.status === 'approved').length 
  },
  { 
    key: 'rejected', 
    label: 'Rejected', 
    count: (insights) => insights.filter(i => i.status === 'rejected').length 
  },
  { 
    key: 'archived', 
    label: 'Archived', 
    count: (insights) => insights.filter(i => i.status === 'archived').length 
  }
];

interface InsightsStatusTabsProps {
  activeFilter: string;
  insights: InsightView[];
  onFilterChange: (filter: string) => void;
}

export function InsightsStatusTabs({ activeFilter, insights, onFilterChange }: InsightsStatusTabsProps) {
  return (
    <StatusTabs
      activeFilter={activeFilter}
      items={insights}
      filters={INSIGHTS_STATUS_FILTERS}
      onFilterChange={onFilterChange}
      layout="grid" // Insights use grid layout (5 columns)
    />
  );
}