
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Briefcase, Twitter, Camera, Users, Tv } from 'lucide-react';

const platformOptions = [
  { value: 'all', label: 'All Platforms', icon: Globe },
  { value: 'linkedin', label: 'LinkedIn', icon: Briefcase },
  { value: 'x', label: 'X (Twitter)', icon: Twitter },
  { value: 'instagram', label: 'Instagram', icon: Camera },
  { value: 'facebook', label: 'Facebook', icon: Users },
  { value: 'youtube', label: 'YouTube', icon: Tv }
];

const sortOptions = [
  { value: 'createdAt-desc', label: 'Date Created (Newest)' },
  { value: 'createdAt-asc', label: 'Date Created (Oldest)' },
  { value: 'updatedAt-desc', label: 'Last Updated (Recent)' },
  { value: 'updatedAt-asc', label: 'Last Updated (Oldest)' },
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
  { value: 'platform-asc', label: 'Platform (A-Z)' },
  { value: 'estimatedEngagementScore-desc', label: 'Engagement Score (High to Low)' },
  { value: 'estimatedEngagementScore-asc', label: 'Engagement Score (Low to High)' }
];

interface PostsFiltersProps {
  platformFilter: string;
  sortBy: string;
  onPlatformChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onClearFilters: () => void;
}

export function PostsFilters({
  platformFilter,
  sortBy,
  onPlatformChange,
  onSortChange,
  onClearFilters
}: PostsFiltersProps) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Platform Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
          <Select value={platformFilter} onValueChange={onPlatformChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {platformOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select sort order" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-end">
          <Button
            onClick={onClearFilters}
            variant="outline"
            size="sm"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}