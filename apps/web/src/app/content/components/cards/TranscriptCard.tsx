"use client";

import { FileText, Sparkles, PlayCircle, MoreVertical, Clock, CheckCircle } from 'lucide-react';
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
import { TimeAgo } from '@/components/date';
import type { TranscriptView } from '@/types';

interface TranscriptCardProps {
  transcript: TranscriptView;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onView?: () => void;
  onEdit?: () => void;
  onClean?: () => void;
  onProcess?: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

// Map status to badge variant and color
const statusConfig: Record<string, { 
  variant: 'default' | 'success' | 'warning' | 'destructive';
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = {
  raw: { variant: 'warning', label: 'Needs Cleaning', icon: Sparkles },
  processing: { variant: 'default', label: 'Processing', icon: Clock },
  cleaned: { variant: 'success', label: 'Cleaned', icon: CheckCircle },
  insights_generated: { variant: 'success', label: 'Insights Ready' },
  posts_created: { variant: 'success', label: 'Posts Created' },
  error: { variant: 'destructive', label: 'Error' },
};

// Map source type to icon/label
const sourceTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  recording: { label: 'Recording', icon: PlayCircle },
  upload: { label: 'Upload', icon: FileText },
  manual: { label: 'Manual', icon: FileText },
  youtube: { label: 'YouTube', icon: PlayCircle },
  podcast: { label: 'Podcast', icon: PlayCircle },
  article: { label: 'Article', icon: FileText },
};

export function TranscriptCard({
  transcript,
  selected = false,
  onSelect,
  onView,
  onEdit,
  onClean,
  onProcess,
  onDelete,
  isLoading = false,
}: TranscriptCardProps) {
  const status = statusConfig[transcript.status] || statusConfig.raw;
  const sourceType = transcript.sourceType 
    ? sourceTypeConfig[transcript.sourceType] || sourceTypeConfig.manual
    : sourceTypeConfig.manual;
  const StatusIcon = status.icon;
  const SourceIcon = sourceType.icon;

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k words`;
    }
    return `${count} words`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <BaseCard
      selected={selected}
      onSelect={onSelect}
      onClick={onView}
      disabled={isLoading}
    >
      <div className="space-y-3">
        {/* Header: Source type and Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <SourceIcon className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">{sourceType.label}</span>
            {transcript.duration && (
              <>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{formatDuration(transcript.duration)}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Status badge */}
            <Badge variant={status.variant} className="text-xs">
              {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
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
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {transcript.status === 'raw' && (
                  <DropdownMenuItem onClick={onClean}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Clean Transcript
                  </DropdownMenuItem>
                )}
                {transcript.status === 'cleaned' && (
                  <DropdownMenuItem onClick={onProcess}>
                    Process for Insights
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-red-600"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base text-gray-900 line-clamp-2">
          {transcript.title}
        </h3>

        {/* Content preview */}
        <p className="text-sm text-gray-600 line-clamp-3">
          {transcript.cleanedContent || transcript.rawContent}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{formatWordCount(transcript.wordCount)}</span>
          <span>•</span>
          <TimeAgo date={transcript.createdAt} />
          {transcript.fileName && (
            <>
              <span>•</span>
              <span className="truncate max-w-[150px]">{transcript.fileName}</span>
            </>
          )}
        </div>

        {/* Actions based on status */}
        {transcript.status === 'raw' && (
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
              Edit
            </Button>
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onClean?.();
              }}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Clean
            </Button>
          </div>
        )}

        {transcript.status === 'cleaned' && (
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
              View
            </Button>
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onProcess?.();
              }}
            >
              Generate Insights
            </Button>
          </div>
        )}
      </div>
    </BaseCard>
  );
}