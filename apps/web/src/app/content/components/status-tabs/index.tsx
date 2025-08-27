'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export interface StatusFilter<T> {
  key: string;
  label: string;
  count: (items: T[]) => number;
}

export interface StatusTabsProps<T> {
  activeFilter: string;
  items: T[];
  filters: StatusFilter<T>[];
  onFilterChange: (filter: string) => void;
  layout?: 'grid' | 'scroll' | 'auto'; // Layout preference
  className?: string;
}

export function StatusTabs<T>({
  activeFilter,
  items,
  filters,
  onFilterChange,
  layout = 'auto',
  className = ''
}: StatusTabsProps<T>) {
  // Determine layout based on number of filters if 'auto'
  const effectiveLayout = layout === 'auto' 
    ? (filters.length <= 4 ? 'grid' : 'scroll') 
    : layout;

  // Map filter count to proper grid classes (ensures Tailwind includes these classes)
  const getGridCols = (count: number) => {
    switch (count) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      case 5: return 'grid-cols-5';
      case 6: return 'grid-cols-6';
      default: return 'grid-cols-4'; // fallback
    }
  };

  const tabsListClass = effectiveLayout === 'grid'
    ? `grid ${getGridCols(filters.length)} h-auto p-1 bg-gray-50 rounded-lg border border-gray-200 w-full`
    : 'flex h-auto p-1 bg-gray-50 rounded-lg border border-gray-200 w-max min-w-full';

  const triggerClass = effectiveLayout === 'grid'
    ? 'flex items-center gap-2 whitespace-nowrap px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 text-gray-700 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 hover:bg-gray-100 hover:text-gray-900'
    : 'flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 text-gray-700 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 hover:bg-gray-100 hover:text-gray-900 flex-shrink-0';

  const badgeClass = effectiveLayout === 'grid'
    ? 'text-xs font-semibold'
    : 'text-[10px] sm:text-xs font-semibold px-1 sm:px-1.5 h-4 sm:h-5 min-w-[18px] flex items-center justify-center';

  return (
    <div className={`mb-6 w-full ${className}`}>
      <Tabs value={activeFilter} onValueChange={onFilterChange} className="w-full">
        {effectiveLayout === 'scroll' ? (
          <div className="overflow-x-auto scrollbar-custom scrollbar-hide-mobile pb-1">
            <TabsList className={tabsListClass}>
              {filters.map((filter) => (
                <TabsTrigger 
                  key={filter.key} 
                  value={filter.key}
                  className={triggerClass}
                >
                  <span>{filter.label}</span>
                  <Badge 
                    variant={activeFilter === filter.key ? "default" : "secondary"} 
                    className={`${badgeClass} ${
                      activeFilter === filter.key 
                        ? "bg-blue-600 text-white border-blue-700" 
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {filter.count(items)}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        ) : (
          <TabsList className={tabsListClass}>
            {filters.map((filter) => (
              <TabsTrigger 
                key={filter.key} 
                value={filter.key}
                className={triggerClass}
              >
                {filter.label}
                <Badge 
                  variant={activeFilter === filter.key ? "default" : "secondary"} 
                  className={`${badgeClass} ${
                    activeFilter === filter.key 
                      ? "bg-blue-600 text-white border-blue-700" 
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {filter.count(items)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        )}
      </Tabs>
    </div>
  );
}

export default StatusTabs;