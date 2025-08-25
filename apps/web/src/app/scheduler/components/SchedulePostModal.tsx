'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock,
  Type,
  Send,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCalendar } from './CalendarContext';
import type { PostModalData, Platform, ApprovedPost } from '@/types/scheduler';

/**
 * SchedulePostModal component - Modal for scheduling existing posts
 * Handles scheduling approved posts to specific time slots
 */
export function SchedulePostModal() {
  const { modal, setModal, state } = useCalendar();
  
  // Form state
  const [formData, setFormData] = useState<PostModalData>({
    postId: '',
    title: '',
    content: '',
    platform: 'linkedin',
    scheduledTime: '',
    metadata: {}
  });
  
  const [selectedPost, setSelectedPost] = useState<ApprovedPost | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);

  // Platform character limits
  const characterLimits = {
    linkedin: 3000,
    x: 280
  };

  // Initialize form data when modal opens
  useEffect(() => {
    if (modal.isOpen) {
      const initialDateTime = modal.initialDateTime 
        ? dayjs(modal.initialDateTime).format('YYYY-MM-DDTHH:mm')
        : dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm');

      // Reset form state
      setFormData({
        postId: '',
        title: '',
        content: '',
        platform: modal.initialPlatform || 'linkedin',
        scheduledTime: initialDateTime,
        metadata: {}
      });
      
      setSelectedPost(null);
      setCharacterCount(0);
      setError(null);
    }
  }, [modal.isOpen, modal.initialDateTime, modal.initialPlatform]);

  // Update character count when selected post changes
  useEffect(() => {
    if (selectedPost) {
      setCharacterCount(selectedPost.content.length);
    }
  }, [selectedPost]);

  // Handle post selection
  const handlePostSelect = useCallback((post: ApprovedPost) => {
    setSelectedPost(post);
    setFormData(prev => ({
      ...prev,
      postId: post.id,
      title: post.title,
      content: post.content,
      platform: post.platform
    }));
  }, []);

  // Handle form field changes
  const handleChange = useCallback((field: keyof PostModalData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle platform change
  const handlePlatformChange = useCallback((platform: Platform) => {
    handleChange('platform', platform);
  }, [handleChange]);

  // Validate form
  const validateForm = (): string | null => {
    if (!selectedPost) {
      return 'Please select a post to schedule';
    }
    
    if (!formData.scheduledTime) {
      return 'Scheduled time is required';
    }
    
    const scheduledDate = new Date(formData.scheduledTime);
    const now = new Date();
    
    if (scheduledDate <= now) {
      return 'Scheduled time must be in the future';
    }
    
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (modal.onSave) {
        await modal.onSave(formData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = useCallback(() => {
    if (modal.onClose) {
      modal.onClose();
    }
  }, [modal]);

  if (!modal.isOpen) return null;

  return (
    <Dialog open={modal.isOpen} onOpenChange={() => handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Post
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Selection */}
          {!selectedPost ? (
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">
                Select a post to schedule *
              </div>
              
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {state.approvedPosts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No approved posts available
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {state.approvedPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                        onClick={() => handlePostSelect(post)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              post.platform === 'linkedin' ? 'bg-blue-600' : 'bg-gray-800'
                            }`} />
                            <span className="text-sm font-medium">{post.platform}</span>
                          </div>
                          <span className="text-xs text-gray-500">{post.characterCount || 0} chars</span>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{post.title}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {post.content.substring(0, 120)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Selected Post Display */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">Selected Post</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPost(null)}
                >
                  Change Post
                </Button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-4 h-4 rounded-full ${
                    selectedPost.platform === 'linkedin' ? 'bg-blue-600' : 'bg-gray-800'
                  }`} />
                  <span className="font-medium capitalize">{selectedPost.platform}</span>
                  <span className="text-sm text-gray-500">• {characterCount} characters</span>
                </div>
                
                <h3 className="font-medium mb-2">{selectedPost.title}</h3>
                <div className="text-sm text-gray-700 bg-white p-3 rounded border max-h-32 overflow-y-auto">
                  {selectedPost.content}
                </div>
                
                {selectedPost.insightTitle && (
                  <div className="text-xs text-gray-500 mt-2">
                    From: {selectedPost.insightTitle}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scheduled Time - Only show if post is selected */}
          {selectedPost && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Scheduled Time *
              </label>
              <Input
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={(e) => handleChange('scheduledTime', e.target.value)}
                min={dayjs().format('YYYY-MM-DDTHH:mm')}
                className="w-full"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || !selectedPost}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Post
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}