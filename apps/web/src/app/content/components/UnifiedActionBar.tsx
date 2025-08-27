"use client";

import { useMemo } from "react";
import { Search, Users, ChevronDown, Plus } from "lucide-react";
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
  const { createSortGroup, createPlatformGroup, createStatusGroup, createCategoryGroup } = useFilterGroups();
  
  // Memoize filter groups based on active view
  const filterGroups = useMemo(() => {
    const groups = [];

    // Add view-specific filters
    switch (activeView) {
      case "transcripts":
        // Status filter
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
        
        // Sort filter
        groups.push(
          createSortGroup(
            currentFilters.sort || 'createdAt-desc',
            (value) => onFilterChange('sort', value),
            [
              { value: 'createdAt-desc', label: 'Newest First' },
              { value: 'createdAt-asc', label: 'Oldest First' },
              { value: 'title-asc', label: 'Title A-Z' },
              { value: 'title-desc', label: 'Title Z-A' },
              { value: 'wordCount-desc', label: 'Most Words' },
              { value: 'wordCount-asc', label: 'Least Words' },
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

        // Sort filter
        groups.push(
          createSortGroup(
            currentFilters.sort || 'totalScore-desc',
            (value) => onFilterChange('sort', value),
            [
              { value: 'totalScore-desc', label: 'Highest Score' },
              { value: 'totalScore-asc', label: 'Lowest Score' },
              { value: 'createdAt-desc', label: 'Newest First' },
              { value: 'createdAt-asc', label: 'Oldest First' },
              { value: 'title-asc', label: 'Title A-Z' },
              { value: 'title-desc', label: 'Title Z-A' },
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

        // Sort filter
        groups.push(
          createSortGroup(
            currentFilters.sort || 'createdAt-desc',
            (value) => onFilterChange('sort', value),
            [
              { value: 'createdAt-desc', label: 'Newest First' },
              { value: 'createdAt-asc', label: 'Oldest First' },
              { value: 'title-asc', label: 'Title A-Z' },
              { value: 'title-desc', label: 'Title Z-A' },
              { value: 'platform-asc', label: 'Platform A-Z' },
            ]
          )
        );
        break;
    }

    return groups;
  }, [activeView, currentFilters, platforms, onFilterChange, createSortGroup, createPlatformGroup, createStatusGroup, createCategoryGroup]);
  
  // Memoize bulk actions based on active view
  const bulkActions = useMemo(() => {
    const commonActions = [
      { label: "Select All", value: "select", icon: "☑️" },
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
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4 px-6 py-3">
        {/* Add to Pipeline - Always visible for consistency */}
        <Button onClick={onAddToPipeline} className="gap-2">
          <Plus className="h-4 w-4" />
          Add to Pipeline
        </Button>
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={`Search ${activeView}...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Smart Selection */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Smart Select
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
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

        {/* Selection Count & Bulk Actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">
              {selectedCount} selected
            </span>
            
            {bulkActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-2">
                    Bulk Actions
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {bulkActions.map((action) => (
                    <DropdownMenuItem
                      key={action.value}
                      onClick={() => onBulkAction(action.value)}
                      className="gap-2"
                    >
                      {action.icon && <span>{action.icon}</span>}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {/* Custom actions from children */}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}