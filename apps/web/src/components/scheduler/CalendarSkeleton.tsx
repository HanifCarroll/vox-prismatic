/**
 * CalendarSkeleton - Clean loading state for the calendar
 * Shows a simple, centered loading indicator with smooth animations
 */
export function CalendarSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50/50">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200"></div>
          <div className="absolute top-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>
        
        {/* Loading text */}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">Loading scheduler</p>
          <p className="text-xs text-gray-500 mt-1">Preparing your calendar...</p>
        </div>
      </div>
    </div>
  );
}