'use client';

import type { PostView } from '@/types';
import { getPlatformConfig } from '@/constants/platforms';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DateDisplay } from '@/components/date';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { CharacterCount } from '@/components/CharacterCount';
import { ExpandableContent } from '@/components/ExpandableContent';
import Link from 'next/link';
import { 
  Edit3, 
  Check, 
  X, 
  Archive, 
  Calendar, 
  Eye
} from 'lucide-react';

interface PostCardProps {
  post: PostView;
  onAction: (action: string, post: PostView) => void;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  loadingStates?: Record<string, boolean>;
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

export default function PostCard({ post, onAction, isSelected, onSelect, loadingStates = {} }: PostCardProps) {
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

  // Helper to get loading state for specific action
  const isActionLoading = (action: string) => loadingStates[`${action}-${post.id}`] || false;

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

          {/* View Details Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction('view', post)}
            className="h-8 w-8 p-0"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="py-3 px-3 sm:px-6">
        {/* Enhanced content preview with expandable text */}
        <div className="text-xs sm:text-sm text-gray-700 mb-3">
          <ExpandableContent 
            content={post.content}
            maxLength={200}
            maxLines={3}
            expandText="Show full post"
            collapseText="Show less"
          />
        </div>


        {/* Metrics with enhanced character count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1">
            <span className="font-medium text-gray-500">Characters:</span>
            <CharacterCount 
              count={post.characterCount || post.content.length}
              limit={platform.charLimit}
              platform={post.platform}
              size="sm"
              showProgress={true}
            />
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <span className="font-medium hidden sm:inline">Created:</span>
            <span className="font-medium sm:hidden">Date:</span>
            <DateDisplay date={post.createdAt} className="truncate" />
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 px-3 sm:px-6 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 sm:gap-0 text-[10px] sm:text-xs text-gray-500">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 order-2 sm:order-1">
            {post.insightId && post.insightTitle && (
              <Link 
                href={`/insights?highlight=${post.insightId}`}
                className="truncate max-w-full sm:max-w-48 hover:text-blue-600 transition-colors group"
              >
                <span className="font-medium">From:</span>{' '}
                <span className="group-hover:underline">{post.insightTitle}</span>
              </Link>
            )}
            {!post.insightId && post.insightTitle && (
              <span className="truncate max-w-full sm:max-w-48">
                <span className="font-medium">From:</span> {post.insightTitle}
              </span>
            )}
            {post.transcriptId && post.transcriptTitle && (
              <Link 
                href={`/transcripts?highlight=${post.transcriptId}`}
                className="truncate max-w-full sm:max-w-48 hidden sm:inline hover:text-green-600 transition-colors group"
              >
                <span className="font-medium">Source:</span>{' '}
                <span className="group-hover:underline">{post.transcriptTitle}</span>
              </Link>
            )}
            {!post.transcriptId && post.transcriptTitle && (
              <span className="truncate max-w-full sm:max-w-48 hidden sm:inline">
                <span className="font-medium">Source:</span> {post.transcriptTitle}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 order-1 sm:order-2 w-full sm:w-auto justify-end">
            {/* Primary Actions (Prominent) */}
            {post.status === 'needs_review' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onAction('approve', post)}
                  disabled={isActionLoading('approve')}
                  className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {isActionLoading('approve') ? (
                    <ButtonSpinner size="sm" />
                  ) : (
                    <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  )}
                  <span className="hidden sm:inline">
                    {isActionLoading('approve') ? 'Approving...' : 'Approve'}
                  </span>
                  <span className="sm:hidden">
                    {isActionLoading('approve') ? '...' : 'OK'}
                  </span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction('reject', post)}
                  disabled={isActionLoading('reject')}
                  className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {isActionLoading('reject') ? (
                    <ButtonSpinner size="sm" />
                  ) : (
                    <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  )}
                  <span className="hidden sm:inline">
                    {isActionLoading('reject') ? 'Rejecting...' : 'Reject'}
                  </span>
                  <span className="sm:hidden">
                    {isActionLoading('reject') ? '...' : 'No'}
                  </span>
                </Button>
              </>
            )}
            {post.status === 'approved' && (
              <Button
                size="sm"
                onClick={() => onAction('schedule', post)}
                disabled={isActionLoading('schedule')}
                className="h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {isActionLoading('schedule') ? (
                  <ButtonSpinner size="sm" />
                ) : (
                  <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                )}
                <span>{isActionLoading('schedule') ? 'Scheduling...' : 'Schedule Now'}</span>
              </Button>
            )}
            
            {/* Secondary Actions (Smaller) */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction('edit', post)}
              disabled={isActionLoading('edit')}
              className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs disabled:opacity-50"
            >
              {isActionLoading('edit') ? (
                <ButtonSpinner size="sm" />
              ) : (
                <Edit3 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
              )}
              {isActionLoading('edit') ? 'Editing...' : 'Edit'}
            </Button>
            
            {/* Status-specific secondary actions */}
            {(['rejected', 'published', 'failed'].includes(post.status) || 
              (post.status === 'approved')) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction('review', post)}
                disabled={isActionLoading('review')}
                className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs text-yellow-600 hover:bg-yellow-50 disabled:opacity-50"
                title="Back to Review"
              >
                {isActionLoading('review') ? (
                  <ButtonSpinner size="sm" />
                ) : (
                  <Edit3 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                )}
                <span className="hidden sm:inline ml-0.5">
                  {isActionLoading('review') ? 'Moving...' : 'Review'}
                </span>
              </Button>
            )}
            
            {/* Archive action (only if not archived) */}
            {post.status !== 'archived' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction('archive', post)}
                disabled={isActionLoading('archive')}
                className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                title="Archive"
              >
                {isActionLoading('archive') ? (
                  <ButtonSpinner size="sm" />
                ) : (
                  <Archive className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                )}
                <span className="hidden sm:inline ml-0.5">
                  {isActionLoading('archive') ? 'Archiving...' : 'Archive'}
                </span>
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}