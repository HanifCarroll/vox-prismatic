
import React from 'react';
import { format, startOfISOWeek, endOfISOWeek, getMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useURLView, useURLDate, useURLFilters } from './URLStateManager';
import { useSchedulerEvents } from '../store/scheduler-store';
import { Platform } from '@/types';
import type { CalendarView } from '@/types/scheduler';

export function CalendarHeader() {
  const { view, updateView } = useURLView();
  const { date, updateDate } = useURLDate();
  const { filters, updateFilters, resetFilters } = useURLFilters();
  const events = useSchedulerEvents();

  // Navigation functions
  const navigatePrevious = () => {
    switch (view) {
      case 'day':
        updateDate(subDays(date, 1));
        break;
      case 'week':
        updateDate(subWeeks(date, 1));
        break;
      case 'month':
        updateDate(subMonths(date, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (view) {
      case 'day':
        updateDate(addDays(date, 1));
        break;
      case 'week':
        updateDate(addWeeks(date, 1));
        break;
      case 'month':
        updateDate(addMonths(date, 1));
        break;
    }
  };

  const navigateToday = () => {
    updateDate(new Date());
  };

  // Format the display title based on current view
  const getDisplayTitle = (): string => {
    const current = date;
    
    switch (view) {
      case 'day':
        return format(current, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfISOWeek(current);
        const weekEnd = endOfISOWeek(current);
        if (getMonth(weekStart) === getMonth(weekEnd)) {
          return `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'd, yyyy')}`;
        } else {
          return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
        }
      case 'month':
        return format(current, 'MMMM yyyy');
      default:
        return format(current, 'MMMM yyyy');
    }
  };

  // Handle view change
  const handleViewChange = (view: CalendarView) => {
    updateView(view);
  };

  // Handle platform filter toggle
  const handlePlatformToggle = (platform: Platform) => {
    const currentPlatforms = filters.platforms || [];
    const updatedPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter(p => p !== platform)
      : [...currentPlatforms, platform];
    
    updateFilters({
      platforms: updatedPlatforms
    });
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    updateFilters({
      status: status as any
    });
  };

  // Platform configuration
  const platforms: { 
    value: Platform; 
    label: string; 
    filledIcon: React.ReactNode;
    outlineIcon: React.ReactNode;
  }[] = [
    { 
      value: Platform.LINKEDIN, 
      label: 'LinkedIn',
      filledIcon: (
        <div className="w-6 h-6 bg-blue-600 text-white rounded p-1 inline-flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </div>
      ),
      outlineIcon: (
        <div className="w-6 h-6 border border-gray-300 text-gray-400 rounded p-1 inline-flex items-center justify-center bg-gray-50 flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </div>
      )
    },
    { 
      value: Platform.X, 
      label: 'X',
      filledIcon: (
        <div className="w-6 h-6 bg-gray-900 text-white rounded p-1 inline-flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
      ),
      outlineIcon: (
        <div className="w-6 h-6 border border-gray-300 text-gray-400 rounded p-1 inline-flex items-center justify-center bg-gray-50 flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.80l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
      )
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      {/* Top Row: Title and View Controls - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        {/* Navigation and Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={navigatePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={navigateNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToday}
            >
              Today
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-gray-500" />
            <h1 className="text-xl font-semibold text-gray-900">
              {getDisplayTitle()}
            </h1>
          </div>
        </div>

        {/* View Selector */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-1">
            {(['day', 'week', 'month'] as CalendarView[]).map((viewOption) => (
              <Button
                key={viewOption}
                variant={view === viewOption ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange(viewOption)}
                className={`
                  px-3 py-1.5 text-sm capitalize
                  ${view === viewOption 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                {viewOption}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()} // Simple refresh for now
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bottom Row: Filters - Responsive */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Platform Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Platforms:</span>
            <div className="flex gap-2">
              {platforms.map((platform) => {
                const isSelected = filters.platforms?.includes(platform.value) ?? true;
                return (
                  <Button
                    key={platform.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlatformToggle(platform.value)}
                    className="p-1 h-8 w-8 hover:bg-gray-100"
                    title={platform.label}
                  >
                    {isSelected ? platform.filledIcon : platform.outlineIcon}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <Select
              value={filters.status || 'all'}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-32 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-white border shadow-lg">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Total Events:</span>
            <Badge variant="secondary">{events.length}</Badge>
          </div>
          
          {/* Error handling removed - handled by window.location.reload() now */}
        </div>
      </div>
    </div>
  );
}