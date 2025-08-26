'use client';

import React, { useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isBefore, 
  addDays, 
  isSameDay, 
  getMonth 
} from 'date-fns';
import { useCalendar } from './CalendarContext';
import { CalendarColumn } from './CalendarColumn';
import type { CalendarEvent } from '@/types';

/**
 * MonthView component - displays a month grid with daily summaries
 * Overview for seeing the entire month at a glance
 */
export function MonthView() {
  const { state } = useCalendar();
  
  // Day names for header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Generate calendar grid for the month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(state.currentDate);
    const monthEnd = endOfMonth(state.currentDate);
    const calendarStart = startOfWeek(monthStart); // Start from Sunday of first week
    const calendarEnd = endOfWeek(monthEnd); // End at Saturday of last week
    
    const days = [];
    let currentDay = calendarStart;
    
    while (isSameDay(currentDay, calendarEnd) || isBefore(currentDay, calendarEnd)) {
      const isCurrentMonth = getMonth(currentDay) === getMonth(monthStart);
      const isCurrentDay = isSameDay(currentDay, state.today);
      const isPast = isBefore(currentDay, new Date());
      
      // Get events for this day
      const dayEvents = state.events.filter((event: CalendarEvent) => {
        const eventDay = new Date(event.scheduledTime);
        return isSameDay(eventDay, currentDay);
      });
      
      days.push({
        date: currentDay,
        dayNumber: currentDay.getDate(),
        isCurrentMonth,
        isToday: isCurrentDay,
        isPast,
        events: dayEvents
      });
      
      currentDay = addDays(currentDay, 1);
    }
    
    return days;
  }, [state.currentDate, state.events, state.today]);

  // Group days into weeks
  const weeks = useMemo(() => {
    const weekGroups = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weekGroups.push(calendarDays.slice(i, i + 7));
    }
    return weekGroups;
  }, [calendarDays]);

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto">
          {/* Calendar Grid */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header with day names */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {dayNames.map((dayName) => (
                <div
                  key={dayName}
                  className="p-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide"
                >
                  {dayName}
                </div>
              ))}
            </div>
            
            {/* Calendar weeks */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7">
                {week.map((day) => (
                  <div
                    key={day.date.getTime()}
                    className={`
                      min-h-[120px] border-r border-b border-gray-200 relative
                      ${!day.isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
                      ${day.isToday ? 'bg-blue-50' : ''}
                    `}
                  >
                    {/* Day number */}
                    <div className="p-2">
                      <div className={`
                        inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-full
                        ${day.isToday 
                          ? 'bg-blue-600 text-white' 
                          : day.isCurrentMonth 
                            ? 'text-gray-900 hover:bg-gray-100' 
                            : 'text-gray-400'
                        }
                        ${!day.isPast && day.isCurrentMonth ? 'cursor-pointer' : ''}
                      `}>
                        {day.dayNumber}
                      </div>
                    </div>
                    
                    {/* Events for this day using CalendarColumn */}
                    <div className="absolute inset-0 pt-12">
                      <CalendarColumn
                        date={new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), 12)} // Use noon as default time for month view
                        isToday={day.isToday}
                        className="h-full border-0 rounded-none"
                      />
                    </div>
                    
                    {/* Event count indicator */}
                    {day.events.length > 3 && (
                      <div className="absolute bottom-1 right-1">
                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-gray-600 text-white rounded-full">
                          +{day.events.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Month view legend */}
          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>LinkedIn</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
              <span>X (Twitter)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}