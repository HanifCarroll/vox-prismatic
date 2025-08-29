/**
 * Web App Types
 * Re-exports all types from the shared types package
 */

// Re-export all types from the shared package
export * from '@content-creation/types';

// Re-export scheduler types (web-specific) - only the additional types
export type { 
  CalendarView, 
  DragItem, 
  ApprovedPostDragItem, 
  AnyDragItem,
  CalendarState,
  CalendarFilters,
  CalendarActions,
  PostModalState,
  PostModalData,
  DateRange,
  ApprovedPost,
  CalendarEventsResponse
} from './scheduler';