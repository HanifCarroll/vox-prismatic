'use client';

import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSchedulerState, useSchedulerModal } from '../store/scheduler-store';
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
  const state = useSchedulerState();
  const { modal } = useSchedulerModal();

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
      <div className="flex h-full bg-white">
        {/* Approved Posts Sidebar */}
        <ApprovedPostsSidebar />
        
        {/* Main Calendar Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Calendar Header */}
          <CalendarHeader />
          
          {/* Calendar Content - Scrollable */}
          <div className="flex-1 overflow-auto">
            {state.isLoading ? (
              <div className="flex items-center justify-center h-full bg-white/50">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full border-3 border-gray-200"></div>
                    <div className="absolute top-0 h-10 w-10 animate-spin rounded-full border-3 border-transparent border-t-blue-600"></div>
                  </div>
                  <p className="text-sm text-gray-600">Updating calendar...</p>
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