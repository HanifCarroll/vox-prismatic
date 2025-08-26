'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter } from 'lucide-react';

interface PostsActionBarProps {
  selectedPosts: string[];
  searchQuery: string;
  showFilters: boolean;
  onBulkAction: (action: string) => void;
  onSearchChange: (query: string) => void;
  onToggleFilters: () => void;
}

export function PostsActionBar({
  selectedPosts,
  searchQuery,
  showFilters,
  onBulkAction,
  onSearchChange,
  onToggleFilters
}: PostsActionBarProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search and Filters Row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Button
              onClick={onToggleFilters}
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="w-full sm:w-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Bulk Actions - Only show when items are selected */}
          {selectedPosts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 pt-2 border-t">
              <span className="text-sm font-medium text-gray-700">
                {selectedPosts.length} selected
              </span>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => onBulkAction('approve')}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Approve Selected</span>
                  <span className="sm:hidden">Approve</span>
                </Button>
                <Button
                  onClick={() => onBulkAction('reject')}
                  size="sm"
                  variant="destructive"
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Reject Selected</span>
                  <span className="sm:hidden">Reject</span>
                </Button>
                <Button
                  onClick={() => onBulkAction('archive')}
                  size="sm"
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Archive Selected</span>
                  <span className="sm:hidden">Archive</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}