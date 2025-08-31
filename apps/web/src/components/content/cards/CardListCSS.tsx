
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CardItem {
  id: string;
}

interface CardListCSSProps<T extends CardItem> {
  items: T[];
  renderCard: (
    item: T,
    selected: boolean,
    onSelect: (selected: boolean) => void
  ) => React.ReactNode;
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  isLoading?: boolean;
  loadingCount?: number;
  emptyMessage?: string;
  className?: string;
}

/**
 * CSS-only responsive card list that uses CSS Grid for layout
 * No JavaScript viewport detection needed
 */
export function CardListCSS<T extends CardItem>({
  items,
  renderCard,
  selectedIds,
  onSelect,
  onSelectAll,
  isLoading = false,
  loadingCount = 6,
  emptyMessage = "No items to display",
  className,
}: CardListCSSProps<T>) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3", className)}>
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Bulk selection bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-2 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected || someSelected}
              onCheckedChange={(checked) => onSelectAll(!!checked)}
              aria-label={allSelected ? "Deselect all" : "Select all"}
            />
            <span className="text-sm font-medium">
              {selectedIds.length} selected
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectAll(false)}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Card grid - responsive using CSS Grid */}
      <div 
        className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
        style={{ gridAutoRows: 'minmax(min-content, 1fr)' }}
      >
        {items.map(item => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <div key={item.id} className="min-w-0 h-full min-h-[200px]">
              {renderCard(
                item,
                isSelected,
                (selected) => onSelect(item.id, selected)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}