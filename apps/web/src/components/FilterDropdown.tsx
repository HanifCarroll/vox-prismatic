import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Filter, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  currentValue: string[];  // Always use arrays for multi-select
  onChange: (value: string[]) => void;
}

interface FilterDropdownProps {
  filterGroups: FilterGroup[];
  onClearAll?: () => void;
  className?: string;
}

export function FilterDropdown({ filterGroups, onClearAll, className = '' }: FilterDropdownProps) {
  // Count active filters (excluding 'all' values)
  const activeFilterCount = useMemo(() => {
    return filterGroups.reduce((count, group) => {
      const selectedCount = group.currentValue.filter(v => v !== 'all').length;
      return count + (selectedCount > 0 ? 1 : 0);
    }, 0);
  }, [filterGroups]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`gap-1.5 h-8 hover:bg-gray-50 ${className}`} size="sm">
          <Filter className="h-3.5 w-3.5" />
          <span className="text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-medium">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Header with clear button */}
        {activeFilterCount > 0 && (
          <>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-medium">Active Filters</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-6 px-2 text-xs"
              >
                Clear All
              </Button>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Filter groups */}
        {filterGroups.map((group, index) => (
          <div key={group.key}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-gray-500">
              {group.label}
            </DropdownMenuLabel>
            {group.options.map((option) => {
              const isAll = option.value === 'all';
              const isChecked = group.currentValue.includes(option.value);
              
              return (
                <DropdownMenuCheckboxItem
                  key={`${group.key}-${option.value}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    if (isAll) {
                      // Clear all selections when "All" is clicked
                      group.onChange([]);
                    } else {
                      // Toggle the value in the array
                      const newValues = checked
                        ? [...group.currentValue, option.value]
                        : group.currentValue.filter(v => v !== option.value);
                      group.onChange(newValues);
                    }
                  }}
                  className="gap-2"
                >
                  <span className="flex-1">{option.label}</span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </div>
        ))}

        {/* No filters message */}
        {filterGroups.length === 0 && (
          <div className="px-2 py-8 text-center text-sm text-gray-500">
            No filters available for this view
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}