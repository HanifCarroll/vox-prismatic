"use client";

import { useMemo, useRef, useEffect } from "react";
import { Search, Users, ChevronDown, Plus } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SmartSelection } from "@/components/SmartSelection";
import { UnifiedFilters, useFilterGroups } from "@/components/UnifiedFilters";
import { SortDropdown, type SortOption } from "@/components/SortDropdown";

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
  
  // Smart Selection props
  onSelectAll: (selected: boolean) => void;
  onSelectFiltered: () => void;
  onSelectByStatus: (status: string) => void;
  onSelectByPlatform?: (platform: string) => void;
  onInvertSelection: () => void;
  onSelectDateRange: (start: Date, end: Date) => void;
  statuses: string[];
  platforms?: string[];
  platformLabel?: string;
  
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
  // Smart Selection props
  onSelectAll,
  onSelectFiltered,
  onSelectByStatus,
  onSelectByPlatform,
  onInvertSelection,
  onSelectDateRange,
  statuses,
  platforms,
  platformLabel = "platform",
  // Filter props
  currentFilters,
  onFilterChange,
  onClearAllFilters,
  // Pipeline action
  onAddToPipeline,
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

        // Category filter (same as platforms for insights)
        if (platforms && platforms.length > 0) {
          groups.push(
            createCategoryGroup(
              currentFilters.category || 'all',
              (value) => onFilterChange('category', value),
              [
                { value: 'all', label: 'All Categories' },
                ...platforms.map(platform => ({ value: platform, label: platform }))
              ]
            )
          );
        }
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
  }, [activeView, currentFilters, platforms, onFilterChange, createPlatformGroup, createStatusGroup, createCategoryGroup]);
  
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

  
  return (
    <div className="bg-gray-50/50 border-t border-gray-200">
      {/* Primary Action Row */}
      <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Add to Pipeline - Primary CTA */}
          <Button 
            onClick={onAddToPipeline} 
            className="gap-2 shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto"
            size="lg"
          >
            <Plus className="h-4 sm:h-5 w-4 sm:w-5" />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add to Pipeline</span>
          </Button>
          
          {/* Search - Prominent and Central */}
          <div className="relative flex-1 sm:max-w-2xl">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
              <Search className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
            </div>
            <Input
              ref={searchInputRef}
              placeholder={`Search ${activeView}...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 sm:pl-12 pr-4 h-10 sm:h-11 text-sm sm:text-base bg-white border-gray-300 shadow-sm focus:shadow-md transition-shadow placeholder:text-gray-500"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:flex items-center">
              <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded text-gray-500">⌘K</kbd>
            </div>
          </div>

          {/* Results Summary - Hidden on mobile, shown on desktop */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 sm:ml-auto">
            <span className="font-medium">{filteredCount}</span>
            <span>of</span>
            <span className="font-medium">{totalCount}</span>
            <span>{activeView}</span>
          </div>
        </div>
      </div>
      
      {/* Secondary Action Row */}
      <div className="px-3 sm:px-6 pb-2 sm:pb-3 overflow-x-auto">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 min-w-fit">
          {/* Smart Selection */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1 sm:gap-2 h-8 sm:h-9 hover:bg-white text-xs sm:text-sm" size="sm">
                <Users className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span className="hidden sm:inline">Smart Select</span>
                <span className="sm:hidden">Select</span>
                <ChevronDown className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <SmartSelection
                totalItems={totalCount}
                selectedCount={selectedCount}
                filteredCount={filteredCount}
                onSelectAll={onSelectAll}
                onSelectFiltered={onSelectFiltered}
                onSelectByStatus={onSelectByStatus}
                onSelectByPlatform={onSelectByPlatform}
                onInvertSelection={onInvertSelection}
                onSelectDateRange={onSelectDateRange}
                statuses={statuses}
                platforms={platforms}
                platformLabel={platformLabel}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filters */}
          <UnifiedFilters
            filterGroups={filterGroups}
            onClearAll={onClearAllFilters}
          />
          
          {/* Sort Dropdown */}
          <SortDropdown
            options={sortOptions}
            currentValue={currentFilters.sort || 'createdAt-desc'}
            onChange={(value) => onFilterChange('sort', value)}
          />
          
          {/* Divider - Hidden on mobile */}
          <div className="hidden sm:block h-6 w-px bg-gray-300" />

          {/* Bulk Actions - Show when items selected */}
          {selectedCount > 0 ? (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                <span className="text-xs sm:text-sm font-medium text-blue-700">
                  {selectedCount} selected
                </span>
                <button
                  onClick={() => onSelectAll(false)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear
                </button>
              </div>
              
              {bulkActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm" variant="secondary">
                      <span className="sm:hidden">Bulk</span>
                      <span className="hidden sm:inline">Bulk Actions</span>
                      <ChevronDown className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
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
          ) : (
            <div className="hidden sm:block text-sm text-gray-500">
              Select items to perform bulk actions
            </div>
          )}

          {/* Custom actions from children */}
          {children && (
            <>
              <div className="hidden sm:block h-6 w-px bg-gray-300 sm:ml-auto" />
              <div className="flex items-center gap-2">
                {children}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}