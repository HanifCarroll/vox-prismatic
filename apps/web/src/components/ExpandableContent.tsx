'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExpandableContentProps {
  content: string;
  maxLength?: number;
  maxLines?: number;
  className?: string;
  expandText?: string;
  collapseText?: string;
  showLineCount?: boolean;
}

export function ExpandableContent({
  content,
  maxLength = 200,
  maxLines = 3,
  className = '',
  expandText = 'Show more',
  collapseText = 'Show less',
  showLineCount = false
}: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const shouldTruncate = content.length > maxLength;
  const displayContent = isExpanded ? content : content.substring(0, maxLength);
  
  const lineCount = content.split('\n').length;
  
  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'whitespace-pre-wrap',
        !isExpanded && shouldTruncate && `line-clamp-${maxLines}`
      )}>
        {displayContent}
        {!isExpanded && shouldTruncate && '...'}
      </div>
      
      {shouldTruncate && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                {collapseText}
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                {expandText}
                {showLineCount && ` (${lineCount} lines)`}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Tooltip preview for hover interactions
interface ContentTooltipProps {
  content: string;
  children: React.ReactNode;
  maxLength?: number;
}

export function ContentTooltip({ content, children, maxLength = 500 }: ContentTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      
      {isVisible && (
        <div className="absolute z-50 bottom-full mb-2 left-0 w-80 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="text-sm text-gray-700 max-h-48 overflow-y-auto">
            {content.substring(0, maxLength)}
            {content.length > maxLength && '...'}
          </div>
        </div>
      )}
    </div>
  );
}