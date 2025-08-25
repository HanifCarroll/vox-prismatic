'use client';

import { useState, useEffect } from 'react';
import { PostView } from '../page';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  X, 
  Eye, 
  Edit3, 
  Hash, 
  AtSign, 
  BarChart3,
  Calendar,
  Check
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

// Platform configuration
const platformConfig = {
  linkedin: { icon: '💼', color: 'bg-blue-600', label: 'LinkedIn', charLimit: 3000 },
  x: { icon: '🐦', color: 'bg-black', label: 'X (Twitter)', charLimit: 280 },
  instagram: { icon: '📸', color: 'bg-pink-600', label: 'Instagram', charLimit: 2200 },
  facebook: { icon: '👥', color: 'bg-blue-800', label: 'Facebook', charLimit: 63206 },
  youtube: { icon: '📺', color: 'bg-red-600', label: 'YouTube', charLimit: 5000 }
};

export default function PostModal({ post, isOpen, onClose, onSave }: PostModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    hook: '',
    body: '',
    softCta: '',
    directCta: '',
    fullContent: '',
    hashtags: [] as string[],
    mentions: [] as string[],
  });

  // Initialize form data when post changes
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        hook: post.hook || '',
        body: post.body,
        softCta: post.softCta || '',
        directCta: post.directCta || '',
        fullContent: post.fullContent,
        hashtags: post.hashtags || [],
        mentions: post.mentions || [],
      });
      setIsEditing(false);
    }
  }, [post]);

  if (!post) return null;

  const platform = platformConfig[post.platform];
  const characterCount = formData.fullContent.length;
  const isOverLimit = characterCount > platform.charLimit;

  // Handle form submission
  const handleSave = async () => {
    if (!post) return;

    setIsSaving(true);
    try {
      const updatedData = {
        title: formData.title,
        hook: formData.hook || null,
        body: formData.body,
        softCta: formData.softCta || null,
        directCta: formData.directCta || null,
        fullContent: formData.fullContent,
        hashtags: JSON.stringify(formData.hashtags),
        mentions: JSON.stringify(formData.mentions),
        characterCount: formData.fullContent.length,
      };

      await onSave(updatedData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save post:', error);
      // You might want to show a toast notification here
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel editing
  const handleCancel = () => {
    // Reset form data to original post data
    setFormData({
      title: post.title,
      hook: post.hook || '',
      body: post.body,
      softCta: post.softCta || '',
      directCta: post.directCta || '',
      fullContent: post.fullContent,
      hashtags: post.hashtags || [],
      mentions: post.mentions || [],
    });
    setIsEditing(false);
  };

  // Update full content when individual parts change
  useEffect(() => {
    const parts = [
      formData.hook,
      formData.body,
      formData.softCta,
      formData.directCta
    ].filter(Boolean);
    
    const newFullContent = parts.join('\n\n');
    if (newFullContent !== formData.fullContent) {
      setFormData(prev => ({
        ...prev,
        fullContent: newFullContent
      }));
    }
  }, [formData.hook, formData.body, formData.softCta, formData.directCta]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">
                {isEditing ? 'Edit Post' : 'Post Details'}
              </DialogTitle>
              <Badge 
                variant="outline"
                className={`${platform.color} text-white border-none`}
              >
                {platform.icon} {platform.label}
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
            {isEditing ? 'Edit the post content and metadata' : 'View post details and content'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="content" className="space-y-4 p-1">
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

              {/* Hook */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hook (Optional)
                </label>
                {isEditing ? (
                  <Textarea
                    value={formData.hook}
                    onChange={(e) => setFormData(prev => ({ ...prev, hook: e.target.value }))}
                    placeholder="Attention-grabbing opening..."
                    rows={2}
                  />
                ) : (
                  <p className="text-gray-700">{post.hook || 'No hook'}</p>
                )}
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Content
                </label>
                {isEditing ? (
                  <Textarea
                    value={formData.body}
                    onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="Main post content..."
                    rows={6}
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">{post.body}</p>
                )}
              </div>

              {/* Soft CTA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Soft CTA (Optional)
                </label>
                {isEditing ? (
                  <Textarea
                    value={formData.softCta}
                    onChange={(e) => setFormData(prev => ({ ...prev, softCta: e.target.value }))}
                    placeholder="Gentle call to action..."
                    rows={2}
                  />
                ) : (
                  <p className="text-gray-700">{post.softCta || 'No soft CTA'}</p>
                )}
              </div>

              {/* Direct CTA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Direct CTA (Optional)
                </label>
                {isEditing ? (
                  <Textarea
                    value={formData.directCta}
                    onChange={(e) => setFormData(prev => ({ ...prev, directCta: e.target.value }))}
                    placeholder="Clear call to action..."
                    rows={2}
                  />
                ) : (
                  <p className="text-gray-700">{post.directCta || 'No direct CTA'}</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4 p-1">
              {/* Hashtags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hashtags
                </label>
                <div className="flex flex-wrap gap-2">
                  {(isEditing ? formData.hashtags : post.hashtags)?.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      <Hash className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  )) || <span className="text-gray-500">No hashtags</span>}
                </div>
              </div>

              {/* Mentions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mentions
                </label>
                <div className="flex flex-wrap gap-2">
                  {(isEditing ? formData.mentions : post.mentions)?.map((mention, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      <AtSign className="h-3 w-3 mr-1" />
                      {mention}
                    </Badge>
                  )) || <span className="text-gray-500">No mentions</span>}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Character Count
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${isOverLimit ? 'text-red-600' : 'text-gray-900'}`}>
                      {characterCount}
                    </span>
                    <span className="text-gray-500">/ {platform.charLimit.toLocaleString()}</span>
                  </div>
                </div>

                {post.estimatedEngagementScore && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Engagement Score
                    </label>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>{post.estimatedEngagementScore}/10</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Source Information */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Source Information</h4>
                {post.insightTitle && (
                  <p className="text-sm text-gray-600">
                    <strong>Insight:</strong> {post.insightTitle}
                  </p>
                )}
                {post.insightCategory && (
                  <p className="text-sm text-gray-600">
                    <strong>Category:</strong> {post.insightCategory}
                  </p>
                )}
                {post.transcriptTitle && (
                  <p className="text-sm text-gray-600">
                    <strong>Transcript:</strong> {post.transcriptTitle}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="p-1">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Post Preview</h4>
                <div className={`p-4 rounded-lg border-2 ${isOverLimit ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="whitespace-pre-wrap text-gray-900">
                    {isEditing ? formData.fullContent : post.fullContent}
                  </div>
                  {isOverLimit && (
                    <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                      ⚠️ Content exceeds {platform.label} character limit by {characterCount - platform.charLimit} characters
                    </div>
                  )}
                </div>

                {/* Preview hashtags and mentions */}
                <div className="space-y-2">
                  {((isEditing ? formData.hashtags : post.hashtags)?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(isEditing ? formData.hashtags : post.hashtags)?.map((tag, index) => (
                        <span key={index} className="text-blue-600 text-sm">#{tag}</span>
                      ))}
                    </div>
                  )}
                  {((isEditing ? formData.mentions : post.mentions)?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(isEditing ? formData.mentions : post.mentions)?.map((mention, index) => (
                        <span key={index} className="text-blue-600 text-sm">@{mention}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

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