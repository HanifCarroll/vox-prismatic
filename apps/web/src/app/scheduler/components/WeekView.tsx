'use client';

import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { useCalendar } from './CalendarContext';
import { CalendarColumn } from './CalendarColumn';

/**
 * WeekView component - displays 7 days with hourly time slots
 * Main view for the calendar scheduler
 */
export function WeekView() {
  const { state } = useCalendar();
  
  // Generate hours array (24 hours)
  const hours = useMemo(() => 
    Array.from({ length: 24 }, (_, i) => i), 
    []
  );

  // Generate days array for the week
  const days = useMemo(() => {
    const weekDays = [];
    const startDate = dayjs(state.startDate);
    
    for (let i = 0; i < 7; i++) {
      const day = startDate.add(i, 'day');
      weekDays.push({
        date: day.toDate(),
        dayjs: day,
        dayName: day.format('ddd'),
        dayNumber: day.format('D'),
        isToday: day.isSame(dayjs(), 'day'),
        isCurrentMonth: day.isSame(state.currentDate, 'month')
      });
    }
    
    return weekDays;
  }, [state.startDate, state.currentDate]);

  // Format time display
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 overflow-auto">
        {/* Calendar Grid - Responsive */}
        <div className="grid grid-cols-[60px_repeat(7,_1fr)] md:grid-cols-[80px_repeat(7,_1fr)] gap-0 relative">
          {/* Header Row */}
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-20">
            {/* Empty corner cell */}
            <div className="h-16 border-r border-gray-200" />
          </div>
          
          {/* Day Headers */}
          {days.map((day) => (
            <div
              key={day.date.getTime()}
              className={`
                sticky top-0 h-16 bg-gray-50 border-b border-r border-gray-200 z-20
                flex flex-col items-center justify-center text-center
                ${day.isToday ? 'bg-blue-50' : ''}
              `}
            >
              <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                day.isToday ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {day.dayName}
              </div>
              <div className={`text-lg font-semibold ${
                day.isToday 
                  ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center' 
                  : day.isCurrentMonth 
                    ? 'text-gray-900' 
                    : 'text-gray-400'
              }`}>
                {day.dayNumber}
              </div>
            </div>
          ))}

          {/* Time Slots */}
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              {/* Hour Label */}
              <div className="min-h-20 border-r border-gray-200 flex items-start justify-end pr-2 pt-2">
                <span className="text-xs text-gray-500 font-medium">
                  {formatHour(hour)}
                </span>
              </div>
              
              {/* Time Slot Columns for each day */}
              {days.map((day) => {
                const timeSlot = day.dayjs.hour(hour).minute(0).second(0);
                return (
                  <CalendarColumn
                    key={`${day.date.getTime()}-${hour}`}
                    date={timeSlot.toDate()}
                    hour={hour}
                    isToday={day.isToday}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}