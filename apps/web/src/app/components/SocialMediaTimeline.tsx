'use client';

import { useState, useEffect } from 'react';
import { Clock, Edit3, X, Check, Plus, ChevronLeft, ChevronRight, Briefcase, Twitter, Smartphone } from 'lucide-react';

/**
 * Custom Social Media Timeline - Optimized for Content Scheduling
 * Content-first design with platform-specific optimizations
 */

interface Post {
  id: string;
  title: string;
  platform: 'LinkedIn' | 'X';
  content: string;
  createdTime: string;
  status: string;
}

interface ScheduledPost {
  id: string;
  postId: string;
  content: string;
  platform: string;
  scheduledTime: string;
  status: 'pending' | 'published' | 'failed';
}

interface TimeSlot {
  time: string;
  hour: number;
  posts: ScheduledPost[];
}

interface DaySchedule {
  date: string;
  dayName: string;
  timeSlots: TimeSlot[];
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const SocialMediaTimeline = () => {
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [availablePosts, setAvailablePosts] = useState<Post[]>([]);
  const [draggedPost, setDraggedPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  // Generate week schedule
  useEffect(() => {
    const generateWeekSchedule = () => {
      const week: DaySchedule[] = [];
      const startOfWeek = new Date(currentWeek);
      startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay()); // Start from Sunday
      
      for (let i = 1; i <= 5; i++) { // Monday to Friday
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        
        const timeSlots = HOURS.map(hour => ({
          time: `${hour.toString().padStart(2, '0')}:00`,
          hour,
          posts: [] // In real app, fetch from API
        }));

        week.push({
          date: day.toISOString().split('T')[0],
          dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
          timeSlots
        });
      }
      
      setWeekSchedule(week);
    };

    generateWeekSchedule();
  }, [currentWeek]);

  // Mock data for available posts
  useEffect(() => {
    setAvailablePosts([
      {
        id: '1',
        title: 'LinkedIn Post',
        platform: 'LinkedIn',
        content: 'Here\'s why I believe remote work is transforming how we think about productivity. After 3 years of remote leadership, I\'ve learned that async communication isn\'t just a nice-to-have...',
        createdTime: new Date().toISOString(),
        status: 'approved'
      },
      {
        id: '2',
        title: 'X Post',
        platform: 'X',
        content: 'Quick tip: The best time to refactor code is right after you get it working. Your understanding is at its peak, and the context is fresh in your mind. 🧠⚡',
        createdTime: new Date().toISOString(),
        status: 'approved'
      },
      {
        id: '3',
        title: 'LinkedIn Post',
        platform: 'LinkedIn',
        content: 'The most underrated skill in software engineering? Writing clear commit messages. Your future self (and your teammates) will thank you.',
        createdTime: new Date().toISOString(),
        status: 'approved'
      }
    ]);
  }, []);

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'LinkedIn':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      case 'X':
        return 'bg-sky-100 border-sky-200 text-sky-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'LinkedIn':
        return <Briefcase className="h-4 w-4" />;
      case 'X':
        return <Twitter className="h-4 w-4" />;
      default:
        return <Smartphone className="h-4 w-4" />;
    }
  };

  const handleDragStart = (e: React.DragEvent, post: Post) => {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: string, time: string) => {
    e.preventDefault();
    if (draggedPost) {
      setSelectedSlot({ date, time });
      setShowPostModal(true);
    }
    setDraggedPost(null);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const formatWeekRange = () => {
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4); // Friday
    
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Available Posts */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Ready to Schedule</h2>
          <p className="text-sm text-gray-600">Drag posts to timeline slots</p>
        </div>
        
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {availablePosts.map((post) => (
            <div
              key={post.id}
              draggable
              onDragStart={(e) => handleDragStart(e, post)}
              className="bg-white border border-gray-200 rounded-lg p-4 cursor-move hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPlatformColor(post.platform)} gap-1`}>
                  {getPlatformIcon(post.platform)}
                  {post.platform}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              
              <div className="text-sm text-gray-700 line-clamp-4 leading-relaxed">
                {post.content}
              </div>
              
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>Ready to schedule</span>
                <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Drag to schedule →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Timeline */}
      <div className="flex-1 flex flex-col">
        {/* Timeline Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Social Media Timeline</h1>
              <p className="text-sm text-gray-600 mt-1">Week of {formatWeekRange()}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentWeek(new Date())}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-full">
            {/* Day Headers */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
              <div className="grid grid-cols-6 gap-0">
                <div className="w-20 p-3 text-xs font-medium text-gray-500 border-r border-gray-200">
                  Time
                </div>
                {weekSchedule.map((day) => (
                  <div key={day.date} className="p-3 text-center border-r border-gray-200 last:border-r-0">
                    <div className="text-sm font-medium text-gray-900">{day.dayName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(day.date).getDate()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Rows */}
            <div>
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-6 border-b border-gray-200 hover:bg-gray-50/50">
                  {/* Time Column */}
                  <div className="w-20 p-3 text-sm text-gray-500 font-medium border-r border-gray-200">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  
                  {/* Day Columns */}
                  {weekSchedule.map((day) => {
                    const timeSlot = day.timeSlots.find(slot => slot.hour === hour);
                    return (
                      <div
                        key={`${day.date}-${hour}`}
                        className="min-h-[80px] p-2 border-r border-gray-200 last:border-r-0 relative"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day.date, `${hour.toString().padStart(2, '0')}:00`)}
                      >
                        {/* Drop Zone Indicator */}
                        <div className="absolute inset-1 border-2 border-dashed border-transparent rounded-lg transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/50">
                          {timeSlot?.posts.length === 0 && (
                            <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
                              <Plus className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Scheduled Posts */}
                        {timeSlot?.posts.map((scheduledPost) => (
                          <div
                            key={scheduledPost.id}
                            className={`mb-2 p-2 rounded-md text-xs border ${getPlatformColor(scheduledPost.platform)} cursor-pointer hover:shadow-sm transition-shadow`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium flex items-center gap-1">
                                {getPlatformIcon(scheduledPost.platform)}
                                {scheduledPost.platform}
                              </span>
                              <button className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-600">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-gray-700 line-clamp-2">
                              {scheduledPost.content.substring(0, 80)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showPostModal && selectedSlot && draggedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Schedule Post</h2>
                <button 
                  onClick={() => setShowPostModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Post Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPlatformColor(draggedPost.platform)} gap-1`}>
                    {getPlatformIcon(draggedPost.platform)}
                    {draggedPost.platform}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {draggedPost.content}
                </div>
              </div>

              {/* Schedule Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled for
                  </label>
                  <div className="text-lg font-semibold text-gray-900">
                    {new Date(selectedSlot.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {selectedSlot.time}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPostModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle scheduling logic here
                  console.log('Schedule post:', draggedPost.id, 'for', selectedSlot);
                  setShowPostModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMediaTimeline;