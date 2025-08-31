
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
import { TimeAgoDisplay } from '@/components/date';
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
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = {
  raw: { variant: 'secondary', label: 'Needs Cleaning', icon: Sparkles },
  cleaned: { variant: 'default', label: 'Cleaned', icon: CheckCircle },
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
      <div className="flex flex-col h-full gap-2">
        {/* Header: Status and Actions */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant={status.variant} className="text-xs">
            {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
            {status.label}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
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

        {/* Title */}
        <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight">
          {transcript.title}
        </h3>

        {/* Content preview */}
        <div className="flex-1 min-h-0">
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {transcript.cleanedContent || transcript.rawContent}
          </p>
        </div>

        {/* Metadata - compact row */}
        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mt-auto">
          <div className="flex items-center gap-2 truncate">
            <SourceIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{sourceType.label}</span>
            {transcript.duration && (
              <>
                <span>•</span>
                <span>{formatDuration(transcript.duration)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span>{formatWordCount(transcript.wordCount)}</span>
          </div>
        </div>

        {/* Created date */}
        <div className="text-xs text-gray-400">
          <TimeAgoDisplay date={transcript.createdAt} />
        </div>
      </div>
    </BaseCard>
  );
}