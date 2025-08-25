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
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Left side - Bulk Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedPosts.length > 0 && (
              <>
                <span className="text-sm font-medium text-gray-700">
                  {selectedPosts.length} selected
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              onClick={onToggleFilters}
              variant={showFilters ? "default" : "outline"}
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}