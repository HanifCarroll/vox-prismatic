'use client';

import { ItemActionBar, type BulkAction } from './index';

interface PostsActionBarProps {
  selectedPosts: string[];
  searchQuery: string;
  showFilters: boolean;
  onBulkAction: (action: string) => void;
  onSearchChange: (query: string) => void;
  onToggleFilters: () => void;
}

const POST_BULK_ACTIONS: BulkAction[] = [
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

export function PostsActionBar(props: PostsActionBarProps) {
  return (
    <ItemActionBar
      selectedItems={props.selectedPosts}
      searchQuery={props.searchQuery}
      showFilters={props.showFilters}
      searchPlaceholder="Search by title, content, or tags..."
      itemTypeName="posts"
      layout="horizontal"
      bulkActions={POST_BULK_ACTIONS}
      onBulkAction={props.onBulkAction}
      onSearchChange={props.onSearchChange}
      onToggleFilters={props.onToggleFilters}
    />
  );
}