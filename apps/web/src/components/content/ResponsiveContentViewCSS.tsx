
import { ReactNode, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CardListCSS } from './cards/CardListCSS';
import { TranscriptCard } from './cards/TranscriptCard';
import { InsightCard } from './cards/InsightCard';
import { PostCard } from './cards/PostCard';
import type { TranscriptView, InsightView, PostView } from '@/types';

type ContentItem = TranscriptView | InsightView | PostView;
type ContentType = 'transcript' | 'insight' | 'post';

interface ResponsiveContentViewCSSProps<T extends ContentItem> {
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
}

/**
 * CSS-only responsive view that shows table on desktop/tablet and cards on mobile
 * No JavaScript viewport detection = no hydration issues
 */
export function ResponsiveContentViewCSS<T extends ContentItem>({
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
}: ResponsiveContentViewCSSProps<T>) {
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

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("h-full", className)}>
      {/* Desktop/Tablet View - Table (hidden on mobile) */}
      <div className="hidden md:block h-full">
        {renderTable()}
      </div>
      
      {/* Mobile View - Cards (hidden on desktop/tablet) */}
      <div className="block md:hidden h-full overflow-auto">
        <CardListCSS
          items={items}
          renderCard={renderCard}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onSelectAll={onSelectAll}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          className="px-4"
        />
      </div>
    </div>
  );
}