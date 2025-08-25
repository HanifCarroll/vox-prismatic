'use client';

import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import dayjs from 'dayjs';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCalendar } from './CalendarContext';
import type { CalendarEvent, DragItem } from '@/types/scheduler';
import type { Platform } from '@/types';

interface CalendarItemProps {
  event: CalendarEvent;
  index: number;
  isCompact?: boolean;
}

/**
 * CalendarItem component - represents a single scheduled post in the calendar
 * Draggable component with hover actions
 */
export function CalendarItem({ event, index, isCompact = false }: CalendarItemProps) {
  const { actions, setModal } = useCalendar();
  const [showActions, setShowActions] = useState(false);

  // Drag configuration
  const [{ isDragging }, drag] = useDrag({
    type: 'post',
    item: (): DragItem => ({
      type: 'post',
      id: event.id,
      postId: event.postId,
      scheduledTime: event.scheduledTime,
      platform: event.platform,
      content: event.content,
      status: event.status
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Platform configuration
  const getPlatformConfig = (platform: Platform) => {
    switch (platform) {
      case 'linkedin':
        return {
          color: 'bg-blue-600',
          name: 'LinkedIn',
          textColor: 'text-blue-600'
        };
      case 'x':
        return {
          color: 'bg-gray-800',
          name: 'X',
          textColor: 'text-gray-800'
        };
      default:
        return {
          color: 'bg-gray-500',
          name: platform,
          textColor: 'text-gray-600'
        };
    }
  };

  // Status configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          label: 'Pending'
        };
      case 'published':
        return {
          icon: CheckCircle,
          color: 'text-green-600 bg-green-50 border-green-200',
          label: 'Published'
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600 bg-red-50 border-red-200',
          label: 'Failed'
        };
      case 'cancelled':
        return {
          icon: AlertCircle,
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          label: 'Cancelled'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          label: status
        };
    }
  };

  const platformConfig = getPlatformConfig(event.platform);
  const statusConfig = getStatusConfig(event.status);
  const StatusIcon = statusConfig.icon;

  // Handle edit action
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModal({
      isOpen: true,
      mode: 'edit',
      postId: event.id, // Use event.id for the scheduled event
      initialDateTime: new Date(event.scheduledTime),
      initialPlatform: event.platform,
      onSave: async (data) => {
        // Update the event using PUT /api/scheduler/events/{id}
        const response = await fetch(`/api/scheduler/events/${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: data.content,
            platform: data.platform,
            scheduledTime: data.scheduledTime,
            // Include other fields that might be updated
            ...(data.title && { title: data.title })
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update event');
        }

        await actions.refreshEvents();
        setModal({ isOpen: false, mode: 'create' });
      },
      onClose: () => setModal({ isOpen: false, mode: 'create' })
    });
  };

  // Handle delete action
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this scheduled post?')) {
      try {
        await actions.deleteEvent(event.id);
      } catch (error) {
        console.error('Failed to delete event:', error);
        // TODO: Show error notification
      }
    }
  };


  // Truncate content for display
  const truncatedContent = event.content.length > 100 
    ? `${event.content.substring(0, 100)}...`
    : event.content;

  const compactContent = event.content.length > 40
    ? `${event.content.substring(0, 40)}...`
    : event.content;

  return (
    <div
      ref={drag}
      className={`
        group relative bg-white rounded-md shadow-sm
        hover:shadow-md transition-all duration-200 cursor-move
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isCompact ? 'text-xs' : 'text-sm'}
        ${showActions ? 'z-20' : 'z-10'}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{ 
        transform: isDragging ? 'rotate(2deg)' : 'none',
        zIndex: isDragging ? 1000 : 'auto'
      }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isCompact ? 'p-1' : 'p-2'}`}>
        <div className="flex items-center gap-1">
          {/* Platform indicator */}
          <div className={`w-2 h-2 rounded-full ${platformConfig.color}`} />
          <span className={`font-medium ${platformConfig.textColor} ${isCompact ? 'text-xs' : 'text-sm'}`}>
            {platformConfig.name}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className={`${isCompact ? 'p-1' : 'p-2'}`}>
        <div className={`text-gray-700 line-clamp-${isCompact ? '2' : '3'}`}>
          {isCompact ? compactContent : truncatedContent}
        </div>
        
        {/* Time */}
        <div className={`text-gray-500 mt-1 ${isCompact ? 'text-xs' : 'text-xs'}`}>
          {dayjs(event.scheduledTime).format('h:mm A')}
        </div>
      </div>

      {/* Action buttons (shown on hover) */}
      {showActions && !isCompact && (
        <div className="absolute top-1 right-1 flex items-center gap-1 bg-white rounded shadow-lg border border-gray-200 p-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
            onClick={handleEdit}
            title="Edit"
          >
            <Edit className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Compact actions menu */}
      {showActions && isCompact && (
        <div className="absolute top-0 right-0 -mr-8 bg-white rounded shadow-lg border border-gray-200 flex flex-col">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600 rounded-none"
            onClick={handleEdit}
            title="Edit"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600 rounded-none"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Error state overlay */}
      {event.status === 'failed' && event.errorMessage && (
        <div className="absolute inset-0 bg-red-50 bg-opacity-90 flex items-center justify-center rounded-md">
          <div className="text-center">
            <XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
            <div className="text-xs text-red-700 font-medium">Failed</div>
            {!isCompact && (
              <div className="text-xs text-red-600 mt-1 px-1" title={event.errorMessage}>
                {event.errorMessage.length > 20 
                  ? `${event.errorMessage.substring(0, 20)}...`
                  : event.errorMessage
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}