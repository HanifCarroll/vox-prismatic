
import { AlertTriangle, BarChart3, Building2, Target, Brain } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const postTypeOptions = [
  { value: 'all', label: 'All Types', icon: null },
  { value: 'Problem', label: 'Problem', icon: AlertTriangle },
  { value: 'Proof', label: 'Proof', icon: BarChart3 },
  { value: 'Framework', label: 'Framework', icon: Building2 },
  { value: 'Contrarian Take', label: 'Contrarian Take', icon: Target },
  { value: 'Mental Model', label: 'Mental Model', icon: Brain }
];

interface InsightsFiltersProps {
  postTypeFilter: string;
  categoryFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  scoreRange: [number, number];
  categories: { value: string; label: string }[];
  onPostTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  onScoreRangeChange: (range: [number, number]) => void;
}

export function InsightsFilters({
  postTypeFilter,
  categoryFilter,
  sortBy,
  sortOrder,
  scoreRange,
  categories,
  onPostTypeChange,
  onCategoryChange,
  onSortChange,
  onScoreRangeChange
}: InsightsFiltersProps) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Post Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Post Type</label>
          <Select value={postTypeFilter} onValueChange={onPostTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select post type" />
            </SelectTrigger>
            <SelectContent>
              {postTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon && <option.icon className="h-4 w-4" />}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [field, order] = value.split('-');
              onSortChange(field, order as 'asc' | 'desc');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="totalScore-desc">Total Score (High to Low)</SelectItem>
              <SelectItem value="totalScore-asc">Total Score (Low to High)</SelectItem>
              <SelectItem value="createdAt-desc">Date Created (Newest)</SelectItem>
              <SelectItem value="createdAt-asc">Date Created (Oldest)</SelectItem>
              <SelectItem value="title-asc">Title (A-Z)</SelectItem>
              <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              <SelectItem value="category-asc">Category (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Score Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Score Range: {scoreRange[0]} - {scoreRange[1]}
          </label>
          <div className="flex gap-2">
            <input
              type="range"
              min="0"
              max="10"
              value={scoreRange[0]}
              onChange={(e) => onScoreRangeChange([parseInt(e.target.value), scoreRange[1]] as [number, number])}
              className="flex-1"
            />
            <input
              type="range"
              min="0"
              max="10"
              value={scoreRange[1]}
              onChange={(e) => onScoreRangeChange([scoreRange[0], parseInt(e.target.value)] as [number, number])}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}