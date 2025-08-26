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

  const tabsListClass = effectiveLayout === 'grid'
    ? `grid grid-cols-${filters.length} h-auto p-1 bg-muted/30 rounded-lg border border-border w-full`
    : 'flex h-auto p-1 bg-muted/30 rounded-lg border border-border w-max min-w-full';

  const triggerClass = effectiveLayout === 'grid'
    ? 'flex items-center gap-2 whitespace-nowrap px-4 py-3 rounded-md font-medium text-sm transition-all border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-border hover:bg-background/50 hover:text-foreground/80'
    : 'flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-md font-medium text-xs sm:text-sm transition-all border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-border hover:bg-background/50 hover:text-foreground/80 flex-shrink-0';

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
                        ? "bg-primary/10 text-primary border-primary/20" 
                        : "bg-muted text-muted-foreground"
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
                      ? "bg-primary/10 text-primary border-primary/20" 
                      : "bg-muted text-muted-foreground"
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