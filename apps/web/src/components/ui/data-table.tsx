"use client";

import * as React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ColumnSizingState,
  ColumnOrderState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { DraggableColumnHeader } from "./draggable-column-header";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  toolbar?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey = "",
  searchPlaceholder = "Filter...",
  onRowSelectionChange,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);

  // Load saved column sizes and order after hydration
  React.useEffect(() => {
    const savedSizes = localStorage.getItem("table-column-sizes");
    if (savedSizes) {
      try {
        const parsedSizes = JSON.parse(savedSizes);
        setColumnSizing(parsedSizes);
      } catch (e) {
        console.error("Failed to parse saved column sizes", e);
      }
    }

    const savedOrder = localStorage.getItem("table-column-order");
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        setColumnOrder(parsedOrder);
      } catch (e) {
        console.error("Failed to parse saved column order", e);
      }
    }
  }, []);

  // Save column sizes to localStorage when they change
  React.useEffect(() => {
    if (Object.keys(columnSizing).length > 0) {
      localStorage.setItem("table-column-sizes", JSON.stringify(columnSizing));
    }
  }, [columnSizing]);

  // Save column order to localStorage when it changes
  React.useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem("table-column-order", JSON.stringify(columnOrder));
    }
  }, [columnOrder]);

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    defaultColumn: {
      minSize: 50,
      maxSize: 500,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      columnSizing,
      columnOrder,
    },
  });

  // Handle column reordering with react-dnd
  const moveColumn = React.useCallback(
    (dragIndex: number, hoverIndex: number) => {
      if (dragIndex === hoverIndex) return;

      const headers = table.getHeaderGroups()[0]?.headers || [];
      const currentOrder = headers.map((h) => h.id);

      const draggedColumn = currentOrder[dragIndex];
      const newOrder = [...currentOrder];

      // Remove the dragged column
      newOrder.splice(dragIndex, 1);
      // Insert it at the new position
      newOrder.splice(hoverIndex, 0, draggedColumn);

      setColumnOrder(newOrder);
    },
    [table]
  );

  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table
        .getFilteredSelectedRowModel()
        .rows.map((row) => row.original);
      onRowSelectionChange(selectedRows);
    }
  }, [rowSelection, table, onRowSelectionChange]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <DataTableToolbar
          table={table}
          searchKey={searchKey}
          searchPlaceholder={searchPlaceholder}
          toolbar={toolbar}
        />

        <div className="rounded-xl border border-gray-200/60 overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto table-responsive">
            <Table
              className="w-full"
              style={{
                minWidth: table.getCenterTotalSize(),
                tableLayout: "fixed",
              }}
            >
              <TableHeader className="bg-transparent border-b border-gray-200/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => {
                    const canDrag =
                      !header.isPlaceholder &&
                      header.id !== "select" &&
                      header.id !== "actions";
                    const isAnyResizing = (table.getState() as any)
                      .columnSizingInfo?.isResizing;

                    // For draggable headers, use DraggableColumnHeader
                    if (canDrag) {
                      return (
                        <DraggableColumnHeader
                          key={header.id}
                          header={header}
                          index={index}
                          moveColumn={moveColumn}
                          canDrag={canDrag && !isAnyResizing}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          {header.column.getCanResize() &&
                            (() => {
                              const onMouseDown = header.getResizeHandler();
                              const onTouchStart = header.getResizeHandler();
                              const stopAndResizeMouse = (
                                e: React.MouseEvent
                              ) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onMouseDown(e as any);
                              };
                              const stopAndResizeTouch = (
                                e: React.TouchEvent
                              ) => {
                                e.stopPropagation();
                                onTouchStart(e as any);
                              };
                              return (
                                <div
                                  onMouseDown={stopAndResizeMouse}
                                  onTouchStart={stopAndResizeTouch}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none transition-all duration-200 ${
                                    header.column.getIsResizing()
                                      ? "bg-blue-500 w-2 shadow-sm"
                                      : "bg-transparent hover:bg-blue-300/60"
                                  }`}
                                  style={{
                                    transform: "translateX(50%)",
                                    zIndex: 20,
                                  }}
                                >
                                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-8" />
                                </div>
                              );
                            })()}
                        </DraggableColumnHeader>
                      );
                    }

                    // For non-draggable headers, render normally
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{
                          width: header.getSize(),
                          position: "relative",
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getCanResize() &&
                          (() => {
                            const onMouseDown = header.getResizeHandler();
                            const onTouchStart = header.getResizeHandler();
                            const stopAndResizeMouse = (
                              e: React.MouseEvent
                            ) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onMouseDown(e as any);
                            };
                            const stopAndResizeTouch = (
                              e: React.TouchEvent
                            ) => {
                              e.stopPropagation();
                              onTouchStart(e as any);
                            };
                            return (
                              <div
                                onMouseDown={stopAndResizeMouse}
                                onTouchStart={stopAndResizeTouch}
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none transition-all duration-200 ${
                                  header.column.getIsResizing()
                                    ? "bg-blue-500 w-2 shadow-sm"
                                    : "bg-transparent hover:bg-blue-300/60"
                                }`}
                                style={{
                                  transform: "translateX(50%)",
                                  zIndex: 20,
                                }}
                              >
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-8" />
                              </div>
                            );
                          })()}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
              </TableHeader>
              <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-sm">No results found.</div>
                      <div className="text-xs text-gray-400">
                        Try adjusting your search or filter criteria.
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DataTablePagination table={table} />
      </div>
    </DndProvider>
  );
}
