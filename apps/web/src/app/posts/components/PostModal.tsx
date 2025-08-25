'use client';

import { useState, useEffect } from 'react';
import type { PostView } from '@/types';
import { getPlatformConfig } from '@/constants/platforms';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  X, 
  Edit3, 
  AlertTriangle
} from 'lucide-react';

interface PostModalProps {
  post: PostView | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<PostView>) => Promise<void>;
}

// Textarea component (since we didn't create this yet)
const Textarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  return (
    <textarea
      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

export default function PostModal({ post, isOpen, onClose, onSave }: PostModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  // Initialize form data when post changes
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        content: post.content
      });
      setIsEditing(false);
    }
  }, [post]);

  // Early return after all hooks
  if (!post) return null;

  // Get platform configuration
  const platform = getPlatformConfig(post.platform);
  const characterCount = formData.content.length;
  const isOverLimit = characterCount > platform.charLimit;

  // Handle form submission
  const handleSave = async () => {
    if (!post) return;

    // Validate required fields
    if (!formData.title.trim()) {
      alert('Post title is required');
      return;
    }
    if (!formData.content.trim()) {
      alert('Post content is required');
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        characterCount: formData.content.trim().length,
      };

      await onSave(updatedData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save post:', error);
      // Keep editing mode active so user can retry
      const errorMessage = error instanceof Error ? error.message : 'Failed to save post. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel editing
  const handleCancel = () => {
    // Reset form data to original post data
    setFormData({
      title: post.title,
      content: post.content
    });
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">
                {isEditing ? 'Edit Post' : 'Post Details'}
              </DialogTitle>
              <Badge 
                variant="outline"
                className={`${platform.color} text-white border-none flex items-center gap-1 inline-flex`}
              >
                <platform.icon className="h-3 w-3" />
                {platform.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  variant="outline"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <DialogDescription>
            {isEditing ? 'Edit the post content' : 'View and edit post content'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 p-1">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            {isEditing ? (
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Post title..."
              />
            ) : (
              <p className="text-gray-900 font-medium">{post.title}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            {isEditing ? (
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Post content..."
                rows={12}
              />
            ) : (
              <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded border">
                {post.content}
              </div>
            )}
          </div>

          {/* Character Count */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Character Count:</span>
              <span className={`font-mono ${isOverLimit ? 'text-red-600' : 'text-gray-900'}`}>
                {characterCount}
              </span>
              <span className="text-gray-500">/ {platform.charLimit.toLocaleString()}</span>
            </div>
            {isOverLimit && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Exceeds limit by {characterCount - platform.charLimit}</span>
              </div>
            )}
          </div>

          {/* Source Information */}
          {(post.insightTitle || post.transcriptTitle) && (
            <div className="space-y-2 p-3 bg-gray-50 rounded">
              <h4 className="font-medium text-gray-900 text-sm">Source Information</h4>
              {post.insightTitle && (
                <p className="text-xs text-gray-600">
                  <strong>Insight:</strong> {post.insightTitle}
                </p>
              )}
              {post.transcriptTitle && (
                <p className="text-xs text-gray-600">
                  <strong>Transcript:</strong> {post.transcriptTitle}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {isEditing ? (
            <div className="flex justify-between w-full">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || isOverLimit}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}