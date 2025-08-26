'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import type { PostView } from '@/types';
import { getPlatformConfig } from '@/constants/platforms';

interface SchedulePostModalProps {
  post: PostView | null;
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (postId: string, scheduledFor: Date) => Promise<void>;
}

export function SchedulePostModal({ post, isOpen, onClose, onSchedule }: SchedulePostModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Generate next 5 available time slots (every 4 hours starting from next hour)
  const suggestedSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    for (let i = 0; i < 5; i++) {
      const slotTime = new Date(nextHour.getTime() + i * 4 * 60 * 60 * 1000);
      slots.push({
        date: slotTime.toISOString().split('T')[0],
        time: slotTime.toTimeString().slice(0, 5),
        label: formatSlotLabel(slotTime),
        datetime: slotTime
      });
    }
    return slots;
  }, [isOpen]); // Recalculate when modal opens

  if (!post || !isOpen) return null;

  const platform = getPlatformConfig(post.platform);

  const formatSlotLabel = (date: Date) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleQuickSchedule = (slot: typeof suggestedSlots[0]) => {
    setSelectedDate(slot.date);
    setSelectedTime(slot.time);
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsScheduling(true);
    try {
      const scheduledFor = new Date(`${selectedDate}T${selectedTime}`);
      await onSchedule(post.id, scheduledFor);
      onClose();
    } catch (error) {
      console.error('Failed to schedule post:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const canSchedule = selectedDate && selectedTime;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Post</DialogTitle>
          <DialogDescription>
            Choose when to publish this {platform.label} post
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Post Preview */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className={`${platform.color} text-white p-1 rounded`}>
                <platform.icon className="h-3 w-3" />
              </div>
              <span className="text-sm font-medium">{post.title}</span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2">{post.content}</p>
          </div>

          {/* Quick Schedule Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Schedule</Label>
            <div className="space-y-1">
              {suggestedSlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSchedule(slot)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedDate === slot.date && selectedTime === slot.time
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{slot.label}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date/Time Selection */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">Or choose custom time</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-xs text-gray-600">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Date
                </Label>
                <input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-xs text-gray-600">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Time
                </Label>
                <input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isScheduling}>
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={!canSchedule || isScheduling}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isScheduling ? 'Scheduling...' : 'Schedule Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}