
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface MobilePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageRange: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
  variant?: 'full' | 'compact' | 'minimal';
  showPageSizeSelector?: boolean;
  showItemCount?: boolean;
  loading?: boolean;
}

/**
 * Touch-optimized pagination controls for mobile devices
 * Features larger tap targets and simplified navigation
 */
export function MobilePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  hasNextPage,
  hasPreviousPage,
  pageRange,
  onPageChange,
  onPageSizeChange,
  className,
  variant = 'compact',
  showPageSizeSelector = false,
  showItemCount = true,
  loading = false,
}: MobilePaginationProps) {
  
  // Calculate item range
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (variant === 'minimal') {
    return (
      <div className={cn(
        "flex items-center justify-between px-4 py-3 bg-white border-t",
        className
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage || loading}
          className="h-10 px-4"
        >
          <ChevronLeft className="h-5 w-5" />
          Previous
        </Button>
        
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || loading}
          className="h-10 px-4"
        >
          Next
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex flex-col gap-3 px-4 py-4 bg-white border-t",
        className
      )}>
        {/* Item count and page size selector */}
        <div className="flex items-center justify-between">
          {showItemCount && (
            <span className="text-sm text-gray-600">
              {totalItems === 0 ? (
                "No items"
              ) : (
                <>
                  Showing {startItem}-{endItem} of {totalItems}
                </>
              )}
            </span>
          )}
          
          {showPageSizeSelector && onPageSizeChange && (
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={loading}
            >
              <SelectTrigger className="h-9 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1 || loading}
              className="h-10 w-10"
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPreviousPage || loading}
              className="h-10 w-10"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
          </div>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage || loading}
              className="h-10 w-10"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages || loading}
              className="h-10 w-10"
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full variant with page number buttons
  return (
    <div className={cn(
      "flex flex-col gap-4 px-4 py-4 bg-white border-t",
      className
    )}>
      {/* Item count and page size */}
      {(showItemCount || showPageSizeSelector) && (
        <div className="flex items-center justify-between">
          {showItemCount && (
            <span className="text-sm text-gray-600">
              {totalItems === 0 ? (
                "No items"
              ) : (
                <>
                  {startItem}-{endItem} of {totalItems} items
                </>
              )}
            </span>
          )}
          
          {showPageSizeSelector && onPageSizeChange && (
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={loading}
            >
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    Show {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Pagination buttons */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage || loading}
          className="h-10 px-3"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Prev
        </Button>

        {/* Page number buttons */}
        <div className="flex gap-1">
          {pageRange[0] > 1 && (
            <>
              <Button
                variant={currentPage === 1 ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={loading}
                className="h-10 w-10 p-0"
              >
                1
              </Button>
              {pageRange[0] > 2 && (
                <span className="flex items-center px-2 text-gray-400">...</span>
              )}
            </>
          )}

          {pageRange.map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              disabled={loading}
              className="h-10 w-10 p-0"
            >
              {page}
            </Button>
          ))}

          {pageRange[pageRange.length - 1] < totalPages && (
            <>
              {pageRange[pageRange.length - 1] < totalPages - 1 && (
                <span className="flex items-center px-2 text-gray-400">...</span>
              )}
              <Button
                variant={currentPage === totalPages ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={loading}
                className="h-10 w-10 p-0"
              >
                {totalPages}
              </Button>
            </>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || loading}
          className="h-10 px-3"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Infinite scroll loading trigger
 * Shows when more content can be loaded
 */
export function InfiniteScrollTrigger({
  onLoadMore,
  hasMore,
  loading,
  itemsLoaded,
  totalItems,
  className,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  itemsLoaded: number;
  totalItems: number;
  className?: string;
}) {
  if (!hasMore && itemsLoaded === totalItems) {
    return (
      <div className={cn(
        "text-center py-8 text-sm text-gray-500",
        className
      )}>
        All {totalItems} items loaded
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center gap-3 py-8",
      className
    )}>
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={loading || !hasMore}
        className="h-10 px-6"
      >
        {loading ? (
          <>
            <span className="animate-pulse">Loading...</span>
          </>
        ) : hasMore ? (
          <>
            Load More ({totalItems - itemsLoaded} remaining)
          </>
        ) : (
          "No more items"
        )}
      </Button>
      
      {itemsLoaded > 0 && (
        <span className="text-xs text-gray-500">
          Showing {itemsLoaded} of {totalItems}
        </span>
      )}
    </div>
  );
}