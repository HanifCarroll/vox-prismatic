'use client';

import { Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface InsightsActionBarProps {
  selectedInsights: string[];
  searchQuery: string;
  showFilters: boolean;
  onBulkAction: (action: string) => void;
  onSearchChange: (query: string) => void;
  onToggleFilters: () => void;
}

export function InsightsActionBar({
  selectedInsights,
  searchQuery,
  showFilters,
  onBulkAction,
  onSearchChange,
  onToggleFilters
}: InsightsActionBarProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Left side - Bulk Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedInsights.length > 0 && (
              <>
                <span className="text-sm font-medium text-gray-700">
                  {selectedInsights.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => onBulkAction('approve')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve Selected
                  </Button>
                  <Button
                    onClick={() => onBulkAction('reject')}
                    size="sm"
                    variant="destructive"
                  >
                    Reject Selected
                  </Button>
                  <Button
                    onClick={() => onBulkAction('archive')}
                    size="sm"
                    variant="secondary"
                  >
                    Archive Selected
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Right side - Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="relative max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search by title, summary, or category..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full min-w-[280px] border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg shadow-sm text-sm placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <Button
              onClick={onToggleFilters}
              variant={showFilters ? "default" : "outline"}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}