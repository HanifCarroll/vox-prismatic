'use client';

import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCalendar } from './CalendarContext';
import { CalendarHeader } from './CalendarHeader';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { DayView } from './DayView';
import { PostModal } from './PostModal';
import { ApprovedPostsSidebar } from './ApprovedPostsSidebar';

/**
 * Main Calendar component that renders the appropriate view
 * and provides drag-and-drop functionality
 */
export function Calendar() {
  const { state, modal } = useCalendar();

  // Render the appropriate view based on current state
  const renderCalendarView = () => {
    switch (state.view) {
      case 'day':
        return <DayView />;
      case 'week':
        return <WeekView />;
      case 'month':
        return <MonthView />;
      default:
        return <WeekView />;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full bg-gray-50">
        {/* Approved Posts Sidebar */}
        <ApprovedPostsSidebar />
        
        {/* Main Calendar Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Calendar Header */}
          <CalendarHeader />
          
          {/* Calendar Content */}
          <div className="flex-1 overflow-hidden">
            {state.isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-600">Loading calendar...</p>
                </div>
              </div>
            ) : state.error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-red-600 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    Error Loading Calendar
                  </h3>
                  <p className="text-sm text-gray-600">
                    {state.error}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-auto transition-all duration-300 ease-in-out">
                {renderCalendarView()}
              </div>
            )}
          </div>
        </div>

        {/* Post Scheduling Modal */}
        {modal.isOpen && <PostModal />}
      </div>
    </DndProvider>
  );
}