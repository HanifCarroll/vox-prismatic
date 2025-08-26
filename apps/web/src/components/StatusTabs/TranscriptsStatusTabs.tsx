'use client';

import type { TranscriptView } from '@/types/database';
import { StatusTabs, type StatusFilter } from './index';

// Filter configuration for transcripts - matches the existing workflow
const TRANSCRIPT_STATUS_FILTERS: StatusFilter<TranscriptView>[] = [
  { 
    key: 'all', 
    label: 'All Transcripts', 
    count: (transcripts) => transcripts.length 
  },
  { 
    key: 'raw', 
    label: 'Need Cleaning', 
    count: (transcripts) => transcripts.filter(t => t.status === 'raw').length 
  },
  { 
    key: 'cleaned', 
    label: 'Ready to Process', 
    count: (transcripts) => transcripts.filter(t => t.status === 'cleaned').length 
  },
  { 
    key: 'processing', 
    label: 'Processing', 
    count: (transcripts) => transcripts.filter(t => t.status === 'processing').length 
  },
  { 
    key: 'completed', 
    label: 'Completed', 
    count: (transcripts) => transcripts.filter(t => t.status === 'completed').length 
  }
];

interface TranscriptsStatusTabsProps {
  activeFilter: string;
  transcripts: TranscriptView[];
  onFilterChange: (filter: string) => void;
}

export function TranscriptsStatusTabs({ activeFilter, transcripts, onFilterChange }: TranscriptsStatusTabsProps) {
  return (
    <StatusTabs
      activeFilter={activeFilter}
      items={transcripts}
      filters={TRANSCRIPT_STATUS_FILTERS}
      onFilterChange={onFilterChange}
      layout="grid" // Transcripts use grid layout (5 columns)
    />
  );
}