'use client';

import React from 'react';
import dayjs from 'dayjs';
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
import { useCalendar } from './CalendarContext';
import type { CalendarView, Platform } from '@/types/scheduler';

export function CalendarHeader() {
  const { state, actions, filters, setFilters } = useCalendar();

  // Format the display title based on current view
  const getDisplayTitle = (): string => {
    const current = dayjs(state.currentDate);
    
    switch (state.view) {
      case 'day':
        return current.format('dddd, MMMM D, YYYY');
      case 'week':
        const weekStart = dayjs(state.startDate);
        const weekEnd = dayjs(state.endDate);
        if (weekStart.month() === weekEnd.month()) {
          return `${weekStart.format('MMMM D')} - ${weekEnd.format('D, YYYY')}`;
        } else {
          return `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D, YYYY')}`;
        }
      case 'month':
        return current.format('MMMM YYYY');
      default:
        return current.format('MMMM YYYY');
    }
  };

  // Handle view change
  const handleViewChange = (view: CalendarView) => {
    actions.setView(view);
  };

  // Handle platform filter toggle
  const handlePlatformToggle = (platform: Platform) => {
    const currentPlatforms = filters.platforms || [];
    const updatedPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter(p => p !== platform)
      : [...currentPlatforms, platform];
    
    setFilters({
      ...filters,
      platforms: updatedPlatforms
    });
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    setFilters({
      ...filters,
      status: status as any
    });
  };

  // Platform configuration
  const platforms: { value: Platform; label: string; color: string }[] = [
    { value: 'linkedin', label: 'LinkedIn', color: 'bg-blue-500' },
    { value: 'x', label: 'X', color: 'bg-gray-800' }
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
              onClick={actions.navigatePrevious}
              disabled={state.isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={actions.navigateNext}
              disabled={state.isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={actions.navigateToday}
              disabled={state.isLoading}
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
            {(['day', 'week', 'month'] as CalendarView[]).map((view) => (
              <Button
                key={view}
                variant={state.view === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange(view)}
                disabled={state.isLoading}
                className={`
                  px-3 py-1.5 text-sm capitalize
                  ${state.view === view 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                {view}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={actions.refreshEvents}
            disabled={state.isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${state.isLoading ? 'animate-spin' : ''}`} />
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
            <div className="flex gap-1">
              {platforms.map((platform) => {
                const isSelected = filters.platforms?.includes(platform.value) ?? true;
                return (
                  <Button
                    key={platform.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlatformToggle(platform.value)}
                    className={`
                      px-2 py-1 h-7 text-xs
                      ${isSelected 
                        ? 'bg-gray-900 text-white hover:bg-gray-800' 
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className={`w-2 h-2 rounded-full mr-1 ${platform.color}`} />
                    {platform.label}
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
            <Badge variant="secondary">{state.events.length}</Badge>
          </div>
          
          {state.error && (
            <Badge variant="destructive" className="text-xs">
              Error loading events
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}