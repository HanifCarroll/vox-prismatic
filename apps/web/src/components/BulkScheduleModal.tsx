
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import type { PostView } from '@/types';
import { format, addHours, addDays, startOfDay } from 'date-fns';

interface BulkScheduleModalProps {
  posts: PostView[];
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (schedules: Array<{ postId: string; scheduledFor: Date }>) => Promise<void>;
}

interface ScheduleOption {
  label: string;
  generateSchedules: (posts: PostView[]) => Array<{ postId: string; scheduledFor: Date }>;
}

export function BulkScheduleModal({ posts, isOpen, onClose, onSchedule }: BulkScheduleModalProps) {
  const [selectedOption, setSelectedOption] = useState<string>('distributed');
  const [startDate, setStartDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState<string>('09:00');
  const [interval, setInterval] = useState<number>(4); // hours between posts
  const [isScheduling, setIsScheduling] = useState(false);

  // Schedule generation strategies
  const scheduleOptions: Record<string, ScheduleOption> = {
    distributed: {
      label: 'Distribute evenly',
      generateSchedules: (posts) => {
        const schedules = [];
        let currentDate = new Date(`${startDate}T${startTime}`);
        
        for (const post of posts) {
          schedules.push({
            postId: post.id,
            scheduledFor: new Date(currentDate)
          });
          currentDate = addHours(currentDate, interval);
        }
        
        return schedules;
      }
    },
    daily: {
      label: 'One per day at same time',
      generateSchedules: (posts) => {
        const schedules = [];
        let currentDate = new Date(`${startDate}T${startTime}`);
        
        for (const post of posts) {
          schedules.push({
            postId: post.id,
            scheduledFor: new Date(currentDate)
          });
          currentDate = addDays(currentDate, 1);
        }
        
        return schedules;
      }
    },
    peak: {
      label: 'Peak times (9am, 12pm, 3pm, 6pm)',
      generateSchedules: (posts) => {
        const peakHours = [9, 12, 15, 18];
        const schedules = [];
        let dayIndex = 0;
        let hourIndex = 0;
        
        for (const post of posts) {
          const baseDate = addDays(new Date(startDate), dayIndex);
          const scheduleDate = new Date(baseDate);
          scheduleDate.setHours(peakHours[hourIndex], 0, 0, 0);
          
          schedules.push({
            postId: post.id,
            scheduledFor: scheduleDate
          });
          
          hourIndex++;
          if (hourIndex >= peakHours.length) {
            hourIndex = 0;
            dayIndex++;
          }
        }
        
        return schedules;
      }
    }
  };

  // Generate preview of schedules
  const previewSchedules = useMemo(() => {
    if (!posts.length) return [];
    const option = scheduleOptions[selectedOption];
    return option.generateSchedules(posts);
  }, [posts, selectedOption, startDate, startTime, interval]);

  const handleSchedule = async () => {
    setIsScheduling(true);
    try {
      await onSchedule(previewSchedules);
      onClose();
    } catch (error) {
      console.error('Bulk scheduling failed:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Schedule {posts.length} Posts</DialogTitle>
          <DialogDescription>
            Choose how to distribute these posts across your schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Scheduling Strategy */}
          <div>
            <Label className="text-sm font-medium mb-3">Scheduling Strategy</Label>
            <div className="space-y-2">
              {Object.entries(scheduleOptions).map(([key, option]) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedOption === key 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="schedule-option"
                    value={key}
                    checked={selectedOption === key}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date and Time Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date" className="text-sm">
                <Calendar className="inline h-3 w-3 mr-1" />
                Start Date
              </Label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <Label htmlFor="start-time" className="text-sm">
                <Clock className="inline h-3 w-3 mr-1" />
                Start Time
              </Label>
              <input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          {/* Interval Setting (for distributed option) */}
          {selectedOption === 'distributed' && (
            <div>
              <Label htmlFor="interval" className="text-sm">
                Hours between posts
              </Label>
              <input
                id="interval"
                type="number"
                min="1"
                max="24"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 4)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          )}

          {/* Schedule Preview */}
          <div>
            <Label className="text-sm font-medium mb-3">Schedule Preview</Label>
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              <div className="p-3 space-y-2">
                {previewSchedules.slice(0, 5).map((schedule, index) => {
                  const post = posts.find(p => p.id === schedule.postId);
                  return (
                    <div key={schedule.postId} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">
                        {index + 1}. {post?.title}
                      </span>
                      <span className="text-gray-600 ml-2">
                        {format(schedule.scheduledFor, 'MMM dd, h:mm a')}
                      </span>
                    </div>
                  );
                })}
                {previewSchedules.length > 5 && (
                  <div className="text-sm text-gray-500 italic">
                    ... and {previewSchedules.length - 5} more posts
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warnings */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Review before confirming</p>
              <p className="text-xs mt-1">
                This will schedule {posts.length} posts according to the selected pattern.
                Existing schedules will not be affected.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isScheduling}>
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isScheduling || !posts.length}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isScheduling ? (
              <>Scheduling {posts.length} posts...</>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Schedule {posts.length} Posts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}