'use client';

import React, { useMemo } from 'react';
import { useDrop } from 'react-dnd';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { useCalendar } from './CalendarContext';
import { CalendarItem } from './CalendarItem';
import type { DragItem, CalendarEvent } from '@/types/scheduler';

interface CalendarColumnProps {
  date: Date;
  hour?: number;
  isToday?: boolean;
  className?: string;
}

/**
 * CalendarColumn component - represents a time slot in the calendar
 * Acts as a drop zone for drag-and-drop operations
 */
export function CalendarColumn({ 
  date, 
  hour, 
  isToday = false,
  className = ''
}: CalendarColumnProps) {
  const { state, actions } = useCalendar();
  
  // Check if this time slot is in the past
  const isPast = useMemo(() => {
    const now = dayjs();
    const slotTime = dayjs(date);
    return slotTime.isBefore(now, 'hour');
  }, [date]);

  // Get events for this time slot
  const eventsForSlot = useMemo(() => {
    const slotStart = dayjs(date);
    const slotEnd = slotStart.add(1, 'hour');
    
    return state.events.filter((event: CalendarEvent) => {
      const eventTime = dayjs(event.scheduledTime);
      return (eventTime.isSame(slotStart) || eventTime.isAfter(slotStart)) && eventTime.isBefore(slotEnd);
    });
  }, [state.events, date]);

  // Drop zone configuration
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'post',
    drop: async (item: DragItem) => {
      if (isPast) return;
      
      try {
        await actions.updateEventDateTime(item.id, date);
      } catch (error) {
        console.error('Failed to reschedule event:', error);
        // TODO: Show error toast/notification
      }
    },
    canDrop: () => !isPast,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Handle click to create new event
  const handleClick = () => {
    if (!isPast) {
      actions.createEvent(date);
    }
  };

  // Calculate drop zone visual state
  const dropZoneClasses = useMemo(() => {
    const baseClasses = `
      h-20 border-r border-b border-gray-200 relative
      ${isPast ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-gray-50'}
      ${isToday && !isPast ? 'border-l-2 border-l-blue-500' : ''}
      ${className}
    `;
    
    if (isOver && canDrop) {
      return `${baseClasses} bg-blue-50 border-blue-300`;
    }
    
    if (canDrop) {
      return `${baseClasses} hover:bg-blue-25`;
    }
    
    return baseClasses;
  }, [isPast, isToday, isOver, canDrop, className]);

  return (
    <div
      ref={drop}
      className={dropZoneClasses}
      onClick={handleClick}
    >
      {/* Past time indicator overlay */}
      {isPast && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-50 pointer-events-none">
          <div className="absolute inset-0 bg-repeat bg-[length:8px_8px] opacity-20"
               style={{
                 backgroundImage: `repeating-linear-gradient(
                   45deg,
                   transparent,
                   transparent 2px,
                   #9CA3AF 2px,
                   #9CA3AF 4px
                 )`
               }}
          />
        </div>
      )}

      {/* Events in this time slot */}
      <div className="absolute inset-1 flex flex-col gap-1 overflow-hidden">
        {eventsForSlot.map((event, index) => (
          <CalendarItem
            key={event.id}
            event={event}
            index={index}
            isCompact={eventsForSlot.length > 2}
          />
        ))}
      </div>

      {/* Add button (shows on hover for empty slots) */}
      {!isPast && eventsForSlot.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group">
          <div className="flex items-center justify-center w-8 h-8 bg-gray-600 text-white rounded-full group-hover:bg-blue-600 transition-colors">
            <Plus className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Time indicator for current hour */}
      {isToday && hour !== undefined && (
        <CurrentTimeIndicator currentHour={hour} />
      )}

      {/* Drop indicator */}
      {isOver && canDrop && (
        <div className="absolute inset-0 border-2 border-blue-500 bg-blue-50 bg-opacity-50 flex items-center justify-center">
          <div className="text-blue-600 text-sm font-medium bg-white px-2 py-1 rounded shadow">
            Drop to schedule
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * CurrentTimeIndicator component - shows current time line
 */
interface CurrentTimeIndicatorProps {
  currentHour: number;
}

function CurrentTimeIndicator({ currentHour }: CurrentTimeIndicatorProps) {
  const now = dayjs();
  const currentHourValue = now.hour();
  const currentMinutes = now.minute();
  
  // Only show indicator if we're in the current hour
  if (currentHour !== currentHourValue) return null;
  
  // Calculate position based on minutes (0-60 minutes = 0-100% of hour)
  const topPercentage = (currentMinutes / 60) * 100;
  
  return (
    <div
      className="absolute left-0 right-0 z-10 h-0.5 bg-red-500"
      style={{ top: `${topPercentage}%` }}
    >
      {/* Time bubble */}
      <div className="absolute -left-12 -top-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
        {now.format('h:mm A')}
      </div>
      
      {/* Arrow indicator */}
      <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rotate-45" />
    </div>
  );
}