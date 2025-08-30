
import { useMemo } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Filter option types
interface FilterOption {
  value: string;
  label: string;
  icon?: React.ComponentType<any>;
}

interface FilterGroup {
  key: string;
  label: string;
  currentValue: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface UnifiedFiltersProps {
  filterGroups: FilterGroup[];
  onClearAll?: () => void;
  className?: string;
}

export function UnifiedFilters({
  filterGroups,
  onClearAll,
  className = ''
}: UnifiedFiltersProps) {
  
  // Calculate current filter state for display
  const filterSummary = useMemo(() => {
    const activeFilters = filterGroups
      .filter(group => group.currentValue !== 'all' && group.currentValue !== '')
      .map(group => {
        const currentOption = group.options.find(opt => opt.value === group.currentValue);
        return `${group.label}: ${currentOption?.label || group.currentValue}`;
      });

    if (activeFilters.length === 0) {
      return 'All Items';
    }
    
    if (activeFilters.length === 1) {
      return activeFilters[0];
    }
    
    return `${activeFilters.length} filters active`;
  }, [filterGroups]);

  // Check if any filters are active (not 'all')
  const hasActiveFilters = useMemo(() => {
    return filterGroups.some(group => group.currentValue !== 'all' && group.currentValue !== '');
  }, [filterGroups]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className={`gap-1.5 h-8 ${hasActiveFilters ? 'bg-blue-50 border-blue-200 hover:bg-blue-50' : 'hover:bg-gray-50'}`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-sm">{filterSummary}</span>
            <span className="sm:hidden text-sm">Filters</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {filterGroups.map((group, groupIndex) => (
            <div key={group.key}>
              {groupIndex > 0 && <DropdownMenuSeparator />}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {group.label}
              </div>
              {group.options.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => group.onChange(option.value)}
                  className={`gap-2 ${
                    group.currentValue === option.value ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  {option.icon && <option.icon className="h-4 w-4" />}
                  {option.label}
                  {group.currentValue === option.value && (
                    <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          ))}
          
          {hasActiveFilters && onClearAll && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClearAll} className="gap-2 text-red-600">
                <X className="h-4 w-4" />
                Clear All Filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Convenience hook for common filter patterns
export function useFilterGroups() {
  const createSortGroup = (
    currentValue: string,
    onChange: (value: string) => void,
    options: FilterOption[]
  ): FilterGroup => ({
    key: 'sort',
    label: 'Sort By',
    currentValue,
    options,
    onChange,
  });

  const createPlatformGroup = (
    currentValue: string,
    onChange: (value: string) => void,
    options: FilterOption[]
  ): FilterGroup => ({
    key: 'platform',
    label: 'Platform',
    currentValue,
    options,
    onChange,
  });

  const createStatusGroup = (
    currentValue: string,
    onChange: (value: string) => void,
    options: FilterOption[]
  ): FilterGroup => ({
    key: 'status',
    label: 'Status',
    currentValue,
    options,
    onChange,
  });

  const createCategoryGroup = (
    currentValue: string,
    onChange: (value: string) => void,
    options: FilterOption[]
  ): FilterGroup => ({
    key: 'category',
    label: 'Category',
    currentValue,
    options,
    onChange,
  });

  return {
    createSortGroup,
    createPlatformGroup,
    createStatusGroup,
    createCategoryGroup,
  };
}