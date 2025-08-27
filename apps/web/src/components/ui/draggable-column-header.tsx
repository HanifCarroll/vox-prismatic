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
        opacity: isDragging ? 0.5 : 1,
        transition: "all 0.2s ease",
        backgroundColor:
          isOver && canDrop && canDrag ? "rgba(59, 130, 246, 0.05)" : undefined,
      }}
      className="relative"
    >
      {/* Drop indicator line */}
      {isOver && canDrop && canDrag && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
          style={{
            left: isDragOverLeft ? 0 : "auto",
            right: isDragOverLeft ? "auto" : 0,
            animation: "pulse 1s infinite",
          }}
        />
      )}
      {/* Drag handle */}
      {canDrag && (
        <div
          ref={handleRef}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          style={{ cursor: "move", userSelect: "none" }}
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
      <div className={canDrag ? "pl-6" : ""}>{children}</div>
    </th>
  );
}
