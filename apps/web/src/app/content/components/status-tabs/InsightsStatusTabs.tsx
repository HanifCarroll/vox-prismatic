'use client';

import type { InsightView } from '@/types';
import { StatusTabs, type StatusFilter } from './index';
import { Lightbulb, Eye, CheckCircle2, XCircle, Archive } from 'lucide-react';

// Filter configuration for insights
const INSIGHTS_STATUS_FILTERS: StatusFilter<InsightView>[] = [
  { 
    key: 'all', 
    label: 'All Insights', 
    count: (insights) => insights.length,
    icon: Lightbulb,
    iconColor: 'text-gray-600'
  },
  { 
    key: 'needs_review', 
    label: 'Needs Review', 
    count: (insights) => insights.filter(i => i.status === 'needs_review').length,
    icon: Eye,
    iconColor: 'text-amber-600'
  },
  { 
    key: 'approved', 
    label: 'Approved', 
    count: (insights) => insights.filter(i => i.status === 'approved').length,
    icon: CheckCircle2,
    iconColor: 'text-green-600'
  },
  { 
    key: 'rejected', 
    label: 'Rejected', 
    count: (insights) => insights.filter(i => i.status === 'rejected').length,
    icon: XCircle,
    iconColor: 'text-red-600'
  },
  { 
    key: 'archived', 
    label: 'Archived', 
    count: (insights) => insights.filter(i => i.status === 'archived').length,
    icon: Archive,
    iconColor: 'text-gray-500'
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