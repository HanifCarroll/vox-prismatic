'use client';

import { PostView } from '../page';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MoreVertical, 
  Edit3, 
  Check, 
  X, 
  Archive, 
  Calendar, 
  Eye,
  TrendingUp,
  Hash,
  AtSign,
  Briefcase,
  Twitter,
  Camera,
  Users,
  Tv
} from 'lucide-react';
import { useState } from 'react';

interface PostCardProps {
  post: PostView;
  onAction: (action: string, post: PostView) => void;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}

// Platform icons and colors
const platformConfig = {
  linkedin: { icon: Briefcase, color: 'bg-blue-600', label: 'LinkedIn' },
  x: { icon: Twitter, color: 'bg-black', label: 'X' },
  instagram: { icon: Camera, color: 'bg-pink-600', label: 'Instagram' },
  facebook: { icon: Users, color: 'bg-blue-800', label: 'Facebook' },
  youtube: { icon: Tv, color: 'bg-red-600', label: 'YouTube' }
};

// Status badge variants
const statusConfig = {
  draft: { variant: 'secondary' as const, label: 'Draft', color: 'text-gray-600' },
  needs_review: { variant: 'outline' as const, label: 'Needs Review', color: 'text-yellow-600' },
  approved: { variant: 'default' as const, label: 'Approved', color: 'text-green-600' },
  scheduled: { variant: 'default' as const, label: 'Scheduled', color: 'text-blue-600' },
  published: { variant: 'default' as const, label: 'Published', color: 'text-green-700' },
  failed: { variant: 'destructive' as const, label: 'Failed', color: 'text-red-600' },
  archived: { variant: 'secondary' as const, label: 'Archived', color: 'text-gray-500' }
};

export default function PostCard({ post, onAction, isSelected, onSelect }: PostCardProps) {
  const [showActions, setShowActions] = useState(false);
  
  // Add platform validation with fallback
  const platform = platformConfig[post.platform] || {
    icon: Users,
    color: 'bg-gray-600',
    label: 'Unknown Platform'
  };
  
  // Add status validation with fallback
  const status = statusConfig[post.status] || {
    variant: 'secondary' as const,
    label: 'Unknown Status',
    color: 'text-gray-500'
  };

  // Truncate content for preview
  const truncatedContent = post.fullContent.length > 200 
    ? post.fullContent.substring(0, 200) + '...'
    : post.fullContent;

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get available actions based on status
  const getAvailableActions = () => {
    const actions = [];
    
    actions.push({ key: 'edit', label: 'Edit', icon: Edit3 });
    actions.push({ key: 'view', label: 'View Details', icon: Eye });
    
    if (post.status === 'needs_review') {
      actions.push({ key: 'approve', label: 'Approve', icon: Check });
      actions.push({ key: 'reject', label: 'Reject', icon: X });
    } else if (post.status === 'approved') {
      actions.push({ key: 'schedule', label: 'Schedule', icon: Calendar });
      actions.push({ key: 'review', label: 'Back to Review', icon: Edit3 });
    } else if (['rejected', 'published', 'failed'].includes(post.status)) {
      actions.push({ key: 'review', label: 'Back to Review', icon: Edit3 });
    }
    
    if (post.status !== 'archived') {
      actions.push({ key: 'archive', label: 'Archive', icon: Archive });
    }
    
    return actions;
  };

  const availableActions = getAvailableActions();

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Selection checkbox and title */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(post.id, checked as boolean)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {post.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant={status.variant}
                  className={`text-xs ${status.color}`}
                >
                  {status.label}
                </Badge>
                <Badge 
                  variant="outline"
                  className={`text-xs ${platform.color} text-white border-none flex items-center gap-1`}
                >
                  <platform.icon className="h-3 w-3" />
                  {platform.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              className="h-8 w-8 p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showActions && (
              <div className="absolute right-0 top-8 z-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                {availableActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.key}
                      onClick={() => {
                        onAction(action.key, post);
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-3">
        {/* Content preview */}
        <div className="text-sm text-gray-700 mb-3">
          <p className="line-clamp-3">{truncatedContent}</p>
        </div>

        {/* Hashtags and mentions */}
        {(post.hashtags?.length || post.mentions?.length) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.hashtags?.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <Hash className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {post.mentions?.slice(0, 2).map((mention, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <AtSign className="h-3 w-3 mr-1" />
                {mention}
              </Badge>
            ))}
            {(post.hashtags?.length || 0) + (post.mentions?.length || 0) > 5 && (
              <Badge variant="outline" className="text-xs">
                +{(post.hashtags?.length || 0) + (post.mentions?.length || 0) - 5} more
              </Badge>
            )}
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="font-medium">Characters:</span>
            <span>{post.characterCount || post.fullContent.length}</span>
          </div>
          {post.estimatedEngagementScore && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>{post.estimatedEngagementScore}/10</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="font-medium">Created:</span>
            <span>{formatDate(post.createdAt)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between w-full text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {post.insightTitle && (
              <span className="truncate max-w-48">
                From: {post.insightTitle}
              </span>
            )}
            {post.transcriptTitle && (
              <span className="truncate max-w-48">
                Source: {post.transcriptTitle}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {post.status === 'needs_review' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onAction('approve', post)}
                  className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction('reject', post)}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {post.status === 'approved' && (
              <Button
                size="sm"
                onClick={() => onAction('schedule', post)}
                className="h-6 px-2 text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Schedule
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction('edit', post)}
              className="h-6 px-2 text-xs"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}