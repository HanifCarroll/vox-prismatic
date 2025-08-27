"use client"

import * as React from "react"
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
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DataTablePagination } from "./data-table-pagination"
import { DataTableToolbar } from "./data-table-toolbar"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onRowSelectionChange?: (selectedRows: TData[]) => void
  toolbar?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey = "",
  searchPlaceholder = "Filter...",
  onRowSelectionChange,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
  const [draggedColumn, setDraggedColumn] = React.useState<string | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = React.useState<string | null>(null)
  
  // Load saved column sizes and order after hydration
  React.useEffect(() => {
    const savedSizes = localStorage.getItem('table-column-sizes')
    if (savedSizes) {
      try {
        const parsedSizes = JSON.parse(savedSizes)
        setColumnSizing(parsedSizes)
      } catch (e) {
        console.error('Failed to parse saved column sizes', e)
      }
    }
    
    const savedOrder = localStorage.getItem('table-column-order')
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder)
        setColumnOrder(parsedOrder)
      } catch (e) {
        console.error('Failed to parse saved column order', e)
      }
    }
  }, [])
  
  // Save column sizes to localStorage when they change
  React.useEffect(() => {
    if (Object.keys(columnSizing).length > 0) {
      localStorage.setItem('table-column-sizes', JSON.stringify(columnSizing))
    }
  }, [columnSizing])
  
  // Save column order to localStorage when it changes
  React.useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem('table-column-order', JSON.stringify(columnOrder))
    }
  }, [columnOrder])
  
  // Store initial column IDs separately to avoid circular dependency
  const [initialColumnIds, setInitialColumnIds] = React.useState<string[]>([])
  
  // Get preview order when dragging
  const getPreviewOrder = React.useCallback(() => {
    if (!draggedColumn || !draggedOverColumn || draggedColumn === draggedOverColumn) {
      return columnOrder
    }
    
    const currentOrder = columnOrder.length > 0 
      ? columnOrder 
      : initialColumnIds
    
    const draggedIndex = currentOrder.indexOf(draggedColumn)
    const targetIndex = currentOrder.indexOf(draggedOverColumn)
    
    if (draggedIndex === -1 || targetIndex === -1) return currentOrder
    
    const previewOrder = [...currentOrder]
    previewOrder.splice(draggedIndex, 1)
    previewOrder.splice(targetIndex, 0, draggedColumn)
    
    return previewOrder
  }, [draggedColumn, draggedOverColumn, columnOrder, initialColumnIds])
  
  // Handle column drag and drop
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
  }
  
  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedColumn && draggedColumn !== columnId) {
      setDraggedOverColumn(columnId)
    }
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    
    if (!draggedColumn || draggedColumn === targetColumnId) {
      return
    }
    
    const currentOrder = columnOrder.length > 0 
      ? columnOrder 
      : initialColumnIds
    
    const draggedIndex = currentOrder.indexOf(draggedColumn)
    const targetIndex = currentOrder.indexOf(targetColumnId)
    
    if (draggedIndex === -1 || targetIndex === -1) return
    
    const newOrder = [...currentOrder]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedColumn)
    
    setColumnOrder(newOrder)
    setDraggedColumn(null)
    setDraggedOverColumn(null)
  }
  
  const handleDragEnd = () => {
    setDraggedColumn(null)
    setDraggedOverColumn(null)
  }

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: 'onChange',
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
      columnOrder: draggedColumn ? getPreviewOrder() : columnOrder,
    },
  })

  // Set initial column IDs when table is created
  React.useEffect(() => {
    if (initialColumnIds.length === 0 && table) {
      const columnIds = table.getAllFlatColumns().map(col => col.id)
      setInitialColumnIds(columnIds)
    }
  }, [table, initialColumnIds.length])

  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onRowSelectionChange(selectedRows)
    }
  }, [rowSelection, table, onRowSelectionChange])

  return (
    <div className="space-y-4">
      <DataTableToolbar 
        table={table} 
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        toolbar={toolbar}
      />
      
      <div className="rounded-md border overflow-auto">
        <Table style={{ minWidth: table.getCenterTotalSize() }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canDrag = !header.isPlaceholder && header.id !== 'select' && header.id !== 'actions'
                  
                  return (
                    <TableHead 
                      key={header.id} 
                      colSpan={header.colSpan}
                      draggable={canDrag}
                      onDragStart={canDrag ? (e) => handleDragStart(e, header.id) : undefined}
                      onDragEnter={canDrag ? (e) => handleDragEnter(e, header.id) : undefined}
                      onDragOver={canDrag ? handleDragOver : undefined}
                      onDrop={canDrag ? (e) => handleDrop(e, header.id) : undefined}
                      onDragEnd={canDrag ? handleDragEnd : undefined}
                      style={{
                        width: header.getSize(),
                        position: 'relative',
                        cursor: canDrag ? 'move' : 'default',
                        opacity: draggedColumn === header.id ? 0.5 : 1,
                        transition: 'all 0.2s ease',
                        transform: draggedColumn && draggedColumn !== header.id ? 'translateX(0)' : undefined,
                        backgroundColor: draggedOverColumn === header.id && draggedColumn !== header.id ? 'rgba(59, 130, 246, 0.05)' : undefined,
                      }}
                      className={``}
                    >
                      {draggedColumn && draggedOverColumn === header.id && draggedColumn !== header.id && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                          style={{ animation: 'pulse 1s infinite' }}
                        />
                      )}
                      {canDrag && (
                        <div 
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          style={{ cursor: 'move' }}
                        >
                          <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
                            <circle cx="2" cy="2" r="1.5" />
                            <circle cx="8" cy="2" r="1.5" />
                            <circle cx="2" cy="8" r="1.5" />
                            <circle cx="8" cy="8" r="1.5" />
                            <circle cx="2" cy="14" r="1.5" />
                            <circle cx="8" cy="14" r="1.5" />
                          </svg>
                        </div>
                      )}
                      <div className={canDrag ? 'pl-6' : ''}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </div>
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none transition-colors ${
                            header.column.getIsResizing() 
                              ? 'bg-blue-500' 
                              : 'bg-gray-200 hover:bg-gray-400'
                          }`}
                          style={{
                            transform: 'translateX(50%)',
                            zIndex: 1
                          }}
                        >
                          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-3 h-8" />
                        </div>
                      )}
                    </TableHead>
                  )
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
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <DataTablePagination table={table} />
    </div>
  )
}