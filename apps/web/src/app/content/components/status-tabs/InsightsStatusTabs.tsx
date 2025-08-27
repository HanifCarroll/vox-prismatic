'use client';

import type { InsightView } from '@/types';
import { StatusTabs, type StatusFilter } from './index';
import { Lightbulb, Eye, CheckCircle2, XCircle, Archive } from 'lucide-react';
import { useMemo } from 'react';

interface InsightsStatusTabsProps {
  activeFilter: string;
  insights: InsightView[];
  onFilterChange: (filter: string) => void;
  globalCounts?: {
    total: number;
    needs_review: number;
    approved: number;
    rejected: number;
    archived: number;
  };
}

export function InsightsStatusTabs({ activeFilter, insights, onFilterChange, globalCounts }: InsightsStatusTabsProps) {
  const filters = useMemo(() => {
    const useGlobal = !!globalCounts;
    
    return [
      { 
        key: 'all', 
        label: 'All Insights', 
        count: () => useGlobal ? globalCounts.total : insights.length,
        icon: Lightbulb,
        iconColor: 'text-gray-600'
      },
      { 
        key: 'needs_review', 
        label: 'Needs Review', 
        count: () => useGlobal ? globalCounts.needs_review : insights.filter(i => i.status === 'needs_review').length,
        icon: Eye,
        iconColor: 'text-amber-600'
      },
      { 
        key: 'approved', 
        label: 'Approved', 
        count: () => useGlobal ? globalCounts.approved : insights.filter(i => i.status === 'approved').length,
        icon: CheckCircle2,
        iconColor: 'text-green-600'
      },
      { 
        key: 'rejected', 
        label: 'Rejected', 
        count: () => useGlobal ? globalCounts.rejected : insights.filter(i => i.status === 'rejected').length,
        icon: XCircle,
        iconColor: 'text-red-600'
      },
      { 
        key: 'archived', 
        label: 'Archived', 
        count: () => useGlobal ? globalCounts.archived : insights.filter(i => i.status === 'archived').length,
        icon: Archive,
        iconColor: 'text-gray-500'
      }
    ] as StatusFilter<InsightView>[];
  }, [insights, globalCounts]);
  
  return (
    <StatusTabs
      activeFilter={activeFilter}
      items={insights}
      filters={filters}
      onFilterChange={onFilterChange}
      layout="grid" // Insights use grid layout (5 columns)
    />
  );
}