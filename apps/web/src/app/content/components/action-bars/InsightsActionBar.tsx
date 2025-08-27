'use client';

import { ItemActionBar, type BulkAction } from './index';

interface InsightsActionBarProps {
  selectedInsights: string[];
  searchQuery: string;
  showFilters: boolean;
  onBulkAction: (action: string) => void;
  onSearchChange: (query: string) => void;
  onToggleFilters: () => void;
}

const INSIGHTS_BULK_ACTIONS: BulkAction[] = [
  {
    key: 'approve',
    label: 'Approve Selected',
    mobileLabel: 'Approve',
    variant: 'default',
    className: 'bg-green-600 hover:bg-green-700'
  },
  {
    key: 'reject',
    label: 'Reject Selected',
    mobileLabel: 'Reject',
    variant: 'destructive'
  },
  {
    key: 'archive',
    label: 'Archive Selected',
    mobileLabel: 'Archive',
    variant: 'secondary'
  }
];

export function InsightsActionBar(props: InsightsActionBarProps) {
  return (
    <ItemActionBar
      selectedItems={props.selectedInsights}
      searchQuery={props.searchQuery}
      showFilters={props.showFilters}
      searchPlaceholder="Search by title, summary, or category..."
      itemTypeName="insights"
      layout="horizontal"
      bulkActions={INSIGHTS_BULK_ACTIONS}
      onBulkAction={props.onBulkAction}
      onSearchChange={props.onSearchChange}
      onToggleFilters={props.onToggleFilters}
    />
  );
}