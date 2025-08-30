
import { useState, useCallback } from "react";
import type { FilterConfig } from "./views/config";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  Trash2, 
  CheckCircle, 
  XCircle,
  Sparkles,
  Calendar,
  CheckSquare,
  Square,
  RotateCcw
} from "lucide-react";
import { VIEW_CONFIGS } from "./views/config";
import type { ContentView, ActionConfig } from "./views/config";

interface ContentFiltersProps {
  view: ContentView;
  filters: Record<string, string | undefined>;
  onFilterChange: (key: string, value: string | null) => void;
  selectedItems: string[];
  onSelectionAction: (action: string) => void;
  onBulkAction: (action: string, items: string[]) => void;
  availableBulkActions: ActionConfig[];
}

export default function ContentFilters({
  view,
  filters,
  onFilterChange,
  selectedItems,
  onSelectionAction,
  onBulkAction,
  availableBulkActions
}: ContentFiltersProps) {
  const config = VIEW_CONFIGS[view];
  const [localScoreRange, setLocalScoreRange] = useState<[number, number]>([
    filters.scoreMin ? parseInt(filters.scoreMin) : 0,
    filters.scoreMax ? parseInt(filters.scoreMax) : 20
  ]);
  
  // Handle score range change (for insights)
  const handleScoreRangeChange = useCallback((value: number[]) => {
    setLocalScoreRange([value[0], value[1]]);
  }, []);
  
  const handleScoreRangeCommit = useCallback(() => {
    onFilterChange('scoreMin', localScoreRange[0].toString());
    onFilterChange('scoreMax', localScoreRange[1].toString());
  }, [localScoreRange, onFilterChange]);
  
  // Render filter based on type
  const renderFilter = useCallback((filter: FilterConfig) => {
    switch (filter.type) {
      case 'select':
        return (
          <Select 
            key={filter.key}
            value={String(filters[filter.key] || filter.defaultValue || '')} 
            onValueChange={(value) => onFilterChange(filter.key, value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={`Filter by ${filter.label}`} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option: { value: string; label: string }) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'range':
        if (filter.key === 'scoreRange') {
          return (
            <div key={filter.key} className="space-y-2 w-64">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{filter.label}</label>
                <span className="text-sm text-gray-500">
                  {localScoreRange[0]} - {localScoreRange[1]}
                </span>
              </div>
              <Slider
                value={localScoreRange}
                onValueChange={handleScoreRangeChange}
                onValueCommit={handleScoreRangeCommit}
                min={filter.min}
                max={filter.max}
                step={1}
                className="w-full"
              />
            </div>
          );
        }
        return null;
        
      default:
        return null;
    }
  }, [filters, localScoreRange, onFilterChange, handleScoreRangeChange, handleScoreRangeCommit]);
  
  // Get sort options for the view
  const sortOptions = config.columns
    .filter(col => col.sortable)
    .map(col => ({
      value: col.key,
      label: col.label
    }));
  
  const currentSort = filters.sort || config.defaultSort.field;
  const currentOrder = filters.order || config.defaultSort.order;
  
  return (
    <div className="p-4 border-b bg-gray-50 space-y-4">
      {/* Filter Controls */}
      <div className="flex gap-4 flex-wrap items-end">
        {config.filters.map(filter => renderFilter(filter))}
        
        {/* Sort Control */}
        <Select 
          value={`${currentSort}-${currentOrder}`} 
          onValueChange={(value) => {
            const [field, order] = value.split('-');
            onFilterChange('sort', field);
            onFilterChange('order', order);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(option => (
              <>
                <SelectItem key={`${option.value}-asc`} value={`${option.value}-asc`}>
                  {option.label} (↑)
                </SelectItem>
                <SelectItem key={`${option.value}-desc`} value={`${option.value}-desc`}>
                  {option.label} (↓)
                </SelectItem>
              </>
            ))}
          </SelectContent>
        </Select>
        
        {/* Reset Filters */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            // Reset all filters
            config.filters.forEach(filter => {
              if (filter.key === 'scoreRange') {
                onFilterChange('scoreMin', null);
                onFilterChange('scoreMax', null);
                setLocalScoreRange([0, 20]);
              } else {
                onFilterChange(filter.key, null);
              }
            });
          }}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>
      
      {/* Selection Actions */}
      {selectedItems.length > 0 ? (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm font-medium text-gray-700">
            {selectedItems.length} selected:
          </span>
          
          {/* Quick Selection Actions */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onSelectionAction('selectNone')}
            >
              <Square className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onSelectionAction('selectInvert')}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Invert
            </Button>
          </div>
          
          <div className="h-6 w-px bg-gray-300" />
          
          {/* Bulk Actions */}
          <div className="flex gap-2">
            {availableBulkActions.map(action => {
              const Icon = action.icon;
              const isDestructive = action.variant === 'destructive';
              
              return (
                <Button
                  key={action.key}
                  size="sm"
                  variant={action.variant || 'default'}
                  onClick={() => {
                    if (action.requireConfirm) {
                      const message = action.confirmMessage?.replace('{count}', selectedItems.length.toString()) 
                        || `Are you sure you want to ${action.label.toLowerCase()}?`;
                      if (!confirm(message)) return;
                    }
                    onBulkAction(action.key, selectedItems);
                  }}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Quick Selection Shortcuts */}
          <span className="text-sm text-gray-500">Quick select:</span>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onSelectionAction('selectAll')}
          >
            <CheckSquare className="h-4 w-4 mr-1" />
            All
          </Button>
          
          {view === 'transcripts' && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSelectionAction('selectRaw')}
              >
                Raw
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSelectionAction('selectCleaned')}
              >
                Cleaned
              </Button>
            </>
          )}
          
          {view === 'insights' && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSelectionAction('selectPending')}
              >
                Needs Review
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSelectionAction('selectApproved')}
              >
                Approved
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  // Select high score insights
                  onFilterChange('scoreMin', '15');
                  onFilterChange('scoreMax', '20');
                }}
              >
                High Score (15+)
              </Button>
            </>
          )}
          
          {view === 'posts' && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSelectionAction('selectDraft')}
              >
                Draft
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSelectionAction('selectApproved')}
              >
                Approved
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSelectionAction('selectScheduled')}
              >
                Scheduled
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}