'use client';

import type { TranscriptView } from '@/types/database';
import { StatusTabs, type StatusFilter } from './index';
import { FileText, Sparkles, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';

interface TranscriptsStatusTabsProps {
  activeFilter: string;
  transcripts: TranscriptView[];
  onFilterChange: (filter: string) => void;
  globalCounts?: {
    total: number;
    raw: number;
    cleaned: number;
  };
}

export function TranscriptsStatusTabs({ activeFilter, transcripts, onFilterChange, globalCounts }: TranscriptsStatusTabsProps) {
  // Use global counts if available, otherwise fall back to local counts
  const filters = useMemo(() => {
    const useGlobal = !!globalCounts;
    
    return [
      { 
        key: 'all', 
        label: 'All Transcripts', 
        count: () => useGlobal ? globalCounts.total : transcripts.length,
        icon: FileText,
        iconColor: 'text-gray-600'
      },
      { 
        key: 'raw', 
        label: 'Needs Cleaning', 
        count: () => useGlobal ? globalCounts.raw : transcripts.filter(t => t.status === 'raw').length,
        icon: Sparkles,
        iconColor: 'text-yellow-600'
      },
      { 
        key: 'cleaned', 
        label: 'Ready to Process', 
        count: () => useGlobal ? globalCounts.cleaned : transcripts.filter(t => t.status === 'cleaned').length,
        icon: CheckCircle,
        iconColor: 'text-green-600'
      }
    ] as StatusFilter<TranscriptView>[];
  }, [transcripts, globalCounts]);
  
  return (
    <StatusTabs
      activeFilter={activeFilter}
      items={transcripts}
      filters={filters}
      onFilterChange={onFilterChange}
      layout="grid" // Transcripts use grid layout (3 columns)
    />
  );
}