'use client';

import type { TranscriptView } from '@/types/database';
import { StatusTabs, type StatusFilter } from './index';
import { FileText, Sparkles, CheckCircle, Loader, Trophy } from 'lucide-react';

// Filter configuration for transcripts - matches the existing workflow
const TRANSCRIPT_STATUS_FILTERS: StatusFilter<TranscriptView>[] = [
  { 
    key: 'all', 
    label: 'All Transcripts', 
    count: (transcripts) => transcripts.length,
    icon: FileText,
    iconColor: 'text-gray-600'
  },
  { 
    key: 'raw', 
    label: 'Need Cleaning', 
    count: (transcripts) => transcripts.filter(t => t.status === 'raw').length,
    icon: Sparkles,
    iconColor: 'text-yellow-600'
  },
  { 
    key: 'cleaned', 
    label: 'Ready to Process', 
    count: (transcripts) => transcripts.filter(t => t.status === 'cleaned').length,
    icon: CheckCircle,
    iconColor: 'text-green-600'
  },
  { 
    key: 'processing', 
    label: 'Processing', 
    count: (transcripts) => transcripts.filter(t => t.status === 'processing').length,
    icon: Loader,
    iconColor: 'text-blue-600'
  },
  { 
    key: 'completed', 
    label: 'Completed', 
    count: (transcripts) => transcripts.filter(t => 
      t.status === 'insights_generated' || t.status === 'posts_created'
    ).length,
    icon: Trophy,
    iconColor: 'text-purple-600'
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