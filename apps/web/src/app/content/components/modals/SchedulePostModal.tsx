
import { useState, useEffect, useMemo, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, Clock, ChevronRight } from "lucide-react";
import { ScheduleLabel } from "@/components/date";
import { getPlatformConfig } from "@/constants/platforms";
import { postsAPI } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { PostView } from "@/types";

interface SchedulePostModalProps {
  postId?: string;
  post?: PostView | null; // Optional: can still pass data directly
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SchedulePostModal({
  postId,
  post: externalPost,
  isOpen,
  onClose,
  onSuccess,
}: SchedulePostModalProps) {
  const [post, setPost] = useState<PostView | null>(externalPost || null);
  const [isLoading, setIsLoading] = useState(!externalPost);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isScheduling, startTransition] = useTransition();
  const toast = useToast();

  // Fetch post if ID is provided and no external data
  useEffect(() => {
    if (isOpen && postId && !externalPost) {
      setIsLoading(true);
      postsAPI.getPost(postId).then(result => {
        if (result.success && result.data) {
          setPost(result.data);
        } else {
          toast.error('Failed to load post');
          onClose();
        }
        setIsLoading(false);
      });
    } else if (externalPost) {
      setPost(externalPost);
    }
  }, [postId, externalPost, isOpen, onClose, toast]);

  // Generate next 5 available time slots (every 4 hours starting from next hour)
  // Only calculate on client to avoid hydration mismatch
  const suggestedSlots = useMemo(() => {
    if (typeof window === 'undefined') {
      // Return empty array on server to avoid hydration issues
      return [];
    }
    
    const slots = [];
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    for (let i = 0; i < 5; i++) {
      const slotTime = new Date(nextHour.getTime() + i * 4 * 60 * 60 * 1000);
      slots.push({
        date: slotTime.toISOString().split('T')[0],
        time: slotTime.toTimeString().slice(0, 5),
        datetime: slotTime
      });
    }
    return slots;
  }, [isOpen]); // Recalculate when modal opens

  const handleQuickSchedule = (slot: typeof suggestedSlots[0]) => {
    setSelectedDate(slot.date);
    setSelectedTime(slot.time);
  };

  const handleSchedule = async () => {
    if (!post || !selectedDate || !selectedTime) return;

    startTransition(async () => {
      try {
        const scheduledFor = new Date(`${selectedDate}T${selectedTime}`);
        const result = await postsAPI.schedulePost(post.id, scheduledFor.toISOString());
        
        if (result.success) {
          toast.success('Post scheduled successfully');
          onSuccess();
          onClose();
        } else {
          toast.error('Failed to schedule post');
        }
      } catch (error) {
        toast.error('Failed to schedule post');
      }
    });
  };

  const canSchedule = selectedDate && selectedTime;
  const platform = post ? getPlatformConfig(post.platform) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : post && platform ? (
          <>
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
                      disabled={isScheduling}
                    >
                      <div className="flex items-center justify-between">
                        <ScheduleLabel date={slot.datetime} />
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
                      disabled={isScheduling}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                      disabled={isScheduling}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                {isScheduling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Post'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No post data available</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}