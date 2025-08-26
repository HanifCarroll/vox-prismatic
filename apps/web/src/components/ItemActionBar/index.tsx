'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X } from 'lucide-react';

export interface BulkAction {
  key: string;
  label: string;
  variant?: 'default' | 'destructive' | 'secondary' | 'outline';
  className?: string;
  mobileLabel?: string; // Shorter label for mobile
}

export interface ItemActionBarProps {
  selectedItems: string[];
  searchQuery: string;
  showFilters: boolean;
  searchPlaceholder?: string;
  itemTypeName?: string; // e.g., "posts", "insights" for "3 posts selected"
  layout?: 'horizontal' | 'vertical'; // Layout preference
  bulkActions?: BulkAction[];
  onBulkAction: (action: string) => void;
  onSearchChange: (query: string) => void;
  onToggleFilters: () => void;
  children?: ReactNode; // For custom content
}

// Default bulk actions that most content types use
const DEFAULT_BULK_ACTIONS: BulkAction[] = [
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

export function ItemActionBar({
  selectedItems,
  searchQuery,
  showFilters,
  searchPlaceholder = 'Search items...',
  itemTypeName = 'items',
  layout = 'vertical',
  bulkActions = DEFAULT_BULK_ACTIONS,
  onBulkAction,
  onSearchChange,
  onToggleFilters,
  children
}: ItemActionBarProps) {
  const selectedCount = selectedItems.length;
  const hasSelection = selectedCount > 0;

  // Render bulk actions section
  const renderBulkActions = () => {
    if (!hasSelection) return null;

    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} {itemTypeName} selected
        </span>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {bulkActions.map((action) => (
            <Button
              key={action.key}
              onClick={() => onBulkAction(action.key)}
              size="sm"
              variant={action.variant}
              className={`flex-1 sm:flex-none ${action.className || ''}`}
            >
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.mobileLabel || action.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Render search and filters section
  const renderSearchFilters = () => (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <div className="relative flex-1 max-w-lg">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4 py-2.5 w-full border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg shadow-sm text-sm placeholder:text-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
      <Button
        onClick={onToggleFilters}
        variant={showFilters ? "default" : "outline"}
        size="sm"
        className="w-full sm:w-auto gap-2"
      >
        <Filter className="h-4 w-4" />
        Filters
      </Button>
    </div>
  );

  if (layout === 'horizontal') {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            {/* Left side - Bulk Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {renderBulkActions()}
            </div>

            {/* Right side - Search and Filters */}
            <div className="flex items-center gap-3">
              {renderSearchFilters()}
            </div>
          </div>
          {children}
        </CardContent>
      </Card>
    );
  }

  // Vertical layout (default)
  return (
    <Card className="mb-6">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search and Filters Row */}
          {renderSearchFilters()}

          {/* Bulk Actions - Only show when items are selected */}
          {hasSelection && (
            <div className="pt-2 border-t">
              {renderBulkActions()}
            </div>
          )}
          
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export default ItemActionBar;