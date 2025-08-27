'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

export interface StatusFilter<T> {
  key: string;
  label: string;
  count: (items: T[]) => number;
  icon?: LucideIcon;
  iconColor?: string;
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
    ? `grid ${getGridCols(filters.length)} h-auto p-2 bg-white rounded-lg border border-gray-200 w-full`
    : 'flex h-auto p-2 bg-white rounded-lg border border-gray-200 w-max min-w-full';

  const triggerClass = effectiveLayout === 'grid'
    ? 'flex items-center gap-2.5 whitespace-nowrap px-4 py-3 rounded-md font-medium text-sm transition-all duration-200 text-gray-700 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border data-[state=active]:border-blue-200 hover:bg-gray-50 hover:text-gray-900 group'
    : 'flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap px-2.5 sm:px-3 py-2.5 sm:py-3 rounded-md font-medium text-xs sm:text-sm transition-all duration-200 text-gray-700 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border data-[state=active]:border-blue-200 hover:bg-gray-50 hover:text-gray-900 flex-shrink-0 group';

  const badgeClass = effectiveLayout === 'grid'
    ? 'text-xs font-bold ml-auto'
    : 'text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 h-5 sm:h-6 min-w-[20px] flex items-center justify-center ml-auto';

  return (
    <div className={`w-full ${className}`}>
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
                  {filter.icon && (
                    <filter.icon 
                      className={`h-4 w-4 transition-colors duration-300 ${
                        activeFilter === filter.key 
                          ? filter.iconColor || 'text-blue-600' 
                          : 'text-gray-500 group-hover:text-gray-700'
                      }`} 
                    />
                  )}
                  <span>{filter.label}</span>
                  <Badge 
                    variant={activeFilter === filter.key ? "default" : "secondary"} 
                    className={`${badgeClass} transition-all duration-200 ${
                      activeFilter === filter.key 
                        ? "bg-blue-100 text-blue-700 border-blue-200" 
                        : "bg-gray-100 text-gray-700 group-hover:bg-gray-200"
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
                {filter.icon && (
                  <filter.icon 
                    className={`h-4 w-4 transition-colors duration-300 ${
                      activeFilter === filter.key 
                        ? filter.iconColor || 'text-blue-600' 
                        : 'text-gray-500 group-hover:text-gray-700'
                    }`} 
                  />
                )}
                <span>{filter.label}</span>
                <Badge 
                  variant={activeFilter === filter.key ? "default" : "secondary"} 
                  className={`${badgeClass} transition-all duration-200 ${
                    activeFilter === filter.key 
                      ? "bg-blue-100 text-blue-700 border-blue-200" 
                      : "bg-gray-100 text-gray-700 group-hover:bg-gray-200"
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