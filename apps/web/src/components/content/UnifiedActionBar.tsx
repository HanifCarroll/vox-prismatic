
import { useMemo, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, Plus, Filter, Settings2, Columns3 } from "lucide-react";
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
import { FilterDropdown, type FilterGroup } from "@/components/FilterDropdown";
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
  showFilters?: boolean;
  onToggleFilters?: () => void;
  onCreateNew?: () => void;
  children?: React.ReactNode;
  
  // Selection props (optional for backwards compatibility)
  onSelectAll?: (selected: boolean) => void;
  
  // Filter props
  currentFilters?: {
    status?: string[];
    platform?: string[];
    sort?: string;
    category?: string[];
    postType?: string[];
  };
  onFilterChange?: (filterKey: string, value: string | string[] | { field: string; order: string }) => void;
  onClearAllFilters?: () => void;
  
  // Pipeline action handler (optional)
  onAddToPipeline?: () => void;
  
  // Column visibility props (optional)
  visibleColumns?: string[];
  availableColumns?: { id: string; label: string }[];
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
  
  // Data for dynamic filters (optional)
  currentData?: any[];
}

export function UnifiedActionBar({
  activeView,
  searchQuery,
  onSearchChange,
  selectedCount,
  totalCount,
  filteredCount,
  onBulkAction,
  showFilters = false,
  onToggleFilters,
  onCreateNew,
  children,
  // Selection props
  onSelectAll,
  // Filter props
  currentFilters = {},
  onFilterChange,
  onClearAllFilters,
  // Pipeline action
  onAddToPipeline,
  // Column visibility props
  visibleColumns = [],
  availableColumns = [],
  onColumnVisibilityChange,
  // Data for dynamic filters
  currentData = [],
}: UnifiedActionBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Helper function to extract unique values from data
  const getUniqueValues = useCallback((data: any[], field: string): string[] => {
    const values = new Set<string>();
    data.forEach(item => {
      if (item[field]) {
        values.add(item[field]);
      }
    });
    return Array.from(values).sort();
  }, []);
  
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
      handler: onAddToPipeline || (() => {}),
      description: 'Add to pipeline'
    },
    {
      key: 'Escape',
      handler: () => {
        if (selectedCount > 0) {
          onSelectAll?.(false);
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
          { value: 'status-asc', label: 'Status A-Z', group: 'Status' },
          { value: 'status-desc', label: 'Status Z-A', group: 'Status' },
        ];
      case "insights":
        return [
          { value: 'totalScore-desc', label: 'Highest Score', group: 'Score' },
          { value: 'totalScore-asc', label: 'Lowest Score', group: 'Score' },
          { value: 'createdAt-desc', label: 'Newest First', group: 'Date' },
          { value: 'createdAt-asc', label: 'Oldest First', group: 'Date' },
          { value: 'title-asc', label: 'Title A-Z', group: 'Alphabetical' },
          { value: 'title-desc', label: 'Title Z-A', group: 'Alphabetical' },
          { value: 'category-asc', label: 'Category A-Z', group: 'Category' },
          { value: 'category-desc', label: 'Category Z-A', group: 'Category' },
          { value: 'status-asc', label: 'Status A-Z', group: 'Status' },
          { value: 'status-desc', label: 'Status Z-A', group: 'Status' },
        ];
      case "posts":
        return [
          { value: 'createdAt-desc', label: 'Newest First', group: 'Date' },
          { value: 'createdAt-asc', label: 'Oldest First', group: 'Date' },
          { value: 'scheduledFor-desc', label: 'Latest Scheduled', group: 'Schedule' },
          { value: 'scheduledFor-asc', label: 'Earliest Scheduled', group: 'Schedule' },
          { value: 'title-asc', label: 'Title A-Z', group: 'Alphabetical' },
          { value: 'title-desc', label: 'Title Z-A', group: 'Alphabetical' },
          { value: 'platform-asc', label: 'Platform A-Z', group: 'Platform' },
          { value: 'platform-desc', label: 'Platform Z-A', group: 'Platform' },
          { value: 'status-asc', label: 'Status A-Z', group: 'Status' },
          { value: 'status-desc', label: 'Status Z-A', group: 'Status' },
        ];
      default:
        return [];
    }
  }, [activeView]);
  
  // Memoize filter groups based on active view
  const filterGroups = useMemo<FilterGroup[]>(() => {
    const groups: FilterGroup[] = [];

    // Add view-specific filters
    switch (activeView) {
      case "transcripts":
        // Status filter only
        groups.push({
          key: 'status',
          label: 'Status',
          currentValue: currentFilters.status || [],
          onChange: (value) => onFilterChange?.('status', value),
          options: [
            { value: 'all', label: 'All Status' },
            { value: 'raw', label: 'Raw' },
            { value: 'cleaned', label: 'Cleaned' },
          ]
        });
        break;

      case "insights":
        // Status filter
        groups.push({
          key: 'status',
          label: 'Status',
          currentValue: currentFilters.status || [],
          onChange: (value) => onFilterChange?.('status', value),
          options: [
            { value: 'all', label: 'All Status' },
            { value: 'needs_review', label: 'Needs Review' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'archived', label: 'Archived' },
          ]
        });

        // Category filter for insights - dynamically extracted from data
        const uniqueCategories = getUniqueValues(currentData, 'category');
        if (uniqueCategories.length > 0) {
          groups.push({
            key: 'category',
            label: 'Category',
            currentValue: currentFilters.category || [],
            onChange: (value) => onFilterChange?.('category', value),
            options: [
              { value: 'all', label: 'All Categories' },
              ...uniqueCategories.map(cat => ({ 
                value: cat, 
                label: cat 
              }))
            ]
          });
        }
        break;

      case "posts":
        // Status filter
        groups.push({
          key: 'status',
          label: 'Status',
          currentValue: currentFilters.status || [],
          onChange: (value) => onFilterChange?.('status', value),
          options: [
            { value: 'all', label: 'All Status' },
            { value: 'needs_review', label: 'Needs Review' },
            { value: 'approved', label: 'Approved' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'published', label: 'Published' },
            { value: 'failed', label: 'Failed' },
            { value: 'archived', label: 'Archived' },
          ]
        });

        // Platform filter - dynamically extracted from data
        const uniquePlatforms = getUniqueValues(currentData, 'platform');
        if (uniquePlatforms.length > 0) {
          groups.push({
            key: 'platform',
            label: 'Platform',
            currentValue: currentFilters.platform || [],
            onChange: (value) => onFilterChange?.('platform', value),
            options: [
              { value: 'all', label: 'All Platforms' },
              ...uniquePlatforms.map(platform => ({ 
                value: platform, 
                label: platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()
              }))
            ]
          });
        }
        break;
    }

    return groups;
  }, [activeView, currentFilters, onFilterChange, currentData, getUniqueValues]);
  
  // Memoize bulk actions based on active view
  const bulkActions = useMemo(() => {
    const commonActions = [
      { label: "Archive Selected", value: "archive", icon: "📁" }
    ];
    
    switch (activeView) {
      case "transcripts":
        return [
          { label: "Clean Selected", value: "clean", icon: "✨" },
          ...commonActions
        ];
      case "insights":
        return [
          { label: "Approve Selected", value: "approve", icon: "✅" },
          { label: "Reject Selected", value: "reject", icon: "❌" },
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
    if (currentFilters.status && currentFilters.status.length > 0) count++;
    if (currentFilters.platform && currentFilters.platform.length > 0) count++;
    if (currentFilters.category && currentFilters.category.length > 0) count++;
    if (searchQuery) count++;
    return count;
  }, [currentFilters, searchQuery]);

  
  return (
    <div className="bg-white border-t border-gray-200">
      {/* Unified Single Row Control Bar */}
      <div className="px-3 lg:px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Primary Actions */}
          {onCreateNew && activeView === 'transcripts' && (
            <Button 
              onClick={onCreateNew} 
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all shrink-0"
              size="sm"
              variant="default"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">New Transcript</span>
              <span className="md:hidden">New</span>
            </Button>
          )}
          
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
            {/* Count integrated into search bar - only show when searching */}
            {searchQuery && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="text-xs text-gray-500 tabular-nums">
                  {totalCount} result{totalCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Controls Group */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* Filters Dropdown */}
            <FilterDropdown
              filterGroups={filterGroups}
              onClearAll={onClearAllFilters}
            />
            
            {/* Sort Dropdown */}
            <SortDropdown
              options={sortOptions}
              currentValue={currentFilters.sort || 'createdAt-desc'}
              onChange={(value) => {
                // Parse the sort value which comes as "field-order" (e.g., "createdAt-desc")
                const lastDashIndex = value.lastIndexOf('-');
                const field = value.substring(0, lastDashIndex);
                const order = value.substring(lastDashIndex + 1);
                // Pass both sort parameters atomically to prevent race conditions
                onFilterChange?.('sort', { field, order });
              }}
            />
            
            {/* Columns Button */}
            {availableColumns.length > 0 && onColumnVisibilityChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    <Columns3 className="h-3.5 w-3.5" />
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

          {/* Mobile Settings Button - Combined filters, sort, and columns */}
          <div className="flex md:hidden items-center gap-1.5 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1 h-8 px-2.5" size="sm">
                  <Settings2 className="h-4 w-4" />
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
                    <FilterDropdown
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
                      onChange={(value) => {
                        const lastDashIndex = value.lastIndexOf('-');
                        const field = value.substring(0, lastDashIndex);
                        const order = value.substring(lastDashIndex + 1);
                        // Pass both sort parameters atomically to prevent race conditions
                        onFilterChange?.('sort', { field, order });
                      }}
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
                    onClick={() => onSelectAll?.(false)}
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