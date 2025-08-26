'use client';

import React, { useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { isBefore, isAfter, addHours, parseISO } from 'date-fns';
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
    const now = new Date();
    return isBefore(date, now);
  }, [date]);

  // Get events for this time slot
  const eventsForSlot = useMemo(() => {
    const slotStart = date;
    const slotEnd = addHours(date, 1);
    
    return state.events.filter((event: CalendarEvent) => {
      const eventTime = new Date(event.scheduledTime);
      // Event should be >= slot start and < slot end (not <= to avoid double display)
      return eventTime >= slotStart && eventTime < slotEnd;
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


  // Calculate drop zone visual state
  const dropZoneClasses = useMemo(() => {
    const baseClasses = `
      min-h-20 border-r border-b border-gray-200 relative
      ${isPast ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
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

  // Check if we have events for styling
  const hasEvents = eventsForSlot.length > 0;

  return (
    <div
      ref={drop}
      className={dropZoneClasses}
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
      <div className="p-1 flex flex-col gap-1">
        {eventsForSlot.map((event, index) => (
          <CalendarItem
            key={event.id}
            event={event}
            index={index}
            isCompact={eventsForSlot.length > 2}
            showExpanded={hasEvents}
          />
        ))}
      </div>


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

