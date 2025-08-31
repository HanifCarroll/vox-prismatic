
import React, { useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { isBefore, isAfter, addHours, parseISO } from 'date-fns';
import { useSchedulerEvents } from '@/hooks/useSchedulerData';
import { useSchedulerMutations } from '@/hooks/useSchedulerMutations';
import { useURLFilters } from './URLStateManager';
import { CalendarItem } from './CalendarItem';
import { format } from 'date-fns';
import type { DragItem, ApprovedPostDragItem, AnyDragItem } from '@/types/scheduler';
import type { CalendarEvent } from '@/types';
import { useToast } from '@/lib/toast';
import { useOptimisticUpdate } from '@/hooks/useOptimisticUpdate';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { EntityType } from '@content-creation/types';

interface CalendarColumnProps {
  date: Date;
  hour?: number;
  isToday?: boolean;
  className?: string;
  isDragging?: boolean;
  setDragging?: (isDragging: boolean) => void;
}

/**
 * CalendarColumn component - represents a time slot in the calendar
 * Acts as a drop zone for drag-and-drop operations
 */
export function CalendarColumn({ 
  date, 
  hour, 
  isToday = false,
  className = '',
  isDragging = false,
  setDragging
}: CalendarColumnProps) {
  const { events } = useSchedulerEvents();
  const { schedulePost, updateEventTime } = useSchedulerMutations();
  const { filters } = useURLFilters();
  const toast = useToast();
  const navigate = useNavigate();
  const { executeWithOptimism } = useOptimisticUpdate();
  
  // Check if this time slot is in the past
  const isPast = useMemo(() => {
    const now = new Date();
    return isBefore(date, now);
  }, [date]);

  // Get events for this time slot
  const eventsForSlot = useMemo(() => {
    const slotStart = date;
    const slotEnd = addHours(date, 1);
    
    return events.filter((event: CalendarEvent) => {
      const eventTime = new Date(event.scheduledTime);
      // Event should be >= slot start and < slot end (not <= to avoid double display)
      return eventTime >= slotStart && eventTime < slotEnd;
    });
  }, [events, date]);

  // Ref for the drop target
  const dropRef = useRef<HTMLDivElement>(null);

  // Drop zone configuration with optimistic updates
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['post', 'approved-post'],
    drop: async (item: AnyDragItem) => {
      if (isPast) return;
      
      if (item.type === 'post') {
        // Find the original event
        const originalEvent = events.find(e => e.id === item.id);
        if (!originalEvent) return;
        
        // Create optimistic event with new time
        const optimisticEvent: CalendarEvent = {
          ...originalEvent,
          scheduledTime: date,
        };
        
        // Execute with optimistic update
        await executeWithOptimism({
          entityType: EntityType.SCHEDULED_POST,
          entityId: item.id,
          action: 'reschedule',
          optimisticData: optimisticEvent,
          originalData: originalEvent,
          serverAction: async () => {
            try {
              await updateEventTime.mutate({ eventId: item.id, newDateTime: date });
              return { success: true };
            } catch (error) {
              return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to update event time'
              };
            }
          },
          successMessage: "Post rescheduled successfully",
          errorMessage: "Failed to reschedule post",
          skipRefresh: false, // Let window.location.reload() sync the data
          rollbackDelay: 300, // Quick rollback for better UX
        });
      } else if (item.type === 'approved-post') {
        // For new scheduling, we don't have an existing event yet
        // So we'll handle this slightly differently
        try {
          await schedulePost.mutate({ postId: item.id, dateTime: date, platform: item.platform, content: '' });
          toast.scheduled(format(date, "MMM d, yyyy 'at' h:mm a"), item.platform);
        } catch (error) {
          console.error('Failed to schedule post:', error);
          toast.apiError('schedule post', error instanceof Error ? error.message : "Unknown error occurred");
        }
      }
    },
    canDrop: () => !isPast,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Connect the drop connector to the ref
  drop(dropRef);

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
      ref={dropRef}
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

