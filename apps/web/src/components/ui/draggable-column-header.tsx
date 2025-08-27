import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import type { Header } from "@tanstack/react-table";

interface DraggableColumnHeaderProps<TData, TValue> {
  header: Header<TData, TValue>;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  children: React.ReactNode;
  canDrag?: boolean;
}

const ItemType = {
  COLUMN: "column",
};

interface DragItem {
  index: number;
  id: string;
}

export function DraggableColumnHeader<TData, TValue>({
  header,
  index,
  moveColumn,
  children,
  canDrag = true,
}: DraggableColumnHeaderProps<TData, TValue>) {
  const ref = useRef<HTMLTableCellElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragOverLeft, setIsDragOverLeft] = React.useState(false);

  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: ItemType.COLUMN,
    item: (): DragItem => ({
      index,
      id: header.id,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag,
  });

  const [{ isOver, canDrop }, drop] = useDrop<DragItem, unknown, { isOver: boolean; canDrop: boolean }>({
    accept: ItemType.COLUMN,
    hover: (item: DragItem, monitor) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        setIsDragOverLeft(false);
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get horizontal middle
      const hoverMiddleX =
        (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      // Get pixels to the left
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      // Determine which side of the column we're on for visual feedback
      setIsDragOverLeft(hoverClientX < hoverMiddleX);

      // Only perform the move when the mouse has crossed half of the item's width
      // When dragging to the right, only move when the cursor is past 50%
      // When dragging to the left, only move when the cursor is before 50%
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
        return;
      }

      // Time to actually perform the action
      moveColumn(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Attach drop to the header cell and drag only to the handle
  drop(ref);

  React.useEffect(() => {
    if (canDrag && handleRef.current) {
      drag(handleRef);
    }
  }, [canDrag, drag]);

  // Clean up drag over state when not hovering
  React.useEffect(() => {
    if (!isOver) {
      setIsDragOverLeft(false);
    }
  }, [isOver]);

  return (
    <th
      ref={ref}
      colSpan={header.colSpan}
      style={{
        width: header.getSize(),
        position: "relative",
        cursor: "default",
        opacity: isDragging ? 0.6 : 1,
        transition: "all 0.2s ease",
        backgroundColor: "transparent",
      }}
      className={`relative border-r border-gray-200/60 last:border-r-0 ${
        isDragging ? "shadow-lg ring-1 ring-blue-500/20" : ""
      }`}
    >
      {/* Drop indicator line */}
      {isOver && canDrop && canDrag && (
        <div
          className="absolute top-0 bottom-0 w-1 bg-blue-500 z-10 shadow-sm rounded-full"
          style={{
            left: isDragOverLeft ? -2 : "auto",
            right: isDragOverLeft ? "auto" : -2,
            animation: "pulse 1.5s infinite",
          }}
        />
      )}
      {/* Drag handle - now hidden by default, shows on hover */}
      {canDrag && (
        <div
          ref={handleRef}
          className={`absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-all duration-200 ${
            isDragging ? "opacity-100 text-blue-500" : "opacity-0 group-hover:opacity-70"
          }`}
          style={{ cursor: "move", userSelect: "none" }}
          title="Drag to reorder column"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" className="drop-shadow-sm">
            <circle cx="2" cy="3" r="1" />
            <circle cx="7" cy="3" r="1" />
            <circle cx="2" cy="8" r="1" />
            <circle cx="7" cy="8" r="1" />
            <circle cx="2" cy="13" r="1" />
            <circle cx="7" cy="13" r="1" />
          </svg>
        </div>
      )}
      <div className={`group ${canDrag ? "pl-6" : ""}`}>{children}</div>
    </th>
  );
}
