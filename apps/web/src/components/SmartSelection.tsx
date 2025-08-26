'use client';

import { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const allSelected = selectedCount === totalItems && totalItems > 0;
  const someSelected = selectedCount > 0 && selectedCount < totalItems;
  const filteredSelected = selectedCount === filteredCount && filteredCount > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Main selection checkbox */}
      <Checkbox
        checked={allSelected}
        onCheckedChange={onSelectAll}
        aria-label="Select all items"
        className="data-[state=checked]:bg-blue-600"
        // Add indeterminate state visual
        data-state={someSelected && !allSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
      />
      
      {/* Selection count */}
      {selectedCount > 0 && (
        <span className="text-sm text-gray-600 font-medium">
          {selectedCount} selected
        </span>
      )}

      {/* Smart selection dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            <Filter className="h-3 w-3" />
            Smart Select
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* Basic selections */}
          <DropdownMenuItem onClick={() => onSelectAll(true)}>
            <CheckSquare className="h-4 w-4 mr-2" />
            Select All ({totalItems})
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => onSelectAll(false)}>
            <Square className="h-4 w-4 mr-2" />
            Deselect All
          </DropdownMenuItem>
          
          {filteredCount < totalItems && (
            <DropdownMenuItem onClick={onSelectFiltered}>
              <Filter className="h-4 w-4 mr-2" />
              Select All Filtered ({filteredCount})
            </DropdownMenuItem>
          )}
          
          {onInvertSelection && (
            <DropdownMenuItem onClick={onInvertSelection}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Invert Selection
            </DropdownMenuItem>
          )}

          {/* Status-based selection */}
          {onSelectByStatus && statuses.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                By Status
              </div>
              {statuses.map(status => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => onSelectByStatus(status)}
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Select all "{status}"
                </DropdownMenuItem>
              ))}
            </>
          )}

          {/* Platform-based selection */}
          {onSelectByPlatform && platforms.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                By Platform
              </div>
              {platforms.map(platform => (
                <DropdownMenuItem
                  key={platform}
                  onClick={() => onSelectByPlatform(platform)}
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Select all {platform}
                </DropdownMenuItem>
              ))}
            </>
          )}

          {/* Date range selection */}
          {onSelectDateRange && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today);
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  onSelectDateRange(weekAgo, today);
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Last 7 days
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const today = new Date();
                  const monthAgo = new Date(today);
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  onSelectDateRange(monthAgo, today);
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Last 30 days
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}