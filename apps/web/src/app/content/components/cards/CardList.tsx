"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { FixedSizeGrid, FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CardSkeleton } from './CardSkeleton';
import type { TranscriptView, InsightView, PostView } from '@/types';

type CardItem = TranscriptView | InsightView | PostView;

interface CardListProps<T extends CardItem> {
  items: T[];
  renderCard: (item: T, selected: boolean, onSelect: (selected: boolean) => void) => ReactNode;
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  isLoading?: boolean;
  loadingCount?: number;
  emptyMessage?: string;
  className?: string;
  isTablet?: boolean;
  isMobile?: boolean;
}

/**
 * Virtual scrolling card list with responsive grid layout
 * Uses react-window for performance with large datasets
 */
export function CardList<T extends CardItem>({
  items,
  renderCard,
  selectedIds,
  onSelect,
  onSelectAll,
  isLoading = false,
  loadingCount = 6,
  emptyMessage = "No items to display",
  className,
  isTablet = false,
  isMobile = false,
}: CardListProps<T>) {
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions based on device type
  const columns = isMobile ? 1 : isTablet ? 2 : 1; // Desktop uses table view
  const cardHeight = 280; // Approximate card height
  const cardGap = 16;
  const horizontalPadding = 16;

  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(window.innerHeight - rect.top - 100); // Leave some space at bottom
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle selection for individual items
  const handleItemSelect = useCallback((id: string, selected: boolean) => {
    onSelect(id, selected);
  }, [onSelect]);

  // Check if all items are selected
  const allSelected = items.length > 0 && items.every(item => selectedIds.includes(item.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  // Loading state
  if (isLoading && items.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <CardSkeleton count={loadingCount} />
      </div>
    );
  }

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}>
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  // Single column list for mobile
  if (isMobile || columns === 1) {
    return (
      <div ref={containerRef} className={cn("relative", className)}>
        {/* Bulk selection bar */}
        {selectedIds.length > 0 && (
          <div className="sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected || someSelected}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
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

        {/* Virtual list */}
        <AutoSizer disableHeight>
          {({ width }) => (
            <FixedSizeList
              height={containerHeight}
              width={width}
              itemCount={items.length}
              itemSize={cardHeight + cardGap}
              overscanCount={2}
            >
              {({ index, style }) => {
                const item = items[index];
                const isSelected = selectedIds.includes(item.id);
                
                return (
                  <div
                    style={{
                      ...style,
                      padding: `0 ${horizontalPadding}px`,
                      paddingBottom: `${cardGap}px`,
                    }}
                  >
                    {renderCard(
                      item,
                      isSelected,
                      (selected) => handleItemSelect(item.id, selected)
                    )}
                  </div>
                );
              }}
            </FixedSizeList>
          )}
        </AutoSizer>
      </div>
    );
  }

  // Grid layout for tablet
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Bulk selection bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected || someSelected}
              onCheckedChange={(checked) => onSelectAll(!!checked)}
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

      {/* Virtual grid */}
      <AutoSizer disableHeight>
        {({ width }) => {
          const columnWidth = (width - horizontalPadding * 2 - cardGap * (columns - 1)) / columns;
          const rowCount = Math.ceil(items.length / columns);

          return (
            <FixedSizeGrid
              height={containerHeight}
              width={width}
              columnCount={columns}
              rowCount={rowCount}
              columnWidth={columnWidth + cardGap}
              rowHeight={cardHeight + cardGap}
              overscanRowCount={2}
            >
              {({ columnIndex, rowIndex, style }) => {
                const index = rowIndex * columns + columnIndex;
                if (index >= items.length) return null;

                const item = items[index];
                const isSelected = selectedIds.includes(item.id);

                return (
                  <div
                    style={{
                      ...style,
                      padding: `0 ${cardGap / 2}px ${cardGap}px ${cardGap / 2}px`,
                      paddingLeft: columnIndex === 0 ? horizontalPadding : cardGap / 2,
                      paddingRight: columnIndex === columns - 1 ? horizontalPadding : cardGap / 2,
                    }}
                  >
                    {renderCard(
                      item,
                      isSelected,
                      (selected) => handleItemSelect(item.id, selected)
                    )}
                  </div>
                );
              }}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>
    </div>
  );
}

/**
 * Simple card list without virtual scrolling for small datasets
 */
export function SimpleCardList<T extends CardItem>({
  items,
  renderCard,
  selectedIds,
  onSelect,
  className,
  isTablet = false,
  isMobile = false,
}: Omit<CardListProps<T>, 'onSelectAll' | 'isLoading' | 'loadingCount' | 'emptyMessage'>) {
  const gridClassName = cn(
    "grid gap-4",
    isMobile ? "grid-cols-1" : isTablet ? "grid-cols-2" : "grid-cols-1",
    className
  );

  return (
    <div className={gridClassName}>
      {items.map(item => {
        const isSelected = selectedIds.includes(item.id);
        return (
          <div key={item.id}>
            {renderCard(
              item,
              isSelected,
              (selected) => onSelect(item.id, selected)
            )}
          </div>
        );
      })}
    </div>
  );
}