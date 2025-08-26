'use client';

import React, { useMemo } from 'react';
import { format, isToday, setHours, setMinutes, setSeconds } from 'date-fns';
import { useCalendar } from './CalendarContext';
import { CalendarColumn } from './CalendarColumn';

/**
 * DayView component - displays a single day with hourly time slots
 * Detailed view for focusing on a specific day
 */
export function DayView() {
  const { state } = useCalendar();
  
  // Generate hours array (24 hours)
  const hours = useMemo(() => 
    Array.from({ length: 24 }, (_, i) => i), 
    []
  );

  // Get current day info
  const currentDay = useMemo(() => {
    const day = state.currentDate;
    return {
      date: day,
      dayName: format(day, 'EEEE'),
      dayNumber: format(day, 'd'),
      monthYear: format(day, 'MMMM yyyy'),
      isToday: isToday(day)
    };
  }, [state.currentDate]);

  // Format time display
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12:00 AM';
    if (hour === 12) return '12:00 PM';
    if (hour < 12) return `${hour}:00 AM`;
    return `${hour - 12}:00 PM`;
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Day Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentDay.dayName}
              </h2>
              <p className="text-sm text-gray-600">
                {currentDay.monthYear}
              </p>
            </div>
            <div className={`
              flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold
              ${currentDay.isToday 
                ? 'bg-blue-600 text-white' 
                : 'bg-white border-2 border-gray-300 text-gray-900'
              }
            `}>
              {currentDay.dayNumber}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Time Slots */}
        <div className="max-w-4xl mx-auto relative">
          {hours.map((hour) => {
            const timeSlot = setSeconds(setMinutes(setHours(currentDay.date, hour), 0), 0);
            
            return (
              <div key={hour} className="flex border-b border-gray-100">
                {/* Hour Label */}
                <div className="w-24 flex-shrink-0 p-4 text-right border-r border-gray-200">
                  <span className="text-sm text-gray-500 font-medium">
                    {formatHour(hour)}
                  </span>
                </div>
                
                {/* Time Slot Content */}
                <div className="flex-1 min-h-[80px]">
                  <CalendarColumn
                    date={timeSlot}
                    hour={hour}
                    isToday={currentDay.isToday}
                    className="border-r-0 min-h-[80px]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}