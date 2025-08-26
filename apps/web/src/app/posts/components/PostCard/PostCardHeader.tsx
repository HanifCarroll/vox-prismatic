import { memo } from 'react';
import type { PostView } from '@/types';
import { getPlatformConfig } from '@/constants/platforms';
import { CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { statusConfig } from './types';

interface PostCardHeaderProps {
  post: PostView;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}

export const PostCardHeader = memo(function PostCardHeader({ 
  post, 
  isSelected, 
  onSelect 
}: PostCardHeaderProps) {
  const platform = getPlatformConfig(post.platform);
  
  // Add status validation with fallback
  const status = statusConfig[post.status] || {
    variant: 'secondary' as const,
    label: 'Unknown Status',
    color: 'text-gray-500'
  };

  return (
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
      </div>
    </CardHeader>
  );
});