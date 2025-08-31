
import { Eye, CheckCircle, XCircle, MoreVertical, Sparkles, TrendingUp } from 'lucide-react';
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
import type { InsightView } from '@/types';

interface InsightCardProps {
  insight: InsightView;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onView?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onGeneratePosts?: () => void;
  onArchive?: () => void;
  isLoading?: boolean;
}

// Map post types to colors
const postTypeColors: Record<string, string> = {
  'Problem': 'bg-red-100 text-red-700 border-red-200',
  'Proof': 'bg-blue-100 text-blue-700 border-blue-200',
  'Framework': 'bg-purple-100 text-purple-700 border-purple-200',
  'Contrarian Take': 'bg-amber-100 text-amber-700 border-amber-200',
  'Mental Model': 'bg-green-100 text-green-700 border-green-200',
};

// Map status to badge variant
const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  needs_review: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  draft: 'outline',
  archived: 'outline',
};

export function InsightCard({
  insight,
  selected = false,
  onSelect,
  onView,
  onApprove,
  onReject,
  onGeneratePosts,
  onArchive,
  isLoading = false,
}: InsightCardProps) {
  const handleMoreActions = (action: string) => {
    switch (action) {
      case 'generate':
        onGeneratePosts?.();
        break;
      case 'archive':
        onArchive?.();
        break;
    }
  };

  // Calculate score percentage for visual indicator
  const scorePercentage = (insight.totalScore / 20) * 100;
  
  return (
    <BaseCard
      selected={selected}
      onSelect={onSelect}
      onClick={onView}
      disabled={isLoading}
    >
      <div className="flex flex-col h-full gap-2">
        {/* Header: Type and Status */}
        <div className="flex items-center justify-between gap-2">
          <Badge 
            variant="outline" 
            className={`text-xs ${postTypeColors[insight.postType] || 'bg-gray-100 text-gray-700'}`}
          >
            {insight.postType}
          </Badge>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">
                {insight.totalScore}
              </span>
            </div>
            
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
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleMoreActions('generate')}
                  disabled={insight.status !== 'approved'}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Posts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMoreActions('archive')}>
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight">
          {insight.title}
        </h3>

        {/* Summary */}
        <div className="flex-1 min-h-0">
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {insight.summary}
          </p>
        </div>

        {/* Score bar visualization (subtle) */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
            style={{ width: `${scorePercentage}%` }}
          />
        </div>

        {/* Status and metadata */}
        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mt-auto">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariants[insight.status] || 'default'} className="text-xs py-0">
              {insight.status.replace('_', ' ')}
            </Badge>
            <span className="capitalize">{insight.category}</span>
          </div>
          <TimeAgoDisplay date={insight.createdAt} />
        </div>

        {/* Quick actions for needs_review status */}
        {insight.status === 'needs_review' && (
          <div className="flex gap-1 pt-1">
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.();
              }}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onReject?.();
              }}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </BaseCard>
  );
}