
import { Calendar, Edit3, Check, X, Archive, Eye, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { BaseCard } from './BaseCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CharacterCount } from '@/components/CharacterCount';
import { TimeAgoDisplay } from '@/components/date';
import { getPlatformConfig } from '@/constants/platforms';
import type { PostView } from '@/types';

interface PostCardProps {
  post: PostView;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onView?: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onSchedule?: () => void;
  onArchive?: () => void;
  isLoading?: boolean;
}

// Map status to badge variant and color
const statusConfig: Record<string, {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
  className: string;
}> = {
  needs_review: {
    variant: 'secondary',
    label: 'Review',
    className: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  approved: {
    variant: 'default',
    label: 'Approved',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  rejected: {
    variant: 'destructive',
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
  scheduled: {
    variant: 'default',
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  published: {
    variant: 'default',
    label: 'Published',
    className: 'bg-gray-100 text-gray-800 border-gray-300',
  },
  draft: {
    variant: 'outline',
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  archived: {
    variant: 'outline',
    label: 'Archived',
    className: 'bg-gray-100 text-gray-600 border-gray-300',
  },
  failed: {
    variant: 'destructive',
    label: 'Failed',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
};

export function PostCard({
  post,
  selected = false,
  onSelect,
  onView,
  onEdit,
  onApprove,
  onReject,
  onSchedule,
  onArchive,
  isLoading = false,
}: PostCardProps) {
  const platform = getPlatformConfig(post.platform);
  const status = statusConfig[post.status] || statusConfig.draft;
  const PlatformIcon = platform.icon;
  
  // Calculate character limit percentage
  const percentage = ((post.content?.length || 0) / platform.charLimit) * 100;
  const isNearLimit = percentage >= 80;
  const isOverLimit = (post.content?.length || 0) > platform.charLimit;

  return (
    <BaseCard
      selected={selected}
      onSelect={onSelect}
      onClick={onView}
      disabled={isLoading}
    >
      <div className="space-y-3">
        {/* Header: Platform and Status */}
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="outline"
            className={`${platform.color} text-white border-none`}
          >
            <PlatformIcon className="w-3 h-3 mr-1" />
            {platform.label}
          </Badge>
          
          <div className="flex items-center gap-2">
            {/* Status badge */}
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
            
            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {post.status === 'approved' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onSchedule}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base text-gray-900 line-clamp-2">
          {post.title}
        </h3>

        {/* Content preview */}
        <p className="text-sm text-gray-600 line-clamp-3">
          {post.content}
        </p>

        {/* Character count and limit indicator */}
        <div className="flex items-center justify-between">
          <CharacterCount
            count={post.content?.length || 0}
            limit={platform.charLimit}
            platform={post.platform}
            size="sm"
            showProgress={true}
          />
          {isOverLimit && (
            <span className="text-xs text-red-600 font-medium">
              Over limit
            </span>
          )}
          {!isOverLimit && isNearLimit && (
            <span className="text-xs text-amber-600">
              Near limit
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-1 text-xs text-gray-500">
          {/* Scheduled date if applicable */}
          {post.scheduledFor && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Scheduled for {format(post.scheduledFor, "MMM d 'at' h:mm a")}</span>
            </div>
          )}
          
          {/* Source insight */}
          {post.insightTitle && (
            <div className="flex items-center gap-1">
              <span>From insight: </span>
              <span className="text-blue-600 truncate max-w-[200px]">
                {post.insightTitle}
              </span>
            </div>
          )}
          
          {/* Created date */}
          <div className="flex items-center gap-1">
            <span>Created </span>
            <TimeAgoDisplay date={post.createdAt} />
          </div>
        </div>

        {/* Actions based on status */}
        {post.status === 'needs_review' && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onView?.();
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.();
              }}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onReject?.();
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {post.status === 'approved' && !post.scheduledFor && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onSchedule?.();
              }}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Schedule
            </Button>
          </div>
        )}
      </div>
    </BaseCard>
  );
}