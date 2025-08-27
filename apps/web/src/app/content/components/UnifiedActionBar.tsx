"use client";

import { useMemo, useRef, useEffect } from "react";
import { Search, ChevronDown, Plus, Filter, Settings2 } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UnifiedFilters, useFilterGroups } from "@/components/UnifiedFilters";
import { SortDropdown, type SortOption } from "@/components/SortDropdown";
import { Badge } from "@/components/ui/badge";

type ContentView = "transcripts" | "insights" | "posts";

interface UnifiedActionBarProps {
  activeView: ContentView;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCount: number;
  totalCount: number;
  filteredCount: number;
  onBulkAction: (action: string) => void;
  children?: React.ReactNode;
  
  // Selection props
  onSelectAll: (selected: boolean) => void;
  
  // Filter props
  currentFilters: {
    status?: string;
    platform?: string;
    sort?: string;
    category?: string;
    postType?: string;
  };
  onFilterChange: (filterKey: string, value: string) => void;
  onClearAllFilters: () => void;
  
  // Pipeline action handler
  onAddToPipeline: () => void;
  
  // Column visibility props (optional)
  visibleColumns?: string[];
  availableColumns?: { id: string; label: string }[];
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
}

export function UnifiedActionBar({
  activeView,
  searchQuery,
  onSearchChange,
  selectedCount,
  totalCount,
  filteredCount,
  onBulkAction,
  children,
  // Selection props
  onSelectAll,
  // Filter props
  currentFilters,
  onFilterChange,
  onClearAllFilters,
  // Pipeline action
  onAddToPipeline,
  // Column visibility props
  visibleColumns = [],
  availableColumns = [],
  onColumnVisibilityChange,
}: UnifiedActionBarProps) {
  const { createPlatformGroup, createStatusGroup, createCategoryGroup } = useFilterGroups();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      meta: true,
      handler: () => searchInputRef.current?.focus(),
      description: 'Focus search'
    },
    {
      key: 'n',
      meta: true,
      handler: onAddToPipeline,
      description: 'Add to pipeline'
    },
    {
      key: 'Escape',
      handler: () => {
        if (selectedCount > 0) {
          onSelectAll(false);
        }
      },
      description: 'Clear selection'
    }
  ]);
  
  // Memoize sort options based on active view
  const sortOptions = useMemo<SortOption[]>(() => {
    switch (activeView) {
      case "transcripts":
        return [
          { value: 'createdAt-desc', label: 'Newest First', group: 'Date' },
          { value: 'createdAt-asc', label: 'Oldest First', group: 'Date' },
          { value: 'title-asc', label: 'Title A-Z', group: 'Alphabetical' },
          { value: 'title-desc', label: 'Title Z-A', group: 'Alphabetical' },
          { value: 'wordCount-desc', label: 'Most Words', group: 'Size' },
          { value: 'wordCount-asc', label: 'Least Words', group: 'Size' },
        ];
      case "insights":
        return [
          { value: 'totalScore-desc', label: 'Highest Score', group: 'Score' },
          { value: 'totalScore-asc', label: 'Lowest Score', group: 'Score' },
          { value: 'createdAt-desc', label: 'Newest First', group: 'Date' },
          { value: 'createdAt-asc', label: 'Oldest First', group: 'Date' },
          { value: 'title-asc', label: 'Title A-Z', group: 'Alphabetical' },
          { value: 'title-desc', label: 'Title Z-A', group: 'Alphabetical' },
        ];
      case "posts":
        return [
          { value: 'createdAt-desc', label: 'Newest First', group: 'Date' },
          { value: 'createdAt-asc', label: 'Oldest First', group: 'Date' },
          { value: 'title-asc', label: 'Title A-Z', group: 'Alphabetical' },
          { value: 'title-desc', label: 'Title Z-A', group: 'Alphabetical' },
          { value: 'platform-asc', label: 'Platform A-Z', group: 'Platform' },
          { value: 'platform-desc', label: 'Platform Z-A', group: 'Platform' },
        ];
      default:
        return [];
    }
  }, [activeView]);
  
  // Memoize filter groups based on active view (excluding sort)
  const filterGroups = useMemo(() => {
    const groups = [];

    // Add view-specific filters
    switch (activeView) {
      case "transcripts":
        // Status filter only
        groups.push(
          createStatusGroup(
            currentFilters.status || 'all',
            (value) => onFilterChange('status', value),
            [
              { value: 'all', label: 'All Status' },
              { value: 'raw', label: 'Raw' },
              { value: 'cleaned', label: 'Cleaned' },
              { value: 'processing', label: 'Processing' },
              { value: 'insights_generated', label: 'Insights Ready' },
              { value: 'posts_created', label: 'Posts Created' },
            ]
          )
        );
        break;

      case "insights":
        // Status filter
        groups.push(
          createStatusGroup(
            currentFilters.status || 'all',
            (value) => onFilterChange('status', value),
            [
              { value: 'all', label: 'All Status' },
              { value: 'needs_review', label: 'Needs Review' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'archived', label: 'Archived' },
            ]
          )
        );

        // Category filter for insights
        groups.push(
          createCategoryGroup(
            currentFilters.category || 'all',
            (value) => onFilterChange('category', value),
            [
              { value: 'all', label: 'All Categories' },
              { value: 'technical', label: 'Technical' },
              { value: 'business', label: 'Business' },
              { value: 'personal', label: 'Personal' }
            ]
          )
        );
        break;

      case "posts":
        // Status filter
        groups.push(
          createStatusGroup(
            currentFilters.status || 'all',
            (value) => onFilterChange('status', value),
            [
              { value: 'all', label: 'All Status' },
              { value: 'needs_review', label: 'Needs Review' },
              { value: 'approved', label: 'Approved' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'published', label: 'Published' },
              { value: 'failed', label: 'Failed' },
              { value: 'archived', label: 'Archived' },
            ]
          )
        );

        // Platform filter
        groups.push(
          createPlatformGroup(
            currentFilters.platform || 'all',
            (value) => onFilterChange('platform', value),
            [
              { value: 'all', label: 'All Platforms' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'x', label: 'X (Twitter)' },
            ]
          )
        );
        break;
    }

    return groups;
  }, [activeView, currentFilters, onFilterChange, createPlatformGroup, createStatusGroup, createCategoryGroup]);
  
  // Memoize bulk actions based on active view
  const bulkActions = useMemo(() => {
    const commonActions = [
      { label: "Archive Selected", value: "archive", icon: "📁" }
    ];
    
    switch (activeView) {
      case "transcripts":
        return [
          { label: "Clean Selected", value: "clean", icon: "✨" },
          { label: "Process Selected", value: "process", icon: "🎯" },
          ...commonActions
        ];
      case "insights":
        return [
          { label: "Approve Selected", value: "approve", icon: "✅" },
          { label: "Reject Selected", value: "reject", icon: "❌" },
          { label: "Generate Posts", value: "generate_posts", icon: "📝" },
          ...commonActions
        ];
      case "posts":
        return [
          { label: "Approve Selected", value: "approve", icon: "✅" },
          { label: "Reject Selected", value: "reject", icon: "❌" },
          { label: "Schedule Selected", value: "schedule", icon: "📅" },
          ...commonActions
        ];
      default:
        return [];
    }
  }, [activeView]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentFilters.status && currentFilters.status !== 'all') count++;
    if (currentFilters.platform && currentFilters.platform !== 'all') count++;
    if (currentFilters.category && currentFilters.category !== 'all') count++;
    if (searchQuery) count++;
    return count;
  }, [currentFilters, searchQuery]);

  
  return (
    <div className="bg-white border-t border-gray-200">
      {/* Unified Single Row Control Bar */}
      <div className="px-3 lg:px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Primary Action - Updated style */}
          <Button 
            onClick={onAddToPipeline} 
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all shrink-0"
            size="sm"
            variant="default"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Add to Pipeline</span>
            <span className="md:hidden">Add</span>
          </Button>
          
          {/* Search - Expandable with integrated count */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder={`Search ${activeView}...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-16 h-8 text-sm bg-white border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all placeholder:text-gray-400"
            />
            {/* Count integrated into search bar */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="text-xs text-gray-500 tabular-nums">
                {filteredCount} of {totalCount}
              </span>
            </div>
          </div>

          {/* Desktop Controls Group */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* Filters - Compact with badge */}
            <div className="flex items-center">
              <UnifiedFilters
                filterGroups={filterGroups}
                onClearAll={onClearAllFilters}
              />
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-medium">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            
            {/* Sort - Compact */}
            <SortDropdown
              options={sortOptions}
              currentValue={currentFilters.sort || 'createdAt-desc'}
              onChange={(value) => onFilterChange('sort', value)}
            />
            
            {/* Columns Button */}
            {availableColumns.length > 0 && onColumnVisibilityChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    <Settings2 className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[150px]">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={visibleColumns.includes(column.id)}
                      onCheckedChange={(checked) => 
                        onColumnVisibilityChange(column.id, checked)
                      }
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Filter Button - Combined */}
          <div className="flex md:hidden items-center gap-1.5 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1 h-8 px-2" size="sm">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="text-xs">Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-3">
                <div className="space-y-3">
                  {/* Filters */}
                  <div className="space-y-2 border-b pb-3">
                    <div className="font-medium text-sm">Filters</div>
                    <UnifiedFilters
                      filterGroups={filterGroups}
                      onClearAll={onClearAllFilters}
                    />
                  </div>
                  
                  {/* Sort */}
                  <div className="space-y-2 border-b pb-3">
                    <div className="font-medium text-sm">Sort</div>
                    <SortDropdown
                      options={sortOptions}
                      currentValue={currentFilters.sort || 'createdAt-desc'}
                      onChange={(value) => onFilterChange('sort', value)}
                    />
                  </div>
                  
                  {/* Columns - Mobile */}
                  {availableColumns.length > 0 && onColumnVisibilityChange && (
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Columns</div>
                      <div className="space-y-1">
                        {availableColumns.map((column) => (
                          <label
                            key={column.id}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns.includes(column.id)}
                              onChange={(e) => 
                                onColumnVisibilityChange(column.id, e.target.checked)
                              }
                              className="rounded border-gray-300"
                            />
                            {column.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bulk Actions - Conditional */}
          {selectedCount > 0 && (
            <>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <Badge variant="default" className="gap-1 bg-blue-600 text-white">
                  <span className="text-xs font-medium">{selectedCount} selected</span>
                  <button
                    onClick={() => onSelectAll(false)}
                    className="ml-0.5 hover:bg-blue-700 rounded px-0.5"
                  >
                    ×
                  </button>
                </Badge>
                
                {bulkActions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="gap-1 h-8 text-sm px-2" variant="secondary">
                        <span className="hidden md:inline">Bulk Actions</span>
                        <span className="md:hidden">Actions</span>
                        <ChevronDown className="h-3 w-3 ml-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {bulkActions.map((action) => (
                        <DropdownMenuItem
                          key={action.value}
                          onClick={() => onBulkAction(action.value)}
                          className="gap-2"
                        >
                          <span className="text-base">{action.icon}</span>
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </>
          )}

          {/* Custom Actions */}
          {children && !selectedCount && (
            <>
              <div className="h-6 w-px bg-gray-200 ml-auto" />
              <div className="flex items-center gap-1.5">
                {children}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}