'use client';

import { InsightView } from './InsightCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Filter configuration
const statusFilters = [
  { key: 'all', label: 'All Insights', count: (insights: InsightView[]) => insights.length },
  { key: 'needs_review', label: 'Needs Review', count: (insights: InsightView[]) => insights.filter(i => i.status === 'needs_review').length },
  { key: 'approved', label: 'Approved', count: (insights: InsightView[]) => insights.filter(i => i.status === 'approved').length },
  { key: 'rejected', label: 'Rejected', count: (insights: InsightView[]) => insights.filter(i => i.status === 'rejected').length },
  { key: 'archived', label: 'Archived', count: (insights: InsightView[]) => insights.filter(i => i.status === 'archived').length }
];

interface InsightsStatusTabsProps {
  activeFilter: string;
  insights: InsightView[];
  onFilterChange: (filter: string) => void;
}

export function InsightsStatusTabs({ activeFilter, insights, onFilterChange }: InsightsStatusTabsProps) {
  return (
    <div className="mb-6">
      <Tabs value={activeFilter} onValueChange={onFilterChange}>
        <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/30 rounded-lg border border-border">
          {statusFilters.map((filter) => (
            <TabsTrigger 
              key={filter.key} 
              value={filter.key}
              className="flex items-center gap-2 whitespace-nowrap px-4 py-3 rounded-md font-medium text-sm transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border hover:bg-background/50 hover:text-foreground/80"
            >
              {filter.label}
              <Badge 
                variant={activeFilter === filter.key ? "default" : "secondary"} 
                className={`text-xs font-semibold ${
                  activeFilter === filter.key 
                    ? "bg-primary/10 text-primary border-primary/20" 
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {filter.count(insights)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}