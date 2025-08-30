
import * as React from "react";
import { Column } from "@tanstack/react-table";
import { 
  MoreVertical, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  EyeOff,
  Move3D,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SmartTooltip } from "./smart-tooltip";

interface TableActionMenuProps<TData, TValue> {
  column: Column<TData, TValue>;
  className?: string;
}

export function TableActionMenu<TData, TValue>({
  column,
  className,
}: TableActionMenuProps<TData, TValue>) {
  const currentSort = column.getIsSorted();
  
  return (
    <DropdownMenu>
      <SmartTooltip content="Column options" variant="action" delayDuration={500}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 opacity-0 group-hover:opacity-100",
              "transition-all duration-200 ease-out",
              "hover:bg-transparent focus:opacity-100",
              className
            )}
          >
            <span className="sr-only">Column options</span>
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
      </SmartTooltip>
      <DropdownMenuContent 
        align="start" 
        className="w-48 bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl"
      >
        {column.getCanSort() && (
          <>
            <DropdownMenuItem 
              onClick={() => column.toggleSorting(false)}
              className="hover:bg-blue-50 focus:bg-blue-50 transition-colors"
            >
              <ArrowUp className="mr-2 h-3.5 w-3.5 text-blue-600" />
              <span className="font-medium">Sort Ascending</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => column.toggleSorting(true)}
              className="hover:bg-blue-50 focus:bg-blue-50 transition-colors"
            >
              <ArrowDown className="mr-2 h-3.5 w-3.5 text-blue-600" />
              <span className="font-medium">Sort Descending</span>
            </DropdownMenuItem>
            {currentSort && (
              <DropdownMenuItem 
                onClick={() => column.clearSorting()}
                className="hover:bg-gray-50 focus:bg-gray-50 transition-colors"
              >
                <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-gray-500" />
                <span>Clear Sort</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-gray-200" />
          </>
        )}
        
        {column.getCanHide() && (
          <>
            <DropdownMenuItem 
              onClick={() => column.toggleVisibility(false)}
              className="hover:bg-red-50 focus:bg-red-50 transition-colors"
            >
              <EyeOff className="mr-2 h-3.5 w-3.5 text-red-600" />
              <span>Hide Column</span>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="bg-gray-200" />
        <div className="px-2 py-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Move3D className="h-3 w-3" />
            <span>Drag column header to reorder</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}