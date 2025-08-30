
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { X, Filter, RotateCcw } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface MobileFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: {
    status?: string;
    category?: string;
    postType?: string;
    platform?: string;
    scoreRange?: [number, number];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => void;
  filters: {
    status?: string;
    category?: string;
    postType?: string;
    platform?: string;
    scoreRange?: [number, number];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  filterOptions: {
    statuses?: FilterOption[];
    categories?: FilterOption[];
    postTypes?: FilterOption[];
    platforms?: FilterOption[];
    sortOptions?: FilterOption[];
  };
  showScoreFilter?: boolean;
  className?: string;
}

/**
 * Full-screen mobile filter modal
 * Touch-optimized controls for filtering content
 */
export function MobileFilters({
  isOpen,
  onClose,
  onApply,
  filters: initialFilters,
  filterOptions,
  showScoreFilter = false,
  className,
}: MobileFiltersProps) {
  // Local state for filter values
  const [localFilters, setLocalFilters] = useState(initialFilters);

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(initialFilters);
    }
  }, [isOpen, initialFilters]);

  const handleReset = () => {
    setLocalFilters({
      status: 'all',
      category: 'all',
      postType: 'all',
      platform: 'all',
      scoreRange: [0, 20],
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const hasActiveFilters = () => {
    return (
      localFilters.status !== 'all' ||
      localFilters.category !== 'all' ||
      localFilters.postType !== 'all' ||
      localFilters.platform !== 'all' ||
      (localFilters.scoreRange && 
        (localFilters.scoreRange[0] !== 0 || localFilters.scoreRange[1] !== 20))
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          "fixed inset-0 z-50 bg-white p-0 m-0 max-w-none rounded-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          "duration-300",
          className
        )}
      >
        <DialogHeader className="sticky top-0 bg-white border-b z-10 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </button>
            
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Filters
            </DialogTitle>
            
            <button
              onClick={handleReset}
              disabled={!hasActiveFilters()}
              className={cn(
                "p-2 -mr-2 text-gray-500 transition-colors",
                hasActiveFilters() && "hover:text-gray-700",
                !hasActiveFilters() && "opacity-50 cursor-not-allowed"
              )}
            >
              <RotateCcw className="h-5 w-5" />
              <span className="sr-only">Reset</span>
            </button>
          </div>
          <DialogDescription className="sr-only">
            Filter content by various criteria
          </DialogDescription>
        </DialogHeader>

          {/* Filter Content */}
          <div className="overflow-y-auto overscroll-contain px-4 py-6 space-y-6">
            {/* Status Filter */}
            {filterOptions.statuses && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Status</Label>
                <RadioGroup
                  value={localFilters.status || 'all'}
                  onValueChange={(value) => 
                    setLocalFilters({ ...localFilters, status: value })
                  }
                >
                  {filterOptions.statuses.map((option) => (
                    <div key={option.value} className="flex items-center justify-between py-2">
                      <label
                        htmlFor={`status-${option.value}`}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={`status-${option.value}`}
                        />
                        <span className="text-base">{option.label}</span>
                      </label>
                      {option.count !== undefined && (
                        <span className="text-sm text-gray-500">
                          {option.count}
                        </span>
                      )}
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Category Filter */}
            {filterOptions.categories && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Category</Label>
                <RadioGroup
                  value={localFilters.category || 'all'}
                  onValueChange={(value) => 
                    setLocalFilters({ ...localFilters, category: value })
                  }
                >
                  {filterOptions.categories.map((option) => (
                    <div key={option.value} className="flex items-center justify-between py-2">
                      <label
                        htmlFor={`category-${option.value}`}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={`category-${option.value}`}
                        />
                        <span className="text-base">{option.label}</span>
                      </label>
                      {option.count !== undefined && (
                        <span className="text-sm text-gray-500">
                          {option.count}
                        </span>
                      )}
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Post Type Filter */}
            {filterOptions.postTypes && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Post Type</Label>
                <RadioGroup
                  value={localFilters.postType || 'all'}
                  onValueChange={(value) => 
                    setLocalFilters({ ...localFilters, postType: value })
                  }
                >
                  {filterOptions.postTypes.map((option) => (
                    <div key={option.value} className="flex items-center justify-between py-2">
                      <label
                        htmlFor={`postType-${option.value}`}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={`postType-${option.value}`}
                        />
                        <span className="text-base">{option.label}</span>
                      </label>
                      {option.count !== undefined && (
                        <span className="text-sm text-gray-500">
                          {option.count}
                        </span>
                      )}
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Platform Filter */}
            {filterOptions.platforms && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Platform</Label>
                <RadioGroup
                  value={localFilters.platform || 'all'}
                  onValueChange={(value) => 
                    setLocalFilters({ ...localFilters, platform: value })
                  }
                >
                  {filterOptions.platforms.map((option) => (
                    <div key={option.value} className="flex items-center justify-between py-2">
                      <label
                        htmlFor={`platform-${option.value}`}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={`platform-${option.value}`}
                        />
                        <span className="text-base">{option.label}</span>
                      </label>
                      {option.count !== undefined && (
                        <span className="text-sm text-gray-500">
                          {option.count}
                        </span>
                      )}
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Score Range Filter */}
            {showScoreFilter && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Score Range ({localFilters.scoreRange?.[0]} - {localFilters.scoreRange?.[1]})
                </Label>
                <div className="px-2 py-4">
                  <Slider
                    value={localFilters.scoreRange || [0, 20]}
                    onValueChange={(value) => 
                      setLocalFilters({ ...localFilters, scoreRange: value as [number, number] })
                    }
                    min={0}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Sort Options */}
            {filterOptions.sortOptions && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Sort By</Label>
                <RadioGroup
                  value={`${localFilters.sortBy}-${localFilters.sortOrder}`}
                  onValueChange={(value) => {
                    const [field, order] = value.split('-');
                    setLocalFilters({ 
                      ...localFilters, 
                      sortBy: field,
                      sortOrder: order as 'asc' | 'desc'
                    });
                  }}
                >
                  {filterOptions.sortOptions.map((option) => (
                    <div key={option.value} className="flex items-center py-2">
                      <RadioGroupItem
                        value={option.value}
                        id={`sort-${option.value}`}
                      />
                      <label
                        htmlFor={`sort-${option.value}`}
                        className="ml-3 text-base cursor-pointer flex-1"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t px-4 py-3">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={handleApply}
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
            
            {/* Safe area padding for iOS */}
            <div className="pb-safe" />
          </div>
      </DialogContent>
    </Dialog>
  );
}