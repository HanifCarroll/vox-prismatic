'use client';

import { Filter } from 'lucide-react';
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
            <Input
              type="text"
              placeholder="Search insights..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-64"
            />
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