import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterCountProps {
  count: number;
  limit: number;
  platform: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function CharacterCount({ 
  count, 
  limit, 
  platform, 
  size = 'md',
  showProgress = false 
}: CharacterCountProps) {
  const percentage = (count / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isOverLimit = count > limit;
  
  const sizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  };

  const getColorClasses = () => {
    if (isOverLimit) return 'text-red-600 font-bold';
    if (isNearLimit) return 'text-yellow-600 font-medium';
    return 'text-gray-600';
  };

  const getProgressColor = () => {
    if (isOverLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-1">
      {isOverLimit && size !== 'sm' && (
        <AlertTriangle className="h-3 w-3 text-red-500" />
      )}
      <span className={cn('font-mono', sizeClasses[size], getColorClasses())}>
        {count.toLocaleString()}
      </span>
      <span className={cn('text-gray-400', sizeClasses[size])}>
        / {limit.toLocaleString()}
      </span>
      {showProgress && (
        <div className="flex-1 max-w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn('h-full transition-all duration-200', getProgressColor())}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      {isOverLimit && size !== 'sm' && (
        <span className={cn('text-red-600', sizeClasses[size])}>
          (+{(count - limit).toLocaleString()})
        </span>
      )}
    </div>
  );
}

// Platform preview component
interface PlatformPreviewProps {
  content: string;
  platform: 'x' | 'linkedin';
  title?: string;
}

export function PlatformPreview({ content, platform, title }: PlatformPreviewProps) {
  const truncatedContent = platform === 'x' && content.length > 280 
    ? content.substring(0, 280) + '...'
    : content;

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${
          platform === 'x' ? 'bg-black' : 'bg-blue-600'
        }`} />
        <span className="text-xs font-medium text-gray-600">
          {platform === 'x' ? 'X/Twitter' : 'LinkedIn'} Preview
        </span>
      </div>
      {title && (
        <h4 className="text-sm font-medium text-gray-900 mb-1">{title}</h4>
      )}
      <p className="text-sm text-gray-700 whitespace-pre-wrap">
        {truncatedContent}
      </p>
      {platform === 'x' && content.length > 280 && (
        <p className="text-xs text-gray-500 mt-1 italic">
          Content will be truncated at 280 characters
        </p>
      )}
    </div>
  );
}