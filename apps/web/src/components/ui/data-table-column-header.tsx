import { Column } from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SmartTooltip } from "./smart-tooltip"
import { TableActionMenu } from "./table-action-menu"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const currentSort = column.getIsSorted();
  const canSort = column.getCanSort();

  const handleSort = () => {
    if (!canSort) return;
    
    if (currentSort === false) {
      // No sort → ascending
      column.toggleSorting(false)
    } else if (currentSort === "asc") {
      // Ascending → descending
      column.toggleSorting(true)
    } else {
      // Descending → no sort
      column.clearSorting()
    }
  }

  // Non-sortable columns get simple styling
  if (!canSort) {
    return (
      <div className={cn("px-2 py-1", className)}>
        <span className="text-sm font-semibold text-gray-900 select-none">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "group flex items-center justify-between min-h-[40px] px-2 py-1",
      "transition-all duration-200",
      className
    )}>
      {/* Main clickable sort area */}
      <SmartTooltip
        content={
          currentSort === "asc" 
            ? "Sorted ascending. Click to sort descending." 
            : currentSort === "desc"
            ? "Sorted descending. Click to clear sort."
            : "Click to sort ascending."
        }
        variant="help"
        disabled={!canSort}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSort}
          className={cn(
            "flex-1 justify-start h-auto p-1 -m-1",
            "hover:bg-transparent focus:bg-transparent",
            "text-left font-normal"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              "text-sm font-semibold truncate select-none",
              currentSort ? "text-gray-900" : "text-gray-700",
              "group-hover:text-gray-900 transition-colors"
            )}>
              {title}
            </span>
            
            {/* Sort indicator with better animations */}
            <div className={cn(
              "flex items-center justify-center transition-all duration-200",
              currentSort ? "opacity-100" : "opacity-0 group-hover:opacity-60"
            )}>
              {currentSort === "desc" ? (
                <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
              ) : currentSort === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              )}
            </div>
          </div>
        </Button>
      </SmartTooltip>
      
      {/* Action menu - appears on hover */}
      <TableActionMenu column={column} />
    </div>
  )
}