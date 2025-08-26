'use client';

import type { PostView } from '@/types';
import { getPlatformConfig } from '@/constants/platforms';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DateDisplay } from '@/components/date';
import { 
  MoreVertical, 
  Edit3, 
  Check, 
  X, 
  Archive, 
  Calendar, 
  Eye
} from 'lucide-react';
import { useState } from 'react';

interface PostCardProps {
  post: PostView;
  onAction: (action: string, post: PostView) => void;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}

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
  
  const platform = getPlatformConfig(post.platform);
  
  // Add status validation with fallback
  const status = statusConfig[post.status] || {
    variant: 'secondary' as const,
    label: 'Unknown Status',
    color: 'text-gray-500'
  };

  // Truncate content for preview
  const truncatedContent = post.content.length > 200 
    ? post.content.substring(0, 200) + '...'
    : post.content;

  // Import the date utility at the top of the file (this comment is for reference)

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
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex items-start justify-between">
          {/* Selection checkbox and title */}
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(post.id, checked as boolean)}
              className="mt-0.5 sm:mt-1"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                {post.title}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                <Badge 
                  variant={status.variant}
                  className={`text-[10px] sm:text-xs ${status.color}`}
                >
                  {status.label}
                </Badge>
                <Badge 
                  variant="outline"
                  className={`text-[10px] sm:text-xs ${platform.color} text-white border-none flex items-center gap-0.5 sm:gap-1`}
                >
                  <platform.icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
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

      <CardContent className="py-3 px-3 sm:px-6">
        {/* Content preview */}
        <div className="text-xs sm:text-sm text-gray-700 mb-3">
          <p className="line-clamp-2 sm:line-clamp-3">{truncatedContent}</p>
        </div>


        {/* Metrics with platform limit warning */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="font-medium">Characters:</span>
            <span className={`${
              (post.platform === 'x' && (post.characterCount || 0) > 280) ||
              (post.platform === 'linkedin' && (post.characterCount || 0) > 3000)
                ? 'text-red-600 font-bold'
                : ''
            }`}>
              {post.characterCount || post.content.length}
              {post.platform === 'x' && ' / 280'}
              {post.platform === 'linkedin' && ' / 3000'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium hidden sm:inline">Created:</span>
            <span className="font-medium sm:hidden">Date:</span>
            <DateDisplay date={post.createdAt} className="truncate" />
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 px-3 sm:px-6 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 sm:gap-0 text-[10px] sm:text-xs text-gray-500">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 order-2 sm:order-1">
            {post.insightTitle && (
              <span className="truncate max-w-full sm:max-w-48">
                <span className="font-medium">From:</span> {post.insightTitle}
              </span>
            )}
            {post.transcriptTitle && (
              <span className="truncate max-w-full sm:max-w-48 hidden sm:inline">
                <span className="font-medium">Source:</span> {post.transcriptTitle}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
            {post.status === 'needs_review' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onAction('approve', post)}
                  className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">Approve</span>
                  <span className="sm:hidden">OK</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction('reject', post)}
                  className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs"
                >
                  <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">Reject</span>
                  <span className="sm:hidden">No</span>
                </Button>
              </>
            )}
            {post.status === 'approved' && (
              <Button
                size="sm"
                onClick={() => onAction('schedule', post)}
                className="h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                <span>Schedule Now</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction('edit', post)}
              className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs"
            >
              <Edit3 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}