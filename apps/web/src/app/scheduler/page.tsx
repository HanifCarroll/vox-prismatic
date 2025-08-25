'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { ChevronLeft, Clock, Edit3, X, Check, Calendar as CalendarIcon, Hash, Zap, Briefcase, Twitter } from 'lucide-react';
import Link from 'next/link';
import 'react-big-calendar/lib/css/react-big-calendar.css';

/**
 * Scheduler Page - Visual drag-and-drop scheduling interface
 * Following the Core Philosophy: Visualize, Place, Confirm
 */

const localizer = momentLocalizer(moment);

interface PostToSchedule {
  id: string;
  title: string;
  platform: 'LinkedIn' | 'X';
  content: string;
  createdTime: string;
  status: string;
}

interface ScheduledEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  platform: string;
  content: string;
  resource?: any;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduleData: ScheduleData) => void;
  post: PostToSchedule | null;
  selectedDate: Date | null;
  isScheduling?: boolean;
}

interface ScheduleData {
  datetime: string;
  platforms: string[];
}

const ConfirmationModal = ({ isOpen, onClose, onConfirm, post, selectedDate, isScheduling = false }: ConfirmationModalProps) => {
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    if (post && isOpen) {
      setSelectedPlatforms([post.platform]);
      if (selectedDate) {
        // If dropped on specific time, use that time
        const timeStr = moment(selectedDate).format('HH:mm');
        setSelectedTime(timeStr);
      }
    }
  }, [post, selectedDate, isOpen]);

  const handleConfirm = () => {
    if (!selectedDate) return;
    
    const datetime = moment(selectedDate)
      .hour(parseInt(selectedTime.split(':')[0]))
      .minute(parseInt(selectedTime.split(':')[1]))
      .toISOString();

    onConfirm({
      datetime,
      platforms: selectedPlatforms
    });
  };

  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Confirm Schedule</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Post Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                post.platform === 'LinkedIn' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-sky-100 text-sky-800'
              }`}>
                {post.platform}
              </span>
            </div>
            <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
              {post.content.substring(0, 300)}
              {post.content.length > 300 && '...'}
            </div>
          </div>

          {/* Date and Time Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-2" />
                Date & Time
              </label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : ''}
                  readOnly
                  className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platforms
              </label>
              <div className="space-y-2">
                {['LinkedIn', 'X'].map((platform) => (
                  <label key={platform} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(platform)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPlatforms([...selectedPlatforms, platform]);
                        } else {
                          setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                        }
                      }}
                      className="mr-3 rounded"
                    />
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      platform === 'LinkedIn' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-sky-100 text-sky-800'
                    }`}>
                      {platform}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isScheduling}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedPlatforms.length === 0 || isScheduling}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 min-w-[140px]"
          >
            {isScheduling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Scheduling...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirm Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SchedulerPage() {
  const [postsQueue, setPostsQueue] = useState<PostToSchedule[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  
  // Modal state
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    post: null as PostToSchedule | null,
    selectedDate: null as Date | null
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load posts and scheduled events with proper error handling and deduplication
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load both posts and events in parallel using RESTful endpoints
      const [postsResponse, eventsResponse] = await Promise.all([
        fetch('/api/posts?status=approved'),
        fetch('/api/posts?status=scheduled')
      ]);
      
      // Handle posts response
      const postsData = await postsResponse.json();
      if (postsData.success) {
        // Transform posts API format to scheduler format
        const transformedPosts = postsData.data.map((post: any) => ({
          id: post.id,
          title: post.title,
          platform: post.platform,
          content: post.fullContent || post.content || 'No content available',
          createdTime: post.createdAt,
          status: post.status
        }));
        setPostsQueue(transformedPosts);
      } else {
        throw new Error(postsData.error || 'Failed to load posts');
      }

      // Handle events response (scheduled posts)
      const eventsData = await eventsResponse.json();
      if (eventsData.success) {
        setScheduledEvents(eventsData.data.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end || event.start)
        })));
      } else {
        console.warn('Failed to load scheduled events:', eventsData.error);
        setScheduledEvents([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter posts based on search and platform
  const filteredPosts = postsQueue.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = selectedPlatform === 'all' || post.platform === selectedPlatform;
    return matchesSearch && matchesPlatform;
  });

  // Handle calendar slot selection
  const handleSelectSlot = ({ start }: { start: Date }) => {
    // For now, we'll need a post to be selected. In a more advanced version,
    // we could show a post picker when clicking empty slots
    console.log('Empty slot selected:', start);
  };

  // Handle post drag onto calendar
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // If dropped on calendar area, we need to handle this differently
    // For now, we'll use a click-to-schedule approach
    console.log('Drag ended:', result);
  };

  // Handle event click for editing
  const handleEventClick = (event: ScheduledEvent) => {
    console.log('Event clicked:', event);
    // Could open edit modal here
  };

  // Handle post scheduling with loading state
  const handleSchedulePost = async (scheduleData: ScheduleData) => {
    if (!confirmationModal.post || scheduling) return;

    try {
      setScheduling(true);
      setError(null);

      const response = await fetch(`/api/posts/${confirmationModal.post.id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: confirmationModal.post.platform,
          content: confirmationModal.post.content,
          datetime: scheduleData.datetime
        })
      });

      const data = await response.json();

      if (data.success) {
        // Remove post from queue
        setPostsQueue(posts => posts.filter(p => p.id !== confirmationModal.post!.id));
        
        // Add to calendar
        const newEvent: ScheduledEvent = {
          id: `scheduled-${confirmationModal.post.id}`,
          title: `${confirmationModal.post.platform}: ${confirmationModal.post.content.substring(0, 30)}...`,
          start: new Date(scheduleData.datetime),
          end: new Date(scheduleData.datetime),
          platform: confirmationModal.post.platform,
          content: confirmationModal.post.content
        };
        setScheduledEvents(events => [...events, newEvent]);

        setSuccessMessage(`Post scheduled for ${moment(scheduleData.datetime).format('MMM D, h:mm A')}`);
        setTimeout(() => setSuccessMessage(null), 5000);
        
        // Close modal
        setConfirmationModal({ isOpen: false, post: null, selectedDate: null });
      } else {
        throw new Error(data.error || 'Failed to schedule post');
      }
    } catch (error) {
      console.error('Error scheduling post:', error);
      setError(error instanceof Error ? error.message : 'Failed to schedule post');
    } finally {
      setScheduling(false);
    }
  };

  // Handle post click to schedule
  const handlePostClick = (post: PostToSchedule) => {
    setConfirmationModal({
      isOpen: true,
      post,
      selectedDate: new Date() // Default to today
    });
  };

  const getPlatformIcon = (platform: string) => {
    return platform === 'LinkedIn' ? <Briefcase className="h-4 w-4" /> : <Twitter className="h-4 w-4" />;
  };

  const getPlatformColor = (platform: string) => {
    return platform === 'LinkedIn' ? 'bg-blue-100 text-blue-800' : 'bg-sky-100 text-sky-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scheduler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">Content Scheduler</h1>
            </div>
            
            <div className="text-sm text-gray-500">
              {filteredPosts.length} posts ready • {scheduledEvents.length} scheduled
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <X className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content - Two Panel Layout */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Panel - Content Queue */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Ready to Schedule</h2>
            
            {/* Search and Filters */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Platforms</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="X">X (Twitter)</option>
              </select>
            </div>
          </div>

          {/* Posts List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Zap className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No posts ready to schedule</p>
                {searchTerm && <p className="text-xs mt-1">Try adjusting your search</p>}
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handlePostClick(post)}
                  className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPlatformColor(post.platform)} gap-1`}>
                      {getPlatformIcon(post.platform)}
                      {post.platform}
                    </span>
                    <Clock className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                  
                  <div className="text-sm text-gray-700 line-clamp-3 mb-2">
                    {post.content.substring(0, 120)}
                    {post.content.length > 120 && '...'}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{moment(post.createdTime).format('MMM D')}</span>
                    <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to schedule
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Calendar */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg border border-gray-200 h-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
              <p className="text-sm text-gray-600 mt-1">
                Click a post from the queue to schedule it, or click on calendar events to edit them
              </p>
            </div>
            
            <div className="p-4 h-[calc(100%-80px)]">
              <Calendar
                localizer={localizer}
                events={scheduledEvents}
                startAccessor="start"
                endAccessor="end"
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleEventClick}
                selectable={true}
                popup={true}
                views={['month', 'week', 'day']}
                defaultView="week"
                step={60}
                showMultiDayTimes
                eventPropGetter={(event) => ({
                  style: {
                    backgroundColor: event.platform === 'LinkedIn' ? '#0077b5' : '#1da1f2',
                    borderColor: event.platform === 'LinkedIn' ? '#005885' : '#1991db',
                    color: 'white',
                    borderRadius: '4px',
                    border: 'none'
                  }
                })}
                style={{ height: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => !scheduling && setConfirmationModal({ isOpen: false, post: null, selectedDate: null })}
        onConfirm={handleSchedulePost}
        post={confirmationModal.post}
        selectedDate={confirmationModal.selectedDate}
        isScheduling={scheduling}
      />
    </div>
  );
}