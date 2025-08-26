'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronDown, 
  CheckSquare, 
  Square, 
  Filter,
  Calendar,
  Hash,
  RefreshCw
} from 'lucide-react';

interface SmartSelectionProps {
  totalItems: number;
  selectedCount: number;
  filteredCount: number;
  onSelectAll: (selected: boolean) => void;
  onSelectFiltered: () => void;
  onSelectByStatus?: (status: string) => void;
  onSelectByPlatform?: (platform: string) => void;
  onInvertSelection?: () => void;
  onSelectDateRange?: (start: Date, end: Date) => void;
  statuses?: string[];
  platforms?: string[];
}

export function SmartSelection({
  totalItems,
  selectedCount,
  filteredCount,
  onSelectAll,
  onSelectFiltered,
  onSelectByStatus,
  onSelectByPlatform,
  onInvertSelection,
  onSelectDateRange,
  statuses = [],
  platforms = []
}: SmartSelectionProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const allSelected = selectedCount === totalItems && totalItems > 0;
  const someSelected = selectedCount > 0 && selectedCount < totalItems;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleMenuItemClick = (callback: () => void) => {
    callback();
    setShowDropdown(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Main selection checkbox */}
      <Checkbox
        checked={allSelected}
        onCheckedChange={onSelectAll}
        aria-label="Select all items"
        className="data-[state=checked]:bg-blue-600"
        data-state={someSelected && !allSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
      />
      
      {/* Selection count */}
      {selectedCount > 0 && (
        <span className="text-sm text-gray-600 font-medium">
          {selectedCount} selected
        </span>
      )}

      {/* Smart selection dropdown */}
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <Filter className="h-3 w-3" />
          Smart Select
          <ChevronDown className={`h-3 w-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </Button>

        {showDropdown && (
          <div className="absolute z-50 mt-1 w-56 rounded-md border bg-white shadow-lg">
            <div className="py-1">
              {/* Basic selections */}
              <button
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                onClick={() => handleMenuItemClick(() => onSelectAll(true))}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All ({totalItems})
              </button>
              
              <button
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                onClick={() => handleMenuItemClick(() => onSelectAll(false))}
              >
                <Square className="h-4 w-4 mr-2" />
                Deselect All
              </button>
              
              {filteredCount < totalItems && (
                <button
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => handleMenuItemClick(onSelectFiltered)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Select All Filtered ({filteredCount})
                </button>
              )}
              
              {onInvertSelection && (
                <button
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => handleMenuItemClick(onInvertSelection)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Invert Selection
                </button>
              )}

              {/* Status-based selection */}
              {onSelectByStatus && statuses.length > 0 && (
                <>
                  <div className="my-1 border-t" />
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500">
                    By Status
                  </div>
                  {statuses.map(status => (
                    <button
                      key={status}
                      className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={() => handleMenuItemClick(() => onSelectByStatus(status))}
                    >
                      <Hash className="h-4 w-4 mr-2" />
                      Select all "{status}"
                    </button>
                  ))}
                </>
              )}

              {/* Platform-based selection */}
              {onSelectByPlatform && platforms.length > 0 && (
                <>
                  <div className="my-1 border-t" />
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500">
                    By Platform
                  </div>
                  {platforms.map(platform => (
                    <button
                      key={platform}
                      className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={() => handleMenuItemClick(() => onSelectByPlatform(platform))}
                    >
                      <Hash className="h-4 w-4 mr-2" />
                      Select all {platform}
                    </button>
                  ))}
                </>
              )}

              {/* Date range selection */}
              {onSelectDateRange && (
                <>
                  <div className="my-1 border-t" />
                  <button
                    className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => handleMenuItemClick(() => {
                      const today = new Date();
                      const weekAgo = new Date(today);
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      onSelectDateRange(weekAgo, today);
                    })}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Last 7 days
                  </button>
                  <button
                    className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => handleMenuItemClick(() => {
                      const today = new Date();
                      const monthAgo = new Date(today);
                      monthAgo.setMonth(monthAgo.getMonth() - 1);
                      onSelectDateRange(monthAgo, today);
                    })}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Last 30 days
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}