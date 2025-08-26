'use client';

import { ReactNode } from 'react';
import { ItemActionBar, type BulkAction } from './index';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface TranscriptsActionBarProps {
  selectedTranscripts: string[];
  searchQuery: string;
  showFilters?: boolean;
  onBulkAction: (action: string) => void;
  onSearchChange: (query: string) => void;
  onToggleFilters?: () => void;
  onAddTranscript: () => void;
}

const TRANSCRIPT_BULK_ACTIONS: BulkAction[] = [
  {
    key: 'clean',
    label: 'Clean Selected',
    mobileLabel: 'Clean',
    variant: 'secondary',
    className: 'gap-2'
  },
  {
    key: 'delete',
    label: 'Delete Selected',
    mobileLabel: 'Delete',
    variant: 'destructive'
  }
];

export function TranscriptsActionBar({ 
  onAddTranscript,
  onToggleFilters = () => {},
  showFilters = false,
  ...props 
}: TranscriptsActionBarProps) {
  return (
    <ItemActionBar
      selectedItems={props.selectedTranscripts}
      searchQuery={props.searchQuery}
      showFilters={showFilters}
      searchPlaceholder="Search by title or content..."
      itemTypeName="transcripts"
      layout="horizontal"
      bulkActions={TRANSCRIPT_BULK_ACTIONS}
      onBulkAction={props.onBulkAction}
      onSearchChange={props.onSearchChange}
      onToggleFilters={onToggleFilters}
    >
      {/* Primary action button that appears in the left section */}
      <Button onClick={onAddTranscript} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Transcript
      </Button>
    </ItemActionBar>
  );
}