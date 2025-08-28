'use client';

import { 
  CheckSquare, 
  Square, 
  Filter,
  Calendar,
  Hash,
  RefreshCw
} from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface SmartSelectionProps {
  totalItems: number;
  selectedCount: number;
  filteredCount: number;
  onSelectAll: (selected: boolean) => void;
  onSelectFiltered: () => void;
  onSelectByStatus?: (status: string) => void;
  onSelectByPlatform?: (platform: string) => void;
  onInvertSelection?: () => void;
  onSelectDateRange?: (start: Date, end: Date) => void;
  statuses?: string[];
  platforms?: string[];
  platformLabel?: string;
}

export function SmartSelection({
  totalItems,
  selectedCount,
  filteredCount,
  onSelectAll,
  onSelectFiltered,
  onSelectByStatus,
  onSelectByPlatform,
  onInvertSelection,
  onSelectDateRange,
  statuses = [],
  platforms = [],
  platformLabel = 'platform'
}: SmartSelectionProps) {
  
  // Format status labels for better display with context-specific improvements
  const formatStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      // Transcript statuses
      'raw': 'Raw',
      'cleaned': 'Cleaned',
      
      // Insight and Post statuses  
      'needs_review': 'Needs Review',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'scheduled': 'Scheduled',
      'published': 'Published',
      'archived': 'Archived'
    };
    
    return statusLabels[status] || status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format platform labels for better display with context-specific improvements
  const formatPlatformLabel = (platform: string) => {
    const platformLabels: Record<string, string> = {
      // Platforms
      'linkedin': 'LinkedIn',
      'x': 'X (Twitter)',
      
      // Post Types (categories in insights)
      'Problem': 'Problem',
      'Proof': 'Proof', 
      'Framework': 'Framework',
      'Contrarian Take': 'Contrarian Take',
      'Mental Model': 'Mental Model'
    };
    
    return platformLabels[platform] || platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  return (
    <>
      {/* Basic selections */}
      <DropdownMenuItem onClick={() => onSelectAll(true)} className="gap-2">
        <CheckSquare className="h-4 w-4" />
        Select All ({totalItems})
      </DropdownMenuItem>
      
      <DropdownMenuItem onClick={() => onSelectAll(false)} className="gap-2">
        <Square className="h-4 w-4" />
        Deselect All
      </DropdownMenuItem>
      
      {filteredCount < totalItems && (
        <DropdownMenuItem onClick={onSelectFiltered} className="gap-2">
          <Filter className="h-4 w-4" />
          Select Filtered ({filteredCount})
        </DropdownMenuItem>
      )}
      
      {onInvertSelection && (
        <DropdownMenuItem onClick={onInvertSelection} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Invert Selection
        </DropdownMenuItem>
      )}

      {/* Status-based selection */}
      {onSelectByStatus && statuses.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            By Status
          </div>
          {statuses.map(status => (
            <DropdownMenuItem
              key={status}
              onClick={() => onSelectByStatus(status)}
              className="gap-2"
            >
              <Hash className="h-4 w-4" />
              {formatStatusLabel(status)}
            </DropdownMenuItem>
          ))}
        </>
      )}

      {/* Platform-based selection */}
      {onSelectByPlatform && platforms && platforms.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            By {formatPlatformLabel(platformLabel)}
          </div>
          {platforms.map(platform => (
            <DropdownMenuItem
              key={platform}
              onClick={() => onSelectByPlatform(platform)}
              className="gap-2"
            >
              <Hash className="h-4 w-4" />
              {formatPlatformLabel(platform)}
            </DropdownMenuItem>
          ))}
        </>
      )}

      {/* Date range selection */}
      {onSelectDateRange && (
        <>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            By Date
          </div>
          <DropdownMenuItem
            onClick={() => {
              const today = new Date();
              const weekAgo = new Date(today);
              weekAgo.setDate(weekAgo.getDate() - 7);
              onSelectDateRange(weekAgo, today);
            }}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Last 7 days
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const today = new Date();
              const monthAgo = new Date(today);
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              onSelectDateRange(monthAgo, today);
            }}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Last 30 days
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}