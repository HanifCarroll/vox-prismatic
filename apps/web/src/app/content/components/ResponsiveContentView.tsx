"use client";

import { ReactNode, useMemo } from 'react';
import { LayoutGrid, TableIcon } from 'lucide-react';
import { useResponsiveView } from '@/hooks/useResponsiveView';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CardList, SimpleCardList } from './cards/CardList';
import { TranscriptCard } from './cards/TranscriptCard';
import { InsightCard } from './cards/InsightCard';
import { PostCard } from './cards/PostCard';
import type { TranscriptView, InsightView, PostView } from '@/types';

type ContentItem = TranscriptView | InsightView | PostView;
type ContentType = 'transcript' | 'insight' | 'post';

interface ResponsiveContentViewProps<T extends ContentItem> {
  type: ContentType;
  items: T[];
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onAction: (action: string, item: T) => void;
  isLoading?: boolean;
  loadingStates?: Record<string, boolean>;
  emptyMessage?: string;
  className?: string;
  renderTable: () => ReactNode;
  useVirtualScrolling?: boolean;
}

/**
 * Responsive wrapper that switches between table and card views based on device type
 * Preserves all functionality across both view modes
 */
export function ResponsiveContentView<T extends ContentItem>({
  type,
  items,
  selectedIds,
  onSelect,
  onSelectAll,
  onAction,
  isLoading = false,
  loadingStates = {},
  emptyMessage = "No items to display",
  className,
  renderTable,
  useVirtualScrolling = true,
}: ResponsiveContentViewProps<T>) {
  const {
    viewMode,
    effectiveView,
    isTablet,
    isMobile,
    toggleView,
  } = useResponsiveView({
    storageKey: `content-view-mode-${type}`,
  });

  // Get the appropriate card component based on type
  const renderCard = useMemo(() => {
    switch (type) {
      case 'transcript':
        return (item: T, selected: boolean, onItemSelect: (selected: boolean) => void) => {
          const transcript = item as TranscriptView;
          return (
            <TranscriptCard
              transcript={transcript}
              selected={selected}
              onSelect={onItemSelect}
              onView={() => onAction('view', item)}
              onEdit={() => onAction('edit', item)}
              onClean={() => onAction('clean', item)}
              onProcess={() => onAction('process', item)}
              onDelete={() => onAction('delete', item)}
              isLoading={loadingStates[`${transcript.status}-${transcript.id}`]}
            />
          );
        };
      
      case 'insight':
        return (item: T, selected: boolean, onItemSelect: (selected: boolean) => void) => {
          const insight = item as InsightView;
          return (
            <InsightCard
              insight={insight}
              selected={selected}
              onSelect={onItemSelect}
              onView={() => onAction('view', item)}
              onApprove={() => onAction('approve', item)}
              onReject={() => onAction('reject', item)}
              onGeneratePosts={() => onAction('generate', item)}
              onArchive={() => onAction('archive', item)}
              isLoading={loadingStates[`${insight.status}-${insight.id}`]}
            />
          );
        };
      
      case 'post':
        return (item: T, selected: boolean, onItemSelect: (selected: boolean) => void) => {
          const post = item as PostView;
          return (
            <PostCard
              post={post}
              selected={selected}
              onSelect={onItemSelect}
              onView={() => onAction('view', item)}
              onEdit={() => onAction('edit', item)}
              onApprove={() => onAction('approve', item)}
              onReject={() => onAction('reject', item)}
              onSchedule={() => onAction('schedule', item)}
              onArchive={() => onAction('archive', item)}
              isLoading={loadingStates[`${post.status}-${post.id}`]}
            />
          );
        };
      
      default:
        return () => null;
    }
  }, [type, onAction, loadingStates]);

  // Desktop always shows table view
  if (!isMobile && !isTablet) {
    return (
      <div className={className}>
        {renderTable()}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* View toggle for tablet (mobile is always cards) */}
      {isTablet && viewMode !== 'auto' && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleView}
            className="gap-2"
          >
            {effectiveView === 'table' ? (
              <>
                <LayoutGrid className="h-4 w-4" />
                Switch to Cards
              </>
            ) : (
              <>
                <TableIcon className="h-4 w-4" />
                Switch to Table
              </>
            )}
          </Button>
        </div>
      )}

      {/* Content view based on effective view mode */}
      {effectiveView === 'table' && !isMobile ? (
        // Table view (tablet only when manually selected)
        renderTable()
      ) : (
        // Card view (always on mobile, default/selectable on tablet)
        <>
          {useVirtualScrolling && items.length > 20 ? (
            <CardList
              items={items}
              renderCard={renderCard}
              selectedIds={selectedIds}
              onSelect={onSelect}
              onSelectAll={onSelectAll}
              isLoading={isLoading}
              emptyMessage={emptyMessage}
              isTablet={isTablet}
              isMobile={isMobile}
            />
          ) : (
            <SimpleCardList
              items={items}
              renderCard={renderCard}
              selectedIds={selectedIds}
              onSelect={onSelect}
              isTablet={isTablet}
              isMobile={isMobile}
            />
          )}
        </>
      )}
    </div>
  );
}